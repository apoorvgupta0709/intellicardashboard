import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

/**
 * GET /api/telemetry/devices/[deviceId]/trips
 * Returns trip history for a specific device.
 * Query params: start (ISO date), end (ISO date), limit (number)
 */
export async function GET(
    req: Request,
    { params }: { params: { deviceId: string } }
) {
    try {
        const auth = await getServerSession(req);
        const { deviceId } = params;
        const { searchParams } = new URL(req.url);

        const limit = Number(searchParams.get('limit')) || 50;
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        // RBAC: If dealer, verify they own this device
        if (auth.role === 'dealer') {
            const ownership = await telemetryDb.execute(sql`
        SELECT 1 FROM device_battery_map
        WHERE device_id = ${deviceId} AND dealer_id = ${auth.dealer_id}
      `);
            if (ownership.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        let query = `
      SELECT
        t.id,
        t.device_id,
        t.start_time,
        t.end_time,
        t.distance_km,
        t.start_odometer,
        t.end_odometer,
        t.last_ign_on,
        t.last_ign_off,
        t.created_at,
        db.vehicle_number,
        db.customer_name
      FROM telemetry.trips t
      LEFT JOIN device_battery_map db ON t.device_id = db.device_id
      WHERE t.device_id = '${deviceId}'
    `;

        if (start) {
            query += ` AND t.start_time >= '${start}'`;
        }
        if (end) {
            query += ` AND t.end_time <= '${end}'`;
        }

        query += ` ORDER BY t.start_time DESC LIMIT ${limit}`;

        const trips = await telemetryDb.execute(sql.raw(query));

        return NextResponse.json(trips, { status: 200 });
    } catch (error) {
        console.error('Error fetching device trips:', error);
        return NextResponse.json([], { status: 500 });
    }
}
