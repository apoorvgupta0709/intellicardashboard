import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

/**
 * Default alert thresholds — used as fallback if no config exists in DB.
 */
const DEFAULT_THRESHOLDS = {
    low_soc: { value: 10, severity: 'critical', label: 'Low SOC (%)' },
    deep_discharge: { value: 0, severity: 'critical', label: 'Deep Discharge SOC (%)' },
    high_temp: { value: 55, severity: 'critical', label: 'High Temperature (°C)' },
    soh_degradation: { value: 80, severity: 'warning', label: 'SOH Degradation (%)' },
    overcurrent: { value: 100, severity: 'warning', label: 'Overcurrent (A)' },
    overvoltage: { value: 58.4, severity: 'warning', label: 'Overvoltage (V)' },
    undervoltage: { value: 42, severity: 'critical', label: 'Undervoltage (V)' },
    no_communication_hours: { value: 6, severity: 'warning', label: 'No Communication (hours)' },
    rapid_soh_drop: { value: 5, severity: 'critical', label: 'Rapid SOH Drop (% in 30 days)' },
    excessive_cycles: { value: 1500, severity: 'info', label: 'Excessive Charge Cycles' },
};

/**
 * GET /api/telemetry/alerts/config
 * Returns the current alert threshold configuration.
 */
export async function GET() {
    try {
        // Try to read config from DB
        const result = await telemetryDb.execute(sql`
      SELECT config FROM telemetry.alert_config WHERE id = 1
    `);

        if (result.length > 0 && result[0]?.config) {
            return NextResponse.json(result[0].config, { status: 200 });
        }

        // Return defaults if no DB config exists
        return NextResponse.json(DEFAULT_THRESHOLDS, { status: 200 });
    } catch {
        // Table might not exist yet — return defaults
        return NextResponse.json(DEFAULT_THRESHOLDS, { status: 200 });
    }
}

/**
 * PUT /api/telemetry/alerts/config
 * Updates the alert threshold configuration. CEO-only.
 */
export async function PUT(req: Request) {
    try {
        const auth = await getServerSession(req);

        // Only CEO can update alert config
        if (auth.role !== 'ceo') {
            return NextResponse.json(
                { error: 'Only administrators can update alert configuration' },
                { status: 403 }
            );
        }

        const body = await req.json();

        // Upsert config row
        await telemetryDb.execute(sql`
      INSERT INTO telemetry.alert_config (id, config, updated_at)
      VALUES (1, ${JSON.stringify(body)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE
      SET config = ${JSON.stringify(body)}::jsonb, updated_at = NOW()
    `);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error updating alert config:', error);
        return NextResponse.json(
            { error: 'Failed to update alert configuration' },
            { status: 500 }
        );
    }
}
