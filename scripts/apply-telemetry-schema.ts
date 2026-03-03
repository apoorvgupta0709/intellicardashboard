import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.local');
}

// Disable prefetch for schema migrations
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function applyMigrations() {
  console.log('Applying telemetry migrations...');

  try {
    console.log('1. Enabling extensions...');
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);

    console.log('2. Creating telemetry schema...');
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS telemetry;`);

    console.log('3. Creating battery_readings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.battery_readings (
          time                        TIMESTAMPTZ    NOT NULL,
          vehiclenos                  VARCHAR(50)    NOT NULL,
          battery_id                  VARCHAR(100),
          soc                         REAL,
          soh                         REAL,
          voltage                     REAL,
          current                     REAL,
          charge_cycle                REAL,
          temperature                 REAL,
          power_watts                 REAL,

          -- CAN ingestion metadata
          source                      TEXT           NOT NULL DEFAULT 'history',
          can_payload                 JSONB          NULL,
          can_received_at             TIMESTAMPTZ    NULL,
          can_sample_time             TIMESTAMPTZ    NULL,

          -- BMS configuration
          rated_capacity              REAL           NULL,
          dod                         REAL           NULL,
          no_of_cells                 INTEGER        NULL,
          no_of_temperature_sensors   INTEGER        NULL,
          cell_voltage                REAL[]         NULL,
          cell_temperature            REAL[]         NULL,

          -- BMS alarm / protection flags (raw integer bitmask from CAN)
          alarm                       INTEGER        NULL,
          allow_charging              INTEGER        NULL,
          allow_discharging           INTEGER        NULL,
          balancing_status            INTEGER        NULL,
          protection                  INTEGER        NULL,

          -- Cell extremes
          maximum_cell_voltage        REAL           NULL,
          minimum_cell_voltage        REAL           NULL,
          maximum_cell_temperature    REAL           NULL,
          minimum_cell_temperature    REAL           NULL,

          -- Identifiers from BMS
          iot_no                      INTEGER        NULL,
          protocol_version            INTEGER        NULL,
          bms_firmware_version        INTEGER        NULL,
          battery_serial_number_1     BIGINT         NULL,
          battery_serial_number_2     BIGINT         NULL,
          bms_serial_no_1             BIGINT         NULL,
          bms_serial_no_2             BIGINT         NULL,

          PRIMARY KEY (time, vehiclenos)
      );
    `);

    // Idempotent column additions for existing deployments
    const batteryAlters = [
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'history'`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS can_payload JSONB NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS can_received_at TIMESTAMPTZ NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS can_sample_time TIMESTAMPTZ NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS rated_capacity REAL NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS dod REAL NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS no_of_cells INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS no_of_temperature_sensors INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS cell_voltage REAL[] NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS cell_temperature REAL[] NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS alarm INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS allow_charging INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS allow_discharging INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS balancing_status INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS protection INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS maximum_cell_voltage REAL NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS minimum_cell_voltage REAL NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS maximum_cell_temperature REAL NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS minimum_cell_temperature REAL NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS iot_no INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS protocol_version INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS bms_firmware_version INTEGER NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS battery_serial_number_1 BIGINT NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS battery_serial_number_2 BIGINT NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS bms_serial_no_1 BIGINT NULL`,
      `ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS bms_serial_no_2 BIGINT NULL`,
    ];
    for (const stmt of batteryAlters) {
      await db.execute(sql.raw(stmt));
    }

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_battery_readings_vehicle ON telemetry.battery_readings (vehiclenos, time DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_battery_readings_soc ON telemetry.battery_readings (vehiclenos, soc, time DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_battery_readings_source_time ON telemetry.battery_readings (vehiclenos, source, time DESC);`);

    console.log('4. Creating gps_readings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.gps_readings (
          time            TIMESTAMPTZ   NOT NULL,
          device_id       VARCHAR(50)   NOT NULL,
          location        GEOGRAPHY(POINT, 4326),
          latitude        REAL          NOT NULL,
          longitude       REAL          NOT NULL,
          altitude        REAL,
          speed           REAL,
          heading         REAL,
          device_battery  REAL,
          vehicle_battery REAL,
          ignition_on     BOOLEAN,
          is_moving       BOOLEAN,
          PRIMARY KEY (time, device_id)
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gps_device_time ON telemetry.gps_readings (device_id, time DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gps_location ON telemetry.gps_readings USING GIST (location);`);

    console.log('5. Creating trips table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.trips (
          id              SERIAL PRIMARY KEY,
          device_id       VARCHAR(50)   NOT NULL,
          start_time      TIMESTAMPTZ   NOT NULL,
          end_time        TIMESTAMPTZ   NOT NULL,
          start_odometer  REAL,
          end_odometer    REAL,
          distance_km     REAL,
          start_location  GEOGRAPHY(POINT, 4326),
          end_location    GEOGRAPHY(POINT, 4326),
          last_ign_on     TIMESTAMPTZ,
          last_ign_off    TIMESTAMPTZ,
          created_at      TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    console.log('6. Creating energy_consumption table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.energy_consumption (
          vehicleno           VARCHAR(50)    NOT NULL,
          starttime_ms        BIGINT         NOT NULL,
          endtime_ms          BIGINT         NOT NULL,
          start_time          TIMESTAMPTZ    NULL,
          end_time            TIMESTAMPTZ    NULL,
          is_ev               BOOLEAN,
          energy_consumption  REAL,
          start_fl            REAL,
          end_fl              REAL,
          start_fl_litres     REAL,
          end_fl_litres       REAL,
          last_ign_on         NUMERIC,
          last_ign_off        NUMERIC,
          refueling_events    JSONB          DEFAULT '[]',
          api_status          TEXT,
          api_msg             TEXT,
          api_err             JSONB,
          pulled_at           TIMESTAMPTZ    DEFAULT NOW(),
          PRIMARY KEY (vehicleno, starttime_ms, endtime_ms)
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_energy_vehicleno_time ON telemetry.energy_consumption (vehicleno, starttime_ms DESC);`);

    console.log('7. Creating rejected_readings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.rejected_readings (
          id              SERIAL PRIMARY KEY,
          time            TIMESTAMPTZ   NOT NULL,
          device_id       VARCHAR(50)   NOT NULL,
          reading_type    VARCHAR(50)   NOT NULL,
          payload         JSONB         NOT NULL,
          error_reason    TEXT          NOT NULL,
          created_at      TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    console.log('8. Creating alert_config table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.alert_config (
          id              INTEGER PRIMARY KEY DEFAULT 1,
          config          JSONB NOT NULL DEFAULT '{}',
          updated_at      TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT single_row CHECK (id = 1)
      );
    `);

    // Seed default thresholds if empty
    await db.execute(sql`
      INSERT INTO telemetry.alert_config (id, config) VALUES (1, ${JSON.stringify({
      low_soc: { value: 10, severity: 'critical', label: 'Low SOC (%)' },
      deep_discharge: { value: 0, severity: 'critical', label: 'Deep Discharge SOC (%)' },
      high_temp: { value: 55, severity: 'critical', label: 'High Temperature (°C)' },
      soh_degradation: { value: 80, severity: 'warning', label: 'SOH Degradation (%)' },
      overcurrent: { value: 100, severity: 'warning', label: 'Overcurrent (A)' },
      overvoltage: { value: 58.4, severity: 'warning', label: 'Overvoltage (V)' },
      undervoltage: { value: 42, severity: 'critical', label: 'Undervoltage (V)' },
      no_communication_hours: { value: 6, severity: 'warning', label: 'No Communication (hours)' },
      rapid_soh_drop: { value: 5, severity: 'critical', label: 'Rapid SOH Drop (% in 30 days)' },
      excessive_cycles: { value: 1500, severity: 'info', label: 'Excessive Charge Cycles' }
    })}::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ Migrations applied successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

applyMigrations();
