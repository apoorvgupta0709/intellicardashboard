import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

/**
 * GET /api/telemetry/analytics/soc-trends
 * Returns fleet-wide daily average SOC over time.
 * Query params: days (number, default 30)
 */
export async function GET(req: Request) {
    try {
        const auth = await getServerSession(req);
        const { searchParams } = new URL(req.url);
        const days = Number(searchParams.get('days')) || 30;

        // Try continuous aggregate first (faster), fall back to raw table
        let result;
        try {
            let query = `
        SELECT
          bucket::date AS date,
          ROUND(AVG(avg_soc)::numeric, 1) AS avg_soc,
          ROUND(MIN(min_soc)::numeric, 1) AS min_soc,
          ROUND(MAX(max_soc)::numeric, 1) AS max_soc,
          SUM(reading_count) AS total_readings
        FROM telemetry.battery_daily
        WHERE bucket >= NOW() - INTERVAL '${days} days'
      `;

            if (auth.role === 'dealer') {
                query += ` AND device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = '${auth.dealer_id}')`;
            }

            query += ` GROUP BY bucket::date ORDER BY date ASC`;

            result = await telemetryDb.execute(sql.raw(query));
        } catch {
            // Continuous aggregate might not exist — fall back to raw readings
            let fallbackQuery = `
        SELECT
          time::date AS date,
          ROUND(AVG(soc)::numeric, 1) AS avg_soc,
          ROUND(MIN(soc)::numeric, 1) AS min_soc,
          ROUND(MAX(soc)::numeric, 1) AS max_soc,
          COUNT(*) AS total_readings
        FROM telemetry.battery_readings
        WHERE time >= NOW() - INTERVAL '${days} days'
          AND soc IS NOT NULL
      `;

            if (auth.role === 'dealer') {
                fallbackQuery += ` AND device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = '${auth.dealer_id}')`;
            }

            fallbackQuery += ` GROUP BY time::date ORDER BY date ASC`;

            result = await telemetryDb.execute(sql.raw(fallbackQuery));
        }

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error('Error fetching SOC trends:', error);
        return NextResponse.json([], { status: 500 });
    }
}
