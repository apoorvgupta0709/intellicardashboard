import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
    try {
        const auth = await getServerSession(req);
        const { searchParams } = new URL(req.url);
        const limit = Number(searchParams.get('limit')) || 20;

        // Since we don't have a dedicated trip_summaries table, we synthesize
        // trip-like data from GPS readings: group by device + day to show daily summaries.
        const dealerFilter = auth.role === 'dealer'
            ? sql`AND g.device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = ${auth.dealer_id})`
            : sql``;

        const trips = await telemetryDb.execute(sql`
            WITH daily_gps AS (
                SELECT
                    g.device_id,
                    date_trunc('day', g.time) AS trip_day,
                    MIN(g.time) AS trip_start_time,
                    MAX(g.time) AS trip_end_time,
                    COUNT(*) AS gps_points,
                    MAX(g.speed) AS max_speed,
                    AVG(g.speed) FILTER (WHERE g.speed > 0) AS avg_speed
                FROM telemetry.gps_readings g
                WHERE g.time >= NOW() - INTERVAL '7 days'
                ${dealerFilter}
                GROUP BY g.device_id, date_trunc('day', g.time)
                HAVING COUNT(*) > 5
            )
            SELECT
                d.device_id,
                d.trip_day,
                d.trip_start_time,
                d.trip_end_time,
                d.gps_points,
                ROUND(d.max_speed::numeric, 1) AS max_speed,
                ROUND(COALESCE(d.avg_speed, 0)::numeric, 1) AS avg_speed,
                db.vehicle_number,
                db.customer_name
            FROM daily_gps d
            LEFT JOIN device_battery_map db ON d.device_id = db.device_id
            ORDER BY d.trip_end_time DESC
            LIMIT ${limit}
        `);

        const formattedTrips = trips.map((t: Record<string, unknown>) => ({
            device_id: String(t.device_id),
            vehicle_number: t.vehicle_number ? String(t.vehicle_number) : null,
            customer_name: t.customer_name ? String(t.customer_name) : null,
            trip_start_time: String(t.trip_start_time),
            trip_end_time: String(t.trip_end_time),
            gps_points: Number(t.gps_points),
            max_speed: Number(t.max_speed),
            avg_speed: Number(t.avg_speed),
            trip_day: String(t.trip_day),
        }));

        return NextResponse.json(formattedTrips, { status: 200 });

    } catch (error) {
        console.error('Error fetching trip overviews:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
