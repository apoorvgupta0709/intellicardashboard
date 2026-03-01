import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { listVehicles, getBatteryMetricsHistory, getGPSHistory } from '../src/lib/intellicar/client';
import { sql } from 'drizzle-orm';
import { pgSchema, varchar, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function seedHistoricalData() {
    console.log('🚀 Starting Intellicar Historical Data Seeding (From Jan 1, 2026)...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not defined in .env.local');
        process.exit(1);
    }

    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    const telemetryDb = drizzle(client);

    try {
        const vehicles = await listVehicles();
        console.log(`📡 Found ${vehicles.length} vehicles.`);

        // Time range: Jan 1, 2026 to Now
        const startMillis = new Date('2026-01-01T00:00:00Z').getTime();
        const endMillis = Date.now();
        console.log(`📅 Fetching data from ${new Date(startMillis).toISOString()} to ${new Date(endMillis).toISOString()}`);

        const parseIntellicarTime = (ts: any): string => {
            if (!ts) return new Date().toISOString();
            let num = Number(ts);
            if (isNaN(num)) return new Date().toISOString();
            // If in seconds (e.g. 1700000000), convert to ms
            if (num < 10000000000) num *= 1000;
            return new Date(num).toISOString();
        };

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
        }, (table) => ({
            pk: [table.time, table.device_id]
        }));

        // Loop through all vehicles
        for (let i = 0; i < vehicles.length; i++) {
            const vehicleNo = vehicles[i].vehicleno;
            console.log(`\n📦 Processing vehicle ${i + 1}/${vehicles.length}: ${vehicleNo}`);

            // Fetching in 30-day chunks to avoid massive payloads/timeouts from Intellicar API
            const chunkDuration = 30 * 24 * 60 * 60 * 1000;
            let currentStart = startMillis;

            while (currentStart < endMillis) {
                const currentEnd = Math.min(currentStart + chunkDuration, endMillis);
                console.log(`   ⏳ Fetching chunk: ${new Date(currentStart).toISOString().split('T')[0]} to ${new Date(currentEnd).toISOString().split('T')[0]}`);

                // 1. Fetch & Seed Battery Metrics
                try {
                    const metrics = await getBatteryMetricsHistory(vehicleNo, currentStart, currentEnd);
                    if (metrics && metrics.length > 0) {
                        const batteryData = metrics.map(m => {
                            const voltage = Number(m.battery_voltage || m.voltage || 0);
                            const current = Number(m.current || 0);
                            return {
                                time: new Date(parseIntellicarTime(m.time || m.timestamp || m.ts)),
                                device_id: vehicleNo,
                                battery_id: (m.batteryid || m.battery_id || null) as string | null,
                                soc: m.soc !== undefined ? Number(m.soc) : null,
                                soh: m.soh !== undefined ? Number(m.soh) : null,
                                voltage,
                                current,
                                charge_cycle: m.charge_cycle !== undefined ? Number(m.charge_cycle) : null,
                                temperature: m.battery_temp !== undefined ? Number(m.battery_temp) : null,
                                power_watts: voltage * current
                            };
                        });

                        for (let j = 0; j < batteryData.length; j += 500) {
                            const chunk = batteryData.slice(j, j + 500);
                            await (telemetryDb as any).insert(batteryReadings).values(chunk).onConflictDoNothing().execute();
                        }
                        console.log(`      ✅ Inserted ${batteryData.length} battery readings.`);
                    }
                } catch (err) {
                    console.error(`      ❌ Error fetching battery metrics:`, err instanceof Error ? err.message : err);
                }

                // 2. Fetch & Seed GPS Data
                try {
                    const gpsData = await getGPSHistory(vehicleNo, currentStart, currentEnd);
                    if (gpsData && gpsData.length > 0) {
                        const gpsBatch = gpsData
                            .filter(g => {
                                const lat = Number(g.latitude || g.lat || 0);
                                const lon = Number(g.longitude || g.lng || 0);
                                return !(isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0);
                            })
                            .map(g => {
                                const speed = Number(g.speed || 0);
                                return {
                                    time: new Date(parseIntellicarTime(g.time || g.timestamp || g.ts)),
                                    device_id: vehicleNo,
                                    latitude: Number(g.latitude || g.lat || 0),
                                    longitude: Number(g.longitude || g.lng || 0),
                                    altitude: Number(g.altitude || 0),
                                    speed,
                                    heading: Number(g.heading || 0),
                                    device_battery: Number(g.devbattery || g.device_battery || 0),
                                    vehicle_battery: Number(g.carbattery || g.vehicle_battery || 0),
                                    ignition_on: g.ignstatus === 1 || g.ignition === 1 || g.ignition_on === true,
                                    is_moving: speed > 0
                                };
                            });

                        for (let j = 0; j < gpsBatch.length; j += 500) {
                            const chunk = gpsBatch.slice(j, j + 500);
                            const rows = chunk.map(g => sql`(
                                ${safe(g.time.toISOString())},
                                ${safe(g.device_id)},
                                ${safe(g.latitude)},
                                ${safe(g.longitude)},
                                ST_SetSRID(ST_MakePoint(${safe(g.longitude)}, ${safe(g.latitude)}), 4326)::geography,
                                ${safe(g.altitude)},
                                ${safe(g.speed)},
                                ${safe(g.heading)},
                                ${safe(g.device_battery)},
                                ${safe(g.vehicle_battery)},
                                ${safe(g.ignition_on)},
                                ${safe(g.is_moving)}
                            )`);

                            await telemetryDb.execute(sql`
                                INSERT INTO telemetry.gps_readings (
                                    time, device_id, latitude, longitude, location, altitude, speed, heading, device_battery, vehicle_battery, ignition_on, is_moving
                                ) VALUES ${sql.join(rows, sql`, `)}
                                ON CONFLICT (time, device_id) DO NOTHING;
                            `);
                        }
                        console.log(`      ✅ Inserted ${gpsBatch.length} GPS readings.`);
                    }
                } catch (err) {
                    console.error(`      ❌ Error fetching GPS history:`, err instanceof Error ? err.message : err);
                }

                currentStart = currentEnd + 1; // Move to next chunk
            }
        }

        console.log('\n✨ Historical Seeding completed successfully!');
    } catch (error) {
        console.error('💥 Seeding failed:', error instanceof Error ? error.message : error);
    } finally {
        process.exit(0);
    }
}

seedHistoricalData();
