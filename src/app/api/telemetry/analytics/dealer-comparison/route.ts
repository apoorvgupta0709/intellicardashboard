import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);
    // We need average SOH per dealer. 
    // We pull the LATEST reading per device, then average it by dealer.

    const query = `
      WITH latest_readings AS (
        SELECT DISTINCT ON (device_id)
          device_id,
          soh
        FROM telemetry.battery_readings
        ORDER BY device_id, time DESC
      ),
      dealer_stats AS (
        SELECT 
          COALESCE(db.dealer_id, 'Unassigned') as dealer_id,
          COUNT(lr.device_id) as total_devices,
          AVG(lr.soh) as avg_soh
        FROM latest_readings lr
        LEFT JOIN device_battery_map db ON lr.device_id = db.device_id
        ${auth.role === 'dealer' ? `WHERE COALESCE(db.dealer_id, 'Unassigned') = '${auth.dealer_id}'` : ''}
        GROUP BY COALESCE(db.dealer_id, 'Unassigned')
      ),
      active_alerts AS (
        SELECT 
          COALESCE(db.dealer_id, 'Unassigned') as dealer_id,
          COUNT(a.id) as active_alerts_count
        FROM battery_alerts a
        LEFT JOIN device_battery_map db ON a.device_id = db.device_id
        WHERE a.acknowledged = FALSE
        ${auth.role === 'dealer' ? `AND COALESCE(db.dealer_id, 'Unassigned') = '${auth.dealer_id}'` : ''}
        GROUP BY COALESCE(db.dealer_id, 'Unassigned')
      )
      SELECT 
        ds.dealer_id,
        ds.total_devices,
        ds.avg_soh,
        COALESCE(aa.active_alerts_count, 0) as active_alerts_count
      FROM dealer_stats ds
      LEFT JOIN active_alerts aa ON ds.dealer_id = aa.dealer_id
      ORDER BY ds.avg_soh ASC
    `;

    const data = await telemetryDb.execute(sql.raw(query));

    const formattedData = data.map((row: Record<string, unknown>) => ({
      dealer_id: String(row.dealer_id),
      total_devices: Number(row.total_devices),
      avg_soh: row.avg_soh !== null ? Number(row.avg_soh).toFixed(2) : null,
      active_alerts_count: Number(row.active_alerts_count)
    }));

    return NextResponse.json(formattedData, { status: 200 });

  } catch (error) {
    console.error('Error fetching dealer comparison:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
