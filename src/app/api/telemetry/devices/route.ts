import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);
    const { searchParams } = new URL(req.url);

    // Validate and clamp limit/offset to prevent invalid SQL and memory exhaustion.
    // Previously: Number(param) || default allowed negative values (e.g. -1 → LIMIT -1
    // which PostgreSQL rejects with "LIMIT must not be negative").
    const rawLimit = parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;

    const rawOffset = parseInt(searchParams.get('offset') ?? '', 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    // Previously used 3 correlated subqueries per device (N×3 round-trips into battery_readings).
    // At 22K devices that becomes 66K sequential index lookups per page request, causing timeouts.
    // Fix: single CTE with DISTINCT ON retrieves the latest reading per device in one pass,
    // then a LEFT JOIN attaches it to the mapping table.
    const devicesList = await telemetryDb.execute(sql`
      WITH latest_readings AS (
        SELECT DISTINCT ON (device_id)
          device_id,
          soc,
          soh,
          time AS last_seen
        FROM telemetry.battery_readings
        ORDER BY device_id, time DESC
      )
      SELECT
        m.device_id,
        m.battery_serial,
        m.vehicle_number,
        m.customer_name,
        m.dealer_id,
        r.soc   AS current_soc,
        r.soh   AS current_soh,
        r.last_seen
      FROM device_battery_map m
      LEFT JOIN latest_readings r ON r.device_id = m.device_id
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
