import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { listVehicles, getIntellicarToken, postToIntellicar, getDistanceTravelled } from '../src/lib/intellicar/client';
import { sql } from 'drizzle-orm';
import { pgSchema, varchar, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function ingestLiveDataDaemon() {
    console.log('🚀 Starting Intellicar Live Data Daemon (Running every 30 mins)...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not defined in .env.local');
        process.exit(1);
    }

    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    const telemetryDb = drizzle(client);

    const safe = (val: any) => val === undefined ? null : val;
    const telSchema = pgSchema('telemetry');
    const batteryReadings = telSchema.table('battery_readings', {
        time: timestamp('time', { withTimezone: true }).notNull(),
        device_id: varchar('device_id', { length: 50 }).notNull(),
        battery_id: varchar('battery_id', { length: 100 }),
        soc: real('soc'),
        soh: real('soh'),
        voltage: real('voltage'),
        current: real('current'),
        charge_cycle: real('charge_cycle'),
        temperature: real('temperature'),
        power_watts: real('power_watts'),
    }, (table) => ({ pk: [table.time, table.device_id] }));

    async function fetchAndSaveLiveCycle() {
        console.log(`\n--- [${new Date().toISOString()}] Fetching live data ---`);
        try {
            const vehicles = await listVehicles();
            console.log(`📡 Discovered ${vehicles.length} vehicles.`);

            for (let i = 0; i < vehicles.length; i++) {
                const vehicleNo = vehicles[i].vehicleno;
                const nowIso = new Date().toISOString();

                // 1. Fetch Latest GPS
                try {
                    const gpsResponse = await postToIntellicar<any>('getlastgpsstatus', { vehicleno: vehicleNo });
                    if (gpsResponse && gpsResponse.data) {
                        const g = gpsResponse.data;
                        const lat = Number(g.latitude || g.lat || 0);
                        const lon = Number(g.longitude || g.lng || 0);

                        if (!(isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0)) {
                            const speed = Number(g.speed || 0);
                            const row = sql`(
                                ${safe(nowIso)},
                                ${safe(vehicleNo)},
                                ${safe(lat)},
                                ${safe(lon)},
                                ST_SetSRID(ST_MakePoint(${safe(lon)}, ${safe(lat)}), 4326)::geography,
                                ${safe(Number(g.altitude || 0))},
                                ${safe(speed)},
                                ${safe(Number(g.heading || 0))},
                                ${safe(Number(g.devbattery || g.device_battery || 0))},
                                ${safe(Number(g.carbattery || g.vehicle_battery || 0))},
                                ${safe(g.ignstatus === 1 || g.ignition === 1 || g.ignition_on === true)},
                                ${safe(speed > 0)}
                            )`;

                            await telemetryDb.execute(sql`
                                INSERT INTO telemetry.gps_readings (
                                    time, device_id, latitude, longitude, location, altitude, speed, heading, device_battery, vehicle_battery, ignition_on, is_moving
                                ) VALUES ${row}
                                ON CONFLICT (time, device_id) DO NOTHING;
                            `);
                        }
                    }
                } catch (e) {
                    console.error(`❌ Error GPS live for ${vehicleNo}:`, e instanceof Error ? e.message : e);
                }

                // 2. Fetch Latest CAN (Battery metrics)
                try {
                    const canResponse = await postToIntellicar<any>('getlatestcan', { vehicleno: vehicleNo });
                    if (canResponse && canResponse.data) {
                        const data = canResponse.data;
                        // Extract standard metrics from arbitrary CAN payload
                        // Intellicar's CAN arbitrary dictionary varies. Assuming keys like soc, soh, voltage
                        const extractFloat = (keyNames: string[]) => {
                            for (const k of keyNames) {
                                if (data[k]) {
                                    return typeof data[k] === 'object' ? Number(data[k].value || 0) : Number(data[k]);
                                }
                            }
                            return null;
                        };

                        const soc = extractFloat(['soc', 'SOC', 'battery_soc']);
                        const soh = extractFloat(['soh', 'SOH', 'battery_soh']);
                        const voltage = extractFloat(['voltage', 'batt_vol', 'battery_voltage']) || 0;
                        const current = extractFloat(['current', 'batt_cur', 'battery_current']) || 0;
                        const temp = extractFloat(['temperature', 'batt_temp', 'temp']);

                        if (soc !== null || voltage !== 0) {
                            await (telemetryDb as any).insert(batteryReadings).values({
                                time: new Date(),
                                device_id: vehicleNo,
                                battery_id: null,
                                soc,
                                soh,
                                voltage,
                                current,
                                charge_cycle: extractFloat(['charge_cycle', 'cycles']),
                                temperature: temp,
                                power_watts: voltage * current
                            }).onConflictDoNothing().execute();
                        }
                    }
                } catch (e) {
                    console.error(`❌ Error CAN live for ${vehicleNo}:`, e instanceof Error ? e.message : e);
                }

                // 3. Fetch Distance Travelled (last 30 min window)
                try {
                    const now = Date.now();
                    const thirtyMinsAgo = now - 30 * 60 * 1000;
                    const distData = await getDistanceTravelled(vehicleNo, thirtyMinsAgo, now);
                    if (distData) {
                        const records = Array.isArray(distData) ? distData : [distData];
                        for (const d of records) {
                            const distKm = Number(d.distance_km || d.distance || d.totaldistance || 0);
                            if (distKm > 0) {
                                await telemetryDb.execute(sql`
                                    INSERT INTO telemetry.trips (
                                        device_id, start_time, end_time, start_odometer, end_odometer, distance_km
                                    ) VALUES (
                                        ${vehicleNo},
                                        ${new Date(thirtyMinsAgo).toISOString()},
                                        ${new Date(now).toISOString()},
                                        ${safe(Number(d.start_odometer || d.startodo || 0))},
                                        ${safe(Number(d.end_odometer || d.endodo || 0))},
                                        ${safe(distKm)}
                                    )
                                `);
                            }
                        }
                    }
                } catch (e) {
                    console.error(`❌ Error distance live for ${vehicleNo}:`, e instanceof Error ? e.message : e);
                }
            }
            console.log(`✅ Completed live data cycle.`);
        } catch (error) {
            console.error('💥 Live polling cycle failed:', error instanceof Error ? error.message : error);
        }
    }

    // Run once immediately, then every 30 mins
    fetchAndSaveLiveCycle();
    setInterval(fetchAndSaveLiveCycle, 30 * 60 * 1000);
}

ingestLiveDataDaemon();
