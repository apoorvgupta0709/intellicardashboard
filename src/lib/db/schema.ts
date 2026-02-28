import { pgTable, varchar, real, boolean, timestamp, serial, uuid, index } from 'drizzle-orm/pg-core';

// Note: Ensure you have `accounts`, `inventory`, `leads`, and `users` tables
// defined in your main schema if they aren't here, or simplify the foreign keys
// if they are mapped differently in your actual database.
// For now, we define them without strict FK constraints to existing Drizzle models
// if they don't exist yet, or you can add `references(() => otherTable.id)` later.

// ====== DEVICE-BATTERY MAPPING ======
// Links IoT devices to batteries in your inventory
export const deviceBatteryMap = pgTable('device_battery_map', {
    id: varchar('id', { length: 255 }).primaryKey(),
    device_id: varchar('device_id', { length: 50 }).notNull().unique(), // Intellicar device ID
    battery_serial: varchar('battery_serial', { length: 255 }),
    vehicle_number: varchar('vehicle_number', { length: 50 }),
    dealer_id: varchar('dealer_id', { length: 255 }),
    lead_id: varchar('lead_id', { length: 255 }),
    customer_name: varchar('customer_name', { length: 255 }),
    customer_phone: varchar('customer_phone', { length: 20 }),
    activated_at: timestamp('activated_at', { withTimezone: true }).defaultNow(),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_device_battery_dealer').on(table.dealer_id),
    index('idx_device_battery_serial').on(table.battery_serial),
]);

// ====== BATTERY ALERTS ======
// Alerts table for threshold breaches
export const batteryAlerts = pgTable('battery_alerts', {
    id: serial('id').primaryKey(),
    device_id: varchar('device_id', { length: 50 }).notNull(),
    alert_type: varchar('alert_type', { length: 50 }).notNull(),
    // Types: low_soc, high_temp, soh_degradation, overcurrent,
    //        overvoltage, undervoltage, no_communication, deep_discharge
    severity: varchar('severity', { length: 20 }).notNull(), // critical, warning, info
    message: varchar('message', { length: 500 }).notNull(),
    reading_value: real('reading_value'),
    threshold_value: real('threshold_value'),
    acknowledged: boolean('acknowledged').default(false),
    acknowledged_by: uuid('acknowledged_by'),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_alerts_device').on(table.device_id, table.created_at),
    // Additional index for unacknowledged alerts (Drizzle doesn't support WHERE clauses in indexes natively yet without raw SQL,
    // but we can at least index the acknowledged field)
    index('idx_alerts_unack').on(table.acknowledged, table.severity),
]);

// NOTE: The telemetry hypertables (battery_readings, gps_readings, trips, energy_consumption)
// are created via raw SQL migration (apply-telemetry-schema.ts) since Drizzle doesn't support
// TimescaleDB hypertable creation natively. 
// Query them using Drizzle's sql\`\` tag or raw Postgres queries.
