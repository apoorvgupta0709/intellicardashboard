import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Number(searchParams.get('limit')) || 20;

        // Fetch the most recent trip summaries
        const trips = await telemetryDb.execute(sql`
      SELECT 
        t.time AS _time,
        t.device_id,
        t.trip_start_time,
        t.trip_end_time,
        t.distance_km,
        t.energy_consumed_kwh,
        t.efficiency_km_per_kwh,
        db.vehicle_number,
        db.customer_name
      FROM telemetry.trip_summaries t
      LEFT JOIN device_battery_map db ON t.device_id = db.device_id
      ORDER BY t.trip_end_time DESC
      LIMIT ${limit}
    `);

        // We do explicit returning format mapping just in case of DB type casing inconsistencies
        const formattedTrips = trips.map((t: Record<string, unknown>) => ({
            device_id: String(t.device_id),
            vehicle_number: t.vehicle_number ? String(t.vehicle_number) : null,
            customer_name: t.customer_name ? String(t.customer_name) : null,
            trip_start_time: String(t.trip_start_time),
            trip_end_time: String(t.trip_end_time),
            distance_km: Number(t.distance_km),
            energy_consumed_kwh: Number(t.energy_consumed_kwh),
            efficiency_km_per_kwh: t.efficiency_km_per_kwh ? Number(t.efficiency_km_per_kwh) : null
        }));

        return NextResponse.json(formattedTrips, { status: 200 });

    } catch (error) {
        console.error('Error fetching trip overviews:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
