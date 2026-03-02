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
    // await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);

    console.log('2. Creating telemetry schema...');
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS telemetry;`);

    console.log('3. Creating battery_readings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.battery_readings (
          time            TIMESTAMPTZ    NOT NULL,
          device_id       VARCHAR(50)    NOT NULL,
          battery_id      VARCHAR(100),
          soc             REAL,
          soh             REAL,
          voltage         REAL,
          current         REAL,
          charge_cycle    INTEGER,
          temperature     REAL,
          power_watts     REAL,

          -- NEW: store full CAN for live reads
          source          TEXT           NOT NULL DEFAULT 'history',
          can_payload     JSONB          NULL,
          can_received_at TIMESTAMPTZ    NULL,
          can_sample_time TIMESTAMPTZ    NULL,

          PRIMARY KEY (time, device_id)
      );
    `);

    await db.execute(sql`ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'history';`);
    await db.execute(sql`ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS can_payload JSONB NULL;`);
    await db.execute(sql`ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS can_received_at TIMESTAMPTZ NULL;`);
    await db.execute(sql`ALTER TABLE telemetry.battery_readings ADD COLUMN IF NOT EXISTS can_sample_time TIMESTAMPTZ NULL;`);
    // Note: Skipping create_hypertable as timescaledb is not available
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_battery_readings_device ON telemetry.battery_readings (device_id, time DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_battery_readings_soc ON telemetry.battery_readings (device_id, soc, time DESC);`);

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
    // Note: Skipping create_hypertable as timescaledb is not available
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
          id              SERIAL PRIMARY KEY,
          device_id       VARCHAR(50)   NOT NULL,
          start_time      TIMESTAMPTZ   NOT NULL,
          end_time        TIMESTAMPTZ   NOT NULL,
          energy_used_kwh REAL,
          start_soc       REAL,
          end_soc         REAL,
          last_ign_on     TIMESTAMPTZ,
          last_ign_off    TIMESTAMPTZ,
          charging_events JSONB DEFAULT '[]',
          created_at      TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

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
