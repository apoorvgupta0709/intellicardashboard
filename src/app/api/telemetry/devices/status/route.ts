import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
    try {
        const auth = await getServerSession(req);
        // Find latest timestamp per device in battery_readings
        // Flag as offline if the last timestamp is older than 24 hours from NOW
        const result = await telemetryDb.execute(sql`
            WITH latest_readings AS (
                SELECT 
                    device_id, 
                    MAX(time) as last_seen
                FROM telemetry.battery_readings
                ${auth.role === 'dealer' ? sql`WHERE device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = ${auth.dealer_id})` : sql``}
                GROUP BY device_id
            )
            SELECT 
                r.device_id,
                r.last_seen,
                CASE 
                    WHEN r.last_seen < NOW() - INTERVAL '24 hours' THEN 'Offline'
                    WHEN r.last_seen < NOW() - INTERVAL '1 hour' THEN 'Warning'
                    ELSE 'Active'
                END as status
            FROM latest_readings r
        `);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching communication status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
