import { sql } from 'drizzle-orm';
import { telemetryDb } from './db';
import { BatteryHourlyAggregate, BatteryDailyAggregate, CANReading, GPSReading, TripSummary, EnergyConsumption } from './types';

// ============================================
// Raw SQL Queries for Telemetry Tables
// ============================================

export async function insertCANReadings(readings: CANReading[]) {
  if (readings.length === 0) return;

  // Explicit column-mapped insert so REAL[] and JSONB cast correctly.
  // Uses json_array_elements to handle batch.
  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.battery_readings (
      time, vehiclenos, battery_id, soc, soh, voltage, current, charge_cycle, temperature, power_watts
    )
    SELECT
      (r->>'time')::timestamptz,
      r->>'vehiclenos',
      r->>'battery_id',
      (r->>'soc')::real,
      (r->>'soh')::real,
      (r->>'voltage')::real,
      (r->>'current')::real,
      (r->>'charge_cycle')::integer,
      (r->>'temperature')::real,
      (r->>'power_watts')::real
    FROM json_array_elements(${JSON.stringify(readings)}::json) AS r
    ON CONFLICT (time, vehiclenos) DO NOTHING
  `);
}

/**
 * Insert a single live CAN reading (from getlatestcan) with all live-specific columns.
 */
export async function insertLiveCAN(r: CANReading) {
  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.battery_readings (
      time, vehiclenos, battery_id,
      soc, soh, voltage, current, charge_cycle, temperature, power_watts,
      source, can_payload, can_received_at, can_sample_time,
      rated_capacity, dod, no_of_cells, no_of_temperature_sensors,
      cell_voltage, cell_temperature,
      alarm, allow_charging, allow_discharging, balancing_status, protection,
      maximum_cell_voltage, minimum_cell_voltage,
      maximum_cell_temperature, minimum_cell_temperature,
      iot_no, protocol_version, bms_firmware_version,
      battery_serial_number_1, battery_serial_number_2,
      bms_serial_no_1, bms_serial_no_2
    ) VALUES (
      ${r.time.toISOString()}::timestamptz,
      ${r.vehiclenos},
      ${r.battery_id ?? null},
      ${r.soc}, ${r.soh}, ${r.voltage}, ${r.current}, ${r.charge_cycle}, ${r.temperature}, ${r.power_watts},
      ${'live'},
      ${r.can_payload ? JSON.stringify(r.can_payload) : null}::jsonb,
      ${r.can_received_at?.toISOString() ?? null}::timestamptz,
      ${r.can_sample_time?.toISOString() ?? null}::timestamptz,
      ${r.rated_capacity ?? null}, ${r.dod ?? null},
      ${r.no_of_cells ?? null}, ${r.no_of_temperature_sensors ?? null},
      ${r.cell_voltage ?? null}::real[], ${r.cell_temperature ?? null}::real[],
      ${r.alarm ?? null}, ${r.allow_charging ?? null}, ${r.allow_discharging ?? null},
      ${r.balancing_status ?? null}, ${r.protection ?? null},
      ${r.maximum_cell_voltage ?? null}, ${r.minimum_cell_voltage ?? null},
      ${r.maximum_cell_temperature ?? null}, ${r.minimum_cell_temperature ?? null},
      ${r.iot_no ?? null}, ${r.protocol_version ?? null}, ${r.bms_firmware_version ?? null},
      ${r.battery_serial_number_1 ?? null}, ${r.battery_serial_number_2 ?? null},
      ${r.bms_serial_no_1 ?? null}, ${r.bms_serial_no_2 ?? null}
    )
    ON CONFLICT (time, vehiclenos) DO NOTHING
  `);
}

export async function fetchHourlyBatterySummary(vehiclenos: string, hoursBack = 24): Promise<BatteryHourlyAggregate[]> {
  const result = await telemetryDb.execute(sql`
    SELECT * FROM telemetry.battery_hourly
    WHERE vehiclenos = ${vehiclenos}
    AND bucket >= NOW() - INTERVAL '${sql.raw(hoursBack.toString())} hours'
    ORDER BY bucket DESC
  `);

  return result as unknown as BatteryHourlyAggregate[];
}

export async function fetchDailyBatterySummary(vehiclenos: string, daysBack = 30): Promise<BatteryDailyAggregate[]> {
  const result = await telemetryDb.execute(sql`
    SELECT * FROM telemetry.battery_daily
    WHERE vehiclenos = ${vehiclenos}
    AND bucket >= NOW() - INTERVAL '${sql.raw(daysBack.toString())} days'
    ORDER BY bucket DESC
  `);

  return result as unknown as BatteryDailyAggregate[];
}

export async function fetchLatestFleetSOC() {
  const result = await telemetryDb.execute(sql`
    SELECT DISTINCT ON (vehiclenos)
      vehiclenos, time, soc, soh, voltage, current, temperature, charge_cycle
    FROM telemetry.battery_readings
    ORDER BY vehiclenos, time DESC
  `);

  return result;
}

export async function insertGPSReadings(readings: GPSReading[]) {
  if (readings.length === 0) return;

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
    ON CONFLICT (time, device_id) DO NOTHING
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

export async function insertEnergy(records: EnergyConsumption[]) {
  if (records.length === 0) return;

  return await telemetryDb.execute(sql`
    INSERT INTO telemetry.energy_consumption (
      vehicleno, starttime_ms, endtime_ms,
      start_time, end_time, is_ev,
      energy_consumption, start_fl, end_fl, start_fl_litres, end_fl_litres,
      last_ign_on, last_ign_off, refueling_events,
      api_status, api_msg, api_err
    )
    SELECT
      r->>'vehicleno',
      (r->>'starttime_ms')::bigint,
      (r->>'endtime_ms')::bigint,
      (r->>'start_time')::timestamptz,
      (r->>'end_time')::timestamptz,
      COALESCE((r->>'is_ev')::boolean, false),
      (r->>'energy_consumption')::numeric,
      (r->>'start_fl')::numeric,
      (r->>'end_fl')::numeric,
      (r->>'start_fl_litres')::numeric,
      (r->>'end_fl_litres')::numeric,
      (r->>'last_ign_on')::numeric,
      (r->>'last_ign_off')::numeric,
      COALESCE((r->>'refueling_events')::jsonb, '[]'::jsonb),
      r->>'api_status',
      r->>'api_msg',
      (r->>'api_err')::jsonb
    FROM json_array_elements(${JSON.stringify(records)}::json) AS r
    ON CONFLICT (vehicleno, starttime_ms, endtime_ms) DO NOTHING
  `);
}
