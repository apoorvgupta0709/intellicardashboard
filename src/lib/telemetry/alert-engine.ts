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

    // 2. Deduplicate: We shouldn't spam the same active alert.
    // In a production system, we'd check if an identical UNACKNOWLEDGED alert exists for that device.
    // For this MVP, we will run a simplistic raw SQL insert that ignores duplicates if we set up a constraint,
    // or we just manually filter against existing active alerts.

    // Fetch currently active unacknowledged alerts for the devices in question
    const deviceIds = [...new Set(newAlerts.map(a => a.device_id))];

    if (deviceIds.length === 0) return;

    const activeAlerts = await telemetryDb.execute(sql`
    SELECT device_id, alert_type, severity 
    FROM battery_alerts
    WHERE acknowledged = FALSE
      AND device_id = ANY(${deviceIds})
  `);

    const activeAlertSet = new Set(
        activeAlerts.map((a: Record<string, unknown>) => `${String(a.device_id)}-${String(a.alert_type)}-${String(a.severity)}`)
    );

    const filteredAlerts = newAlerts.filter(
        a => !activeAlertSet.has(`${a.device_id}-${a.alert_type}-${a.severity}`)
    );

    if (filteredAlerts.length === 0) return;

    // 3. Insert the newly generated unique alerts
    await telemetryDb.execute(sql`
    INSERT INTO battery_alerts (
      device_id, alert_type, severity, message, reading_value
    )
    SELECT * FROM json_populate_recordset(null::battery_alerts, ${JSON.stringify(filteredAlerts)}::json)
  `);

    console.log(`Alert Engine: Generated ${filteredAlerts.length} new alerts.`);
}
