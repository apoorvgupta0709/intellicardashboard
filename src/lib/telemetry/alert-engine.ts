import { sql } from 'drizzle-orm';
import { telemetryDb } from './db';
import { CANReading } from './types';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface BatteryAlert {
    device_id: string;
    alert_type: string;
    severity: AlertSeverity;
    message: string;
    reading_value: number;
}

const THRESHOLDS = {
    TEMP_CRITICAL: 55,
    TEMP_WARNING: 45,
    SOC_WARNING: 15,
    SOC_CRITICAL: 5,
    VOLTAGE_LOW_CRITICAL: 42, // Assuming a 48V nominal system for example
    VOLTAGE_HIGH_WARNING: 56,
};

// Minimum minutes between repeated alerts for the same device+type combination.
// Prevents alert spam when a battery stays in a fault condition across many ingest batches.
const ALERT_COOLDOWN_MINUTES = 15;

export async function processAlerts(readings: CANReading[]) {
    if (readings.length === 0) return;

    const newAlerts: BatteryAlert[] = [];

    // 1. Evaluate readings for alert conditions
    for (const r of readings) {
        if (!r.device_id) continue;

        if (typeof r.temperature === 'number') {
            if (r.temperature >= THRESHOLDS.TEMP_CRITICAL) {
                newAlerts.push({
                    device_id: r.device_id,
                    alert_type: 'High Temperature',
                    severity: 'critical',
                    message: `Critical battery temperature detected: ${r.temperature}°C`,
                    reading_value: r.temperature
                });
            } else if (r.temperature >= THRESHOLDS.TEMP_WARNING) {
                newAlerts.push({
                    device_id: r.device_id,
                    alert_type: 'High Temperature',
                    severity: 'warning',
                    message: `Elevated battery temperature detected: ${r.temperature}°C`,
                    reading_value: r.temperature
                });
            }
        }

        if (typeof r.soc === 'number') {
            if (r.soc <= THRESHOLDS.SOC_CRITICAL) {
                newAlerts.push({
                    device_id: r.device_id,
                    alert_type: 'Low SOC',
                    severity: 'critical',
                    message: `Battery critically low: ${r.soc}%`,
                    reading_value: r.soc
                });
            } else if (r.soc <= THRESHOLDS.SOC_WARNING) {
                newAlerts.push({
                    device_id: r.device_id,
                    alert_type: 'Low SOC',
                    severity: 'warning',
                    message: `Battery low: ${r.soc}%`,
                    reading_value: r.soc
                });
            }
        }
    }

    if (newAlerts.length === 0) return;

    // 2. Deduplicate using a time-based cooldown window.
    //    Previously, this only checked unacknowledged alerts, meaning a re-triggered alert
    //    after acknowledgement would spam new entries on every ingest batch.
    //    Now we suppress any alert for the same device+type that was created within the
    //    last ALERT_COOLDOWN_MINUTES, regardless of acknowledged status.
    const deviceIds = [...new Set(newAlerts.map(a => a.device_id))];

    if (deviceIds.length === 0) return;

    const recentAlerts = await telemetryDb.execute(sql`
        SELECT device_id, alert_type, severity
        FROM battery_alerts
        WHERE device_id = ANY(${deviceIds})
          AND created_at >= NOW() - INTERVAL '${sql.raw(ALERT_COOLDOWN_MINUTES.toString())} minutes'
    `);

    const recentAlertSet = new Set(
        recentAlerts.map((a: Record<string, unknown>) => `${String(a.device_id)}-${String(a.alert_type)}-${String(a.severity)}`)
    );

    const filteredAlerts = newAlerts.filter(
        a => !recentAlertSet.has(`${a.device_id}-${a.alert_type}-${a.severity}`)
    );

    if (filteredAlerts.length === 0) return;

    // 3. Insert new alerts using explicit column mapping via json_array_elements.
    //    Previously used json_populate_recordset(null::battery_alerts, ...) which returns
    //    ALL table columns (11+), causing a column count mismatch with the 5-column INSERT target.
    await telemetryDb.execute(sql`
        INSERT INTO battery_alerts (device_id, alert_type, severity, message, reading_value)
        SELECT
            (r->>'device_id'),
            (r->>'alert_type'),
            (r->>'severity'),
            (r->>'message'),
            (r->>'reading_value')::real
        FROM json_array_elements(${JSON.stringify(filteredAlerts)}::json) AS r
    `);

    console.log(`Alert Engine: Generated ${filteredAlerts.length} new alerts.`);
}
