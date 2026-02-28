import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Number(searchParams.get('limit')) || 20;

        // Fetch the most recent unacknowledged alerts
        const alerts = await telemetryDb.execute(sql`
      SELECT 
        a.id,
        a.device_id,
        a.alert_type,
        a.severity,
        a.message,
        a.reading_value,
        a.created_at,
        db.vehicle_number,
        db.customer_name
      FROM battery_alerts a
      LEFT JOIN device_battery_map db ON a.device_id = db.device_id
      WHERE a.acknowledged = FALSE
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `);

        return NextResponse.json(alerts, { status: 200 });

    } catch (error) {
        console.error('Error fetching alerts:', error);
        return NextResponse.json([], { status: 500 });
    }
}
