import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { parse } from 'csv-parse';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config({ path: '.env.local' }); // Load env explicitly

import { telemetryDb } from '../src/lib/telemetry/db';
import { CANReading, GPSReading } from '../src/lib/telemetry/types';

// Constants
const DESKTOP_DIR = path.join(process.env.HOME || '', 'Desktop', 'intellicar');
const BATT_FILE = path.join(DESKTOP_DIR, 'historical_getbatterymetricshistory.csv');
const GPS_FILE = path.join(DESKTOP_DIR, 'historical_getgpshistory.csv');
const BATCH_SIZE = 500;

async function ingestBatteryMetrics() {
    console.log(`Starting to ingest battery metrics from ${BATT_FILE}`);

    if (!fs.existsSync(BATT_FILE)) {
        console.error(`File not found: ${BATT_FILE}`);
        return;
    }

    const parser = fs.createReadStream(BATT_FILE).pipe(parse({
        columns: true,
        skip_empty_lines: true
    }));

    let batch: CANReading[] = [];
    let totalInserted = 0;

    for await (const record of parser) {
        try {
            const reading: CANReading = {
                time: new Date(record.time),
                device_id: record.vehicleno,
                soc: record.bms1soc ? Number(record.bms1soc) : null,
                voltage: record.bms1v ? Number(record.bms1v) : null,
                current: record.bms1c ? Number(record.bms1c) : null,
                soh: record.bms1soh ? Number(record.bms1soh) : null,
                temperature: record.bms1temp ? Number(record.bms1temp) : null,
                charge_cycle: record.charge_cycle ? Number(record.charge_cycle) : null,
                power_watts: null, // Not in this CSV
            };

            batch.push(reading);

            if (batch.length >= BATCH_SIZE) {
                await insertBatteryBatch(batch);
                totalInserted += batch.length;
                console.log(`Inserted ${totalInserted} battery metrics...`);
                batch = [];
            }
        } catch (err) {
            console.error('Error parsing row:', record, err);
        }
    }

    if (batch.length > 0) {
        await insertBatteryBatch(batch);
        totalInserted += batch.length;
    }

    console.log(`Finished ingesting ${totalInserted} battery metrics.\n`);
}

async function insertBatteryBatch(readings: CANReading[]) {
    await telemetryDb.execute(sql`
        INSERT INTO telemetry.battery_readings (
            time, device_id, soc, soh, voltage, current, charge_cycle, temperature, power_watts
        )
        SELECT * FROM json_populate_recordset(null::telemetry.battery_readings, ${JSON.stringify(readings)}::json)
        ON CONFLICT DO NOTHING
    `);
}

async function ingestGPSMetrics() {
    console.log(`Starting to ingest GPS metrics from ${GPS_FILE}`);

    if (!fs.existsSync(GPS_FILE)) {
        console.error(`File not found: ${GPS_FILE}`);
        return;
    }

    const parser = fs.createReadStream(GPS_FILE).pipe(parse({
        columns: true,
        skip_empty_lines: true
    }));

    let batch: GPSReading[] = [];
    let totalInserted = 0;

    for await (const record of parser) {
        try {
            const reading: GPSReading = {
                time: new Date(record.time),
                device_id: record.vehicleno,
                latitude: Number(record.latitude),
                longitude: Number(record.longitude),
                heading: record.heading ? Number(record.heading) : null,
                speed: record.speed ? Number(record.speed) : null,
                altitude: record.altitude ? Number(record.altitude) : null,
            };

            // Only insert if lat/lng are valid numbers
            if (!isNaN(reading.latitude) && !isNaN(reading.longitude)) {
                batch.push(reading);
            }

            if (batch.length >= BATCH_SIZE) {
                await insertGPSBatch(batch);
                totalInserted += batch.length;
                console.log(`Inserted ${totalInserted} GPS metrics...`);
                batch = [];
            }
        } catch (err) {
            console.error('Error parsing row:', record, err);
        }
    }

    if (batch.length > 0) {
        await insertGPSBatch(batch);
        totalInserted += batch.length;
    }

    console.log(`Finished ingesting ${totalInserted} GPS metrics.\n`);
}

async function insertGPSBatch(readings: GPSReading[]) {
    await telemetryDb.execute(sql`
        INSERT INTO telemetry.gps_readings (
            time, device_id, latitude, longitude, altitude, speed, heading, location
        )
        SELECT 
            (r->>'time')::timestamptz,
            r->>'device_id',
            (r->>'latitude')::real,
            (r->>'longitude')::real,
            (r->>'altitude')::real,
            (r->>'speed')::real,
            (r->>'heading')::real,
            ST_SetSRID(ST_MakePoint((r->>'longitude')::float, (r->>'latitude')::float), 4326)
        FROM json_array_elements(${JSON.stringify(readings)}::json) as r
        ON CONFLICT DO NOTHING
    `);
}

async function main() {
    console.log("=== Historical Data Ingestion Started ===\n");
    await ingestBatteryMetrics();
    await ingestGPSMetrics();
    console.log("=== Historical Data Ingestion Completed ===");
    process.exit(0);
}

main().catch(console.error);
