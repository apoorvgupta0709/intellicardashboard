import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;

    // Fetch devices, joining latest readings via simple subquery or joining a continuous aggregate
    // In production, we'd use the daily aggregate for quick lookup or purely mapping from CRM
    const devicesList = await telemetryDb.execute(sql`
      SELECT 
        m.device_id, 
        m.battery_serial, 
        m.vehicle_number, 
        m.customer_name, 
        m.dealer_id,
        (
          SELECT soc FROM telemetry.battery_readings r 
          WHERE r.device_id = m.device_id ORDER BY time DESC LIMIT 1
        ) as current_soc,
        (
          SELECT soh FROM telemetry.battery_readings r 
          WHERE r.device_id = m.device_id ORDER BY time DESC LIMIT 1
        ) as current_soh,
        (
          SELECT time FROM telemetry.battery_readings r 
          WHERE r.device_id = m.device_id ORDER BY time DESC LIMIT 1
        ) as last_seen
      FROM device_battery_map m
      ${auth.role === 'dealer' ? sql`WHERE m.dealer_id = ${auth.dealer_id}` : sql``}
      ORDER BY m.activated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return NextResponse.json(devicesList, { status: 200 });

  } catch (error) {
    console.error('Error fetching devices summary:', error);
    return NextResponse.json([], { status: 500 });
  }
}
