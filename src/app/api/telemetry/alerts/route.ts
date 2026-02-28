import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit')) || 20;
    const acknowledgedFilter = searchParams.get('acknowledged');

    // Base query components
    let baseQuery = `
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
    `;

    let conditions = [];
    if (acknowledgedFilter !== null && acknowledgedFilter !== '') {
      const isAck = acknowledgedFilter === 'true';
      conditions.push(`a.acknowledged = ${isAck ? 'TRUE' : 'FALSE'}`);
    }

    if (auth.role === 'dealer') {
      conditions.push(`db.dealer_id = '${auth.dealer_id}'`);
    }

    if (conditions.length > 0) {
      baseQuery += ` WHERE ` + conditions.join(' AND ');
    }

    baseQuery += ` ORDER BY a.created_at DESC LIMIT ${limit}`;

    const alerts = await telemetryDb.execute(sql.raw(baseQuery));

    return NextResponse.json(alerts, { status: 200 });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json([], { status: 500 });
  }
}
