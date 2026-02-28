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
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);

    console.log('2. Creating telemetry schema...');
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS telemetry;`);

    console.log('3. Creating battery_readings hypertable...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telemetry.battery_readings (
          time         TIMESTAMPTZ    NOT NULL,
          device_id    VARCHAR(50)    NOT NULL,
          battery_id   VARCHAR(100),
          soc          REAL,
          soh          REAL,
          voltage      REAL,
          current      REAL,
          charge_cycle INTEGER,
          temperature  REAL,
          power_watts  REAL
      );
    `);
    await db.execute(sql`
      SELECT create_hypertable('telemetry.battery_readings', 'time',
          chunk_time_interval => INTERVAL '1 day',
          if_not_exists => TRUE
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_battery_readings_device ON telemetry.battery_readings (device_id, time DESC);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_battery_readings_soc ON telemetry.battery_readings (device_id, soc, time DESC);`);

    console.log('4. Creating gps_readings hypertable...');
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
          is_moving       BOOLEAN
      );
    `);
    await db.execute(sql`
      SELECT create_hypertable('telemetry.gps_readings', 'time',
          chunk_time_interval => INTERVAL '1 day',
          if_not_exists => TRUE
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

    console.log('8. Creating continuous aggregates...');
    // Drop existing views if this runs multiple times
    try { await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS telemetry.battery_hourly CASCADE;`); } catch(e) {}
    try { await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS telemetry.battery_daily CASCADE;`); } catch(e) {}
    
    await db.execute(sql`
      CREATE MATERIALIZED VIEW telemetry.battery_hourly WITH (timescaledb.continuous) AS
      SELECT
          time_bucket('1 hour', time)    AS bucket,
          device_id,
          AVG(soc)                       AS avg_soc,
          MIN(soc)                       AS min_soc,
          MAX(soc)                       AS max_soc,
          AVG(voltage)                   AS avg_voltage,
          MIN(voltage)                   AS min_voltage,
          MAX(voltage)                   AS max_voltage,
          AVG(current)                   AS avg_current,
          AVG(temperature)               AS avg_temp,
          MAX(temperature)               AS max_temp,
          MAX(charge_cycle)              AS charge_cycle,
          AVG(soh)                       AS avg_soh,
          COUNT(*)                       AS reading_count
      FROM telemetry.battery_readings
      GROUP BY bucket, device_id
      WITH NO DATA;
    `);
    
    // We add policies if they don't already exist, handle errors simply:
    try {
      await db.execute(sql`
        SELECT add_continuous_aggregate_policy('telemetry.battery_hourly',
            start_offset    => INTERVAL '3 hours',
            end_offset      => INTERVAL '30 minutes',
            schedule_interval => INTERVAL '30 minutes'
        );
      `);
    } catch (e) { console.log('Continuous aggregate policy (hourly) may already exist.'); }

    await db.execute(sql`
      CREATE MATERIALIZED VIEW telemetry.battery_daily WITH (timescaledb.continuous) AS
      SELECT
          time_bucket('1 day', time)     AS bucket,
          device_id,
          AVG(soc)                       AS avg_soc,
          MIN(soc)                       AS min_soc,
          MAX(soc)                       AS max_soc,
          AVG(voltage)                   AS avg_voltage,
          AVG(current)                   AS avg_current,
          AVG(temperature)               AS avg_temp,
          MAX(temperature)               AS max_temp,
          MAX(charge_cycle)              AS charge_cycle,
          MIN(soh)                       AS min_soh,
          COUNT(*)                       AS reading_count
      FROM telemetry.battery_readings
      GROUP BY bucket, device_id
      WITH NO DATA;
    `);

    try {
      await db.execute(sql`
        SELECT add_continuous_aggregate_policy('telemetry.battery_daily',
            start_offset    => INTERVAL '3 days',
            end_offset      => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour'
        );
      `);
    } catch (e) { console.log('Continuous aggregate policy (daily) may already exist.'); }


    console.log('9. Creating compression policies...');
    try {
      await db.execute(sql`
        ALTER TABLE telemetry.battery_readings SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'device_id',
            timescaledb.compress_orderby = 'time DESC'
        );
      `);
      await db.execute(sql`SELECT add_compression_policy('telemetry.battery_readings', INTERVAL '7 days');`);
    } catch(e) { console.log('Compression setting (battery) may already exist.'); }
    
    try {
      await db.execute(sql`
        ALTER TABLE telemetry.gps_readings SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'device_id',
            timescaledb.compress_orderby = 'time DESC'
        );
      `);
      await db.execute(sql`SELECT add_compression_policy('telemetry.gps_readings', INTERVAL '7 days');`);
    } catch(e) { console.log('Compression setting (gps) may already exist.'); }

    console.log('10. Creating retention policies...');
    try {
      await db.execute(sql`SELECT add_retention_policy('telemetry.battery_readings', INTERVAL '6 months');`);
      await db.execute(sql`SELECT add_retention_policy('telemetry.gps_readings', INTERVAL '6 months');`);
    } catch(e) { console.log('Retention policy may already exist.'); }

    console.log('✅ Migrations applied successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

applyMigrations();
