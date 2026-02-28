import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);
    const { searchParams } = new URL(req.url);
    const sohThreshold = Number(searchParams.get('soh')) || 80;
    const cycleThreshold = Number(searchParams.get('cycles')) || 1500;

    // We want the LATEST reading per device that breaches thresholds
    const query = `
      WITH latest_readings AS (
        SELECT DISTINCT ON (device_id)
          device_id,
          soh,
          charge_cycle,
          time as last_reading_time
        FROM telemetry.battery_readings
        ORDER BY device_id, time DESC
      )
      SELECT 
        lr.device_id,
        lr.soh,
        lr.charge_cycle,
        lr.last_reading_time,
        db.vehicle_number,
        db.customer_name,
        db.dealer_id,
        db.battery_serial
      FROM latest_readings lr
      LEFT JOIN device_battery_map db ON lr.device_id = db.device_id
      WHERE (lr.soh < ${sohThreshold} OR lr.charge_cycle > ${cycleThreshold})
      ${auth.role === 'dealer' ? `AND db.dealer_id = '${auth.dealer_id}'` : ''}
      ORDER BY lr.soh ASC, lr.charge_cycle DESC
    `;

    const data = await telemetryDb.execute(sql.raw(query));

    const formattedData = data.map((row: Record<string, unknown>) => ({
      device_id: String(row.device_id),
      soh: row.soh !== null ? Number(row.soh) : null,
      charge_cycle: row.charge_cycle !== null ? Number(row.charge_cycle) : null,
      last_reading_time: String(row.last_reading_time),
      vehicle_number: row.vehicle_number ? String(row.vehicle_number) : null,
      customer_name: row.customer_name ? String(row.customer_name) : null,
      dealer_id: row.dealer_id ? String(row.dealer_id) : 'Unassigned',
      battery_serial: row.battery_serial ? String(row.battery_serial) : null
    }));

    return NextResponse.json(formattedData, { status: 200 });

  } catch (error) {
    console.error('Error fetching warranty analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
