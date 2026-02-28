import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
    try {
        const auth = await getServerSession(req);
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get('deviceId');
        const days = Number(searchParams.get('days')) || 30; // Default to 30 days

        // Construct the SQL query using TimescaleDB's time_bucket function
        let query = `
      SELECT 
        time_bucket('1 day', time) AS bucket,
        AVG(soh) AS avg_soh,
        MIN(soh) AS min_soh,
        MAX(soh) AS max_soh
      FROM telemetry.battery_readings
      WHERE time > NOW() - INTERVAL '${days} days'
        AND soh IS NOT NULL
    `;

        if (deviceId && deviceId !== 'all') {
            query += ` AND device_id = '${deviceId.replace(/'/g, "''")}'`;
        }

        if (auth.role === 'dealer') {
            query += ` AND device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = '${auth.dealer_id}')`;
        }

        query += `
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

        const data = await telemetryDb.execute(sql.raw(query));

        // Format for Recharts
        const formattedData = data.map((row: Record<string, unknown>) => ({
            Date: new Date(String(row.bucket)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            'Avg SOH': Number(row.avg_soh).toFixed(2),
            'Min SOH': Number(row.min_soh).toFixed(2),
            'Max SOH': Number(row.max_soh).toFixed(2),
        }));

        return NextResponse.json(formattedData, { status: 200 });

    } catch (error) {
        console.error('Error fetching SOH degradation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
