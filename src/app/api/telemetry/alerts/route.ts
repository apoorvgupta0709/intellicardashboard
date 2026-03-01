import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);
    const { searchParams } = new URL(req.url);

    // Clamp limit to a safe range to prevent memory exhaustion
    const rawLimit = parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 20;

    const acknowledgedFilter = searchParams.get('acknowledged');
    const filterByAck = acknowledgedFilter !== null && acknowledgedFilter !== '';
    const isAck = acknowledgedFilter === 'true';

    // Fully parameterized query — no string concatenation or sql.raw()
    const alerts = await telemetryDb.execute(sql`
      SELECT
        a.id,
        a.device_id,
        a.alert_type,
        a.severity,
        a.message,
        a.reading_value,
        a.created_at,
        a.acknowledged,
        a.resolved_at,
        db.vehicle_number,
        db.customer_name
      FROM battery_alerts a
      LEFT JOIN device_battery_map db ON a.device_id = db.device_id
      WHERE 1=1
        ${filterByAck ? sql`AND a.acknowledged = ${isAck}` : sql``}
        ${auth.role === 'dealer' ? sql`AND db.dealer_id = ${auth.dealer_id}` : sql``}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `);

    return NextResponse.json(alerts, { status: 200 });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json([], { status: 500 });
  }
}
