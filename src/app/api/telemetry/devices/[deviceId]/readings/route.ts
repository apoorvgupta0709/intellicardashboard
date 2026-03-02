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
        const limit = Number(searchParams.get('limit')) || 1000;

        const includeCan = searchParams.get('includeCan') === '1';

        // Fetch the raw historical readings. For production 24h graphs, we might want 
        // to downclip/bucket the readings strictly to N points for the frontend.
        const readings = await telemetryDb.execute(sql`
      SELECT time, soc, soh, voltage, current, temperature
      ${includeCan ? sql`, source, can_sample_time, can_payload` : sql``}
      FROM telemetry.battery_readings
      WHERE device_id = ${deviceId}
        AND time >= NOW() - INTERVAL '${sql.raw(hoursBack.toString())} hours'
      ORDER BY time ASC
      LIMIT ${limit}
    `);

        return NextResponse.json(readings, { status: 200 });
    } catch (error) {
        console.error('Error fetching battery readings history:', error);
        return NextResponse.json([], { status: 500 });
    }
}
