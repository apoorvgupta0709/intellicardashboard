import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { listVehicles, postToIntellicar, getDistanceTravelled } from '@/lib/intellicar/client';

// 5-minute budget to loop through the full fleet — requires Vercel Pro plan.
// Increase if vehicle count grows beyond ~30–40.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
    // Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startedAt = Date.now();
    const safe = (val: unknown) => (val === undefined ? null : val);

    const results = {
        vehicles: 0,
        gps_inserted: 0,
        can_inserted: 0,
        trips_inserted: 0,
        errors: [] as string[],
    };

    try {
        const vehicles = await listVehicles();
        results.vehicles = vehicles.length;

        for (const vehicle of vehicles) {
            const vehicleNo = vehicle.vehicleno as string;
            const nowIso = new Date().toISOString();

            // ── 1. Latest GPS ──────────────────────────────────────────────
            try {
                const gpsResponse = await postToIntellicar<any>('getlastgpsstatus', { vehicleno: vehicleNo });
                if (gpsResponse?.data) {
                    const g = gpsResponse.data;
                    const lat = Number(g.latitude || g.lat || 0);
                    const lon = Number(g.longitude || g.lng || 0);

                    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                        const speed = Number(g.speed || 0);
                        await telemetryDb.execute(sql`
                            INSERT INTO telemetry.gps_readings (
                                time, device_id, latitude, longitude, location,
                                altitude, speed, heading,
                                device_battery, vehicle_battery, ignition_on, is_moving
                            ) VALUES (
                                ${nowIso}::timestamptz, ${vehicleNo},
                                ${safe(lat)}, ${safe(lon)},
                                ST_SetSRID(ST_MakePoint(${safe(lon)}, ${safe(lat)}), 4326)::geography,
                                ${safe(Number(g.altitude || 0))}, ${safe(speed)},
                                ${safe(Number(g.heading || 0))},
                                ${safe(Number(g.devbattery || g.device_battery || 0))},
                                ${safe(Number(g.carbattery || g.vehicle_battery || 0))},
                                ${safe(g.ignstatus === 1 || g.ignition === 1 || g.ignition_on === true)},
                                ${safe(speed > 0)}
                            )
                            ON CONFLICT (time, device_id) DO NOTHING
                        `);
                        results.gps_inserted++;
                    }
                }
            } catch (e) {
                results.errors.push(`GPS ${vehicleNo}: ${e instanceof Error ? e.message : String(e)}`);
            }

            // ── 2. Latest CAN (battery metrics) ───────────────────────────
            try {
                const canResponse = await postToIntellicar<any>('getlatestcan', { vehicleno: vehicleNo });
                if (canResponse?.data) {
                    const data = canResponse.data;

                    const extractFloat = (keys: string[]): number | null => {
                        for (const k of keys) {
                            if (data[k] != null) {
                                return typeof data[k] === 'object'
                                    ? Number(data[k].value ?? 0)
                                    : Number(data[k]);
                            }
                        }
                        return null;
                    };

                    const soc = extractFloat(['soc', 'SOC', 'battery_soc']);
                    const soh = extractFloat(['soh', 'SOH', 'battery_soh']);
                    const voltage = extractFloat(['voltage', 'batt_vol', 'battery_voltage']) ?? 0;
                    const current = extractFloat(['current', 'batt_cur', 'battery_current']) ?? 0;
                    const temp = extractFloat(['temperature', 'batt_temp', 'temp']);

                    if (soc !== null || voltage !== 0) {
                        const rated_capacity = data.rated_capacity?.value ?? null;
                        const dod = data.dod?.value ?? null;
                        const no_of_cells = data.no_of_cells?.value ?? null;

                        const cell_voltage: (number | null)[] = [];
                        for (let j = 1; j <= 24; j++) {
                            const key = `cell_voltage_${j.toString().padStart(2, '0')}`;
                            const val = typeof data[key] === 'object'
                                ? Number(data[key]?.value)
                                : Number(data[key]);
                            cell_voltage.push(!isNaN(val) && val > 0 ? val : null);
                        }

                        const cell_temperature: (number | null)[] = [];
                        for (let j = 1; j <= 12; j++) {
                            const key = `cell_temperature_${j.toString().padStart(2, '0')}`;
                            const val = typeof data[key] === 'object'
                                ? Number(data[key]?.value)
                                : Number(data[key]);
                            cell_temperature.push(!isNaN(val) && val !== -273.15 ? val : null);
                        }

                        // Best-effort sample timestamp from embedded CAN timestamps
                        const tsCandidates: number[] = [];
                        for (const v of Object.values(data)) {
                            if (v && typeof v === 'object' && 'timestamp' in v) {
                                const n = Number((v as Record<string, unknown>).timestamp);
                                if (!isNaN(n) && n > 0) tsCandidates.push(n);
                            }
                        }
                        const canSampleIso = tsCandidates.length
                            ? new Date(Math.max(...tsCandidates)).toISOString()
                            : null;

                        await telemetryDb.execute(sql`
                            INSERT INTO telemetry.battery_readings (
                                time, vehiclenos, battery_id,
                                soc, soh, voltage, current, charge_cycle, temperature, power_watts,
                                source, can_payload, can_received_at, can_sample_time,
                                rated_capacity, dod, no_of_cells, cell_voltage, cell_temperature
                            ) VALUES (
                                ${nowIso}::timestamptz, ${vehicleNo}, ${null},
                                ${soc}, ${soh}, ${voltage}, ${current},
                                ${extractFloat(['charge_cycle', 'cycles'])}, ${temp},
                                ${voltage * current},
                                ${'live'}, ${JSON.stringify(data)}::jsonb,
                                ${nowIso}::timestamptz, ${canSampleIso}::timestamptz,
                                ${rated_capacity}, ${dod}, ${no_of_cells},
                                ${cell_voltage}::real[], ${cell_temperature}::real[]
                            )
                            ON CONFLICT (time, vehiclenos) DO NOTHING
                        `);
                        results.can_inserted++;
                    }
                }
            } catch (e) {
                results.errors.push(`CAN ${vehicleNo}: ${e instanceof Error ? e.message : String(e)}`);
            }

            // ── 3. Distance travelled (last 60 min window) ────────────────
            try {
                const now = Date.now();
                const sixtyMinsAgo = now - 60 * 60 * 1000;
                const distData = await getDistanceTravelled(vehicleNo, sixtyMinsAgo, now);
                if (distData) {
                    const records = Array.isArray(distData) ? distData : [distData];
                    for (const d of records) {
                        const distKm = Number(d.distance_km || d.distance || d.totaldistance || 0);
                        if (distKm > 0) {
                            await telemetryDb.execute(sql`
                                INSERT INTO telemetry.trips (
                                    device_id, start_time, end_time,
                                    start_odometer, end_odometer, distance_km
                                ) VALUES (
                                    ${vehicleNo},
                                    ${new Date(sixtyMinsAgo).toISOString()}::timestamptz,
                                    ${new Date(now).toISOString()}::timestamptz,
                                    ${safe(Number(d.start_odometer || d.startodo || 0))},
                                    ${safe(Number(d.end_odometer || d.endodo || 0))},
                                    ${safe(distKm)}
                                )
                            `);
                            results.trips_inserted++;
                        }
                    }
                }
            } catch (e) {
                results.errors.push(`Distance ${vehicleNo}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    } catch (err) {
        return NextResponse.json(
            { error: 'Ingestion cycle failed', detail: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        duration_ms: Date.now() - startedAt,
        ...results,
    });
}
