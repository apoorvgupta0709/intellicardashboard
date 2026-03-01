import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
    try {
        const auth = await getServerSession(req);
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get('deviceId');
        const days = Number(searchParams.get('days')) || 30;

        // Use standard PostgreSQL date_trunc instead of TimescaleDB time_bucket
        const deviceFilter = (deviceId && deviceId !== 'all')
            ? sql`AND device_id = ${deviceId}`
            : sql``;

        const dealerFilter = auth.role === 'dealer'
            ? sql`AND device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = ${auth.dealer_id})`
            : sql``;

        const data = await telemetryDb.execute(sql`
            SELECT
                date_trunc('day', time) AS bucket,
                AVG(soh) AS avg_soh,
                MIN(soh) AS min_soh,
                MAX(soh) AS max_soh
            FROM telemetry.battery_readings
            WHERE time > NOW() - INTERVAL '1 day' * ${days}
              AND soh IS NOT NULL
              ${deviceFilter}
              ${dealerFilter}
            GROUP BY date_trunc('day', time)
            ORDER BY bucket ASC
        `);

        // Format for Recharts
        const formattedData = data.map((row: Record<string, unknown>) => ({
            Date: new Date(String(row.bucket)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            'Avg SOH': Number(Number(row.avg_soh).toFixed(2)),
            'Min SOH': Number(Number(row.min_soh).toFixed(2)),
            'Max SOH': Number(Number(row.max_soh).toFixed(2)),
        }));

        return NextResponse.json(formattedData, { status: 200 });

    } catch (error) {
        console.error('Error fetching SOH degradation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
