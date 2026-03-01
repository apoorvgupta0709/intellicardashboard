import { sql } from 'drizzle-orm';
import { telemetryDb } from './db';
import { BatteryHourlyAggregate, BatteryDailyAggregate, CANReading, GPSReading, TripSummary, EnergyConsumption } from './types';

// ============================================
// Raw SQL Queries for TimescaleDB Hypertables
// ============================================

export async function insertCANReadings(readings: CANReading[]) {
  if (readings.length === 0) return;

  // Using raw postgres.js tagging inside Drizzle
  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.battery_readings (
      time, device_id, battery_id, soc, soh, voltage, current, charge_cycle, temperature, power_watts
    )
    SELECT * FROM json_populate_recordset(null::telemetry.battery_readings, ${JSON.stringify(readings)}::json)
  `);
}

export async function fetchHourlyBatterySummary(deviceId: string, hoursBack = 24): Promise<BatteryHourlyAggregate[]> {
  // Clamp to a valid positive integer before using sql.raw() — an unbounded value here
  // would allow arbitrarily large scans or, if the caller passes a non-integer, broken SQL.
  const safeHours = Math.max(1, Math.min(Math.floor(Number(hoursBack)), 720)); // 1h – 30d
  const result = await telemetryDb.execute(sql`
    SELECT * FROM telemetry.battery_hourly
    WHERE device_id = ${deviceId}
    AND bucket >= NOW() - INTERVAL '${sql.raw(safeHours.toString())} hours'
    ORDER BY bucket DESC
  `);

  return result as unknown as BatteryHourlyAggregate[];
}

export async function fetchDailyBatterySummary(deviceId: string, daysBack = 30): Promise<BatteryDailyAggregate[]> {
  // Clamp to a valid positive integer before using sql.raw().
  const safeDays = Math.max(1, Math.min(Math.floor(Number(daysBack)), 365)); // 1d – 1y
  const result = await telemetryDb.execute(sql`
    SELECT * FROM telemetry.battery_daily
    WHERE device_id = ${deviceId}
    AND bucket >= NOW() - INTERVAL '${sql.raw(safeDays.toString())} days'
    ORDER BY bucket DESC
  `);

  return result as unknown as BatteryDailyAggregate[];
}

export async function fetchLatestFleetSOC() {
  // DISTINCT ON trick to get the most recent reading per device
  const result = await telemetryDb.execute(sql`
    SELECT DISTINCT ON (device_id) 
      device_id, time, soc, soh, voltage, current, temperature, charge_cycle
    FROM telemetry.battery_readings
    ORDER BY device_id, time DESC
  `);

  return result;
}

export async function insertGPSReadings(readings: GPSReading[]) {
  if (readings.length === 0) return;

  // For PostGIS location, we populate raw coordinates into lat/lon, 
  // and rely on a trigger or raw SQL inline for ST_SetSRID,
  // but json_populate_recordset can't directly parse into PostGIS Points without extra handling.
  // So we populate lat/lon, and then UPDATE the location column, OR do a mapped insert:
  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.gps_readings (
      time, device_id, latitude, longitude, altitude, speed, heading, 
      device_battery, vehicle_battery, ignition_on, is_moving, location
    )
    SELECT 
      (r->>'time')::timestamptz,
      r->>'device_id',
      (r->>'latitude')::real,
      (r->>'longitude')::real,
      (r->>'altitude')::real,
      (r->>'speed')::real,
      (r->>'heading')::real,
      (r->>'device_battery')::real,
      (r->>'vehicle_battery')::real,
      (r->>'ignition_on')::boolean,
      (r->>'is_moving')::boolean,
      ST_SetSRID(ST_MakePoint((r->>'longitude')::float, (r->>'latitude')::float), 4326)
    FROM json_array_elements(${JSON.stringify(readings)}::json) as r
  `);
}

export async function insertTrips(trips: TripSummary[]) {
  if (trips.length === 0) return;

  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.trips (
      device_id, start_time, end_time, start_odometer, end_odometer, distance_km, last_ign_on, last_ign_off
    )
    SELECT * FROM json_populate_recordset(null::telemetry.trips, ${JSON.stringify(trips)}::json)
  `);
}

export async function insertEnergy(energy: EnergyConsumption[]) {
  if (energy.length === 0) return;

  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.energy_consumption (
      device_id, start_time, end_time, energy_used_kwh, start_soc, end_soc, last_ign_on, last_ign_off, charging_events
    )
    SELECT * FROM json_populate_recordset(null::telemetry.energy_consumption, ${JSON.stringify(energy)}::json)
  `);
}

export interface RejectedReading {
  time: string;
  device_id: string;
  reading_type: string;
  payload: Record<string, unknown>;
  error_reason: string;
}

/**
 * Persist rejected/invalid ingest readings to telemetry.rejected_readings for later diagnosis.
 * The table is created by scripts/apply-telemetry-schema.ts (step 7).
 */
export async function insertRejectedReadings(records: RejectedReading[]) {
  if (records.length === 0) return;

  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.rejected_readings (time, device_id, reading_type, payload, error_reason)
    SELECT
      (r->>'time')::timestamptz,
      (r->>'device_id'),
      (r->>'reading_type'),
      (r->>'payload')::jsonb,
      (r->>'error_reason')
    FROM json_array_elements(${JSON.stringify(records)}::json) AS r
  `);
}
