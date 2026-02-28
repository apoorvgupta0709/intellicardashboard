import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    try {
        const { deviceId } = await params;

        // Fetch base metadata combined with the most recent battery and GPS readings
        const deviceResult = await telemetryDb.execute(sql`
      SELECT 
        m.device_id,
        m.battery_serial,
        m.vehicle_number,
        m.customer_name,
        m.dealer_id,
        m.status as map_status,
        m.activated_at,
        (
          SELECT json_build_object(
            'soc', r.soc, 
            'soh', r.soh, 
            'voltage', r.voltage, 
            'current', r.current, 
            'temperature', r.temperature,
            'time', r.time
          )
          FROM telemetry.battery_readings r 
          WHERE r.device_id = m.device_id 
          ORDER BY r.time DESC LIMIT 1
        ) as latest_battery,
        (
          SELECT json_build_object(
            'latitude', g.latitude,
            'longitude', g.longitude,
            'speed', g.speed,
            'heading', g.heading,
            'ignition_on', g.ignition_on,
            'time', g.time
          )
          FROM telemetry.gps_readings g
          WHERE g.device_id = m.device_id
          ORDER BY g.time DESC LIMIT 1
        ) as latest_gps
      FROM device_battery_map m
      WHERE m.device_id = ${deviceId}
      LIMIT 1
    `);

        if (!deviceResult || deviceResult.length === 0) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        return NextResponse.json(deviceResult[0], { status: 200 });

    } catch (error) {
        console.error(`Error fetching device:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
