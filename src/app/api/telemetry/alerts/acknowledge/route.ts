import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';

export async function POST(req: Request) {
    try {
        const { alertId, resolvedNotes } = await req.json();

        if (!alertId) {
            return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
        }

        const result = await telemetryDb.execute(sql`
      UPDATE battery_alerts 
      SET 
        acknowledged = TRUE, 
        resolved_at = NOW(),
        resolved_by = 'System Admin', 
        resolved_notes = ${resolvedNotes || null}
      WHERE id = ${alertId}
      RETURNING id
    `);

        if (result.length === 0) {
            return NextResponse.json({ error: 'Alert not found or already acknowledged' }, { status: 404 });
        }

        return NextResponse.json({ success: true, acknowledged: result[0].id }, { status: 200 });

    } catch (error) {
        console.error('Error acknowledging alert:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
