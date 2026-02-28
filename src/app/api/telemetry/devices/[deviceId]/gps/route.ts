import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    try {
        const { deviceId } = await params;
        const { searchParams } = new URL(req.url);
        const hoursBack = Number(searchParams.get('hours')) || 24;
        const limit = Number(searchParams.get('limit')) || 2000;

        const gpsTraces = await telemetryDb.execute(sql`
      SELECT time, latitude, longitude, speed, ignition_on
      FROM telemetry.gps_readings
      WHERE device_id = ${deviceId}
        AND time >= NOW() - INTERVAL '${sql.raw(hoursBack.toString())} hours'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY time ASC
      LIMIT ${limit}
    `);

        return NextResponse.json(gpsTraces, { status: 200 });
    } catch (error) {
        console.error('Error fetching GPS traces:', error);
        return NextResponse.json([], { status: 500 });
    }
}
