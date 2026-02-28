import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';

export async function GET() {
    try {
        // We want the most recent GPS location for each device, along with its most recent SOC 
        // and if there is a critical alert active.

        // In TimescaleDB, querying the most recent over a hypertable can be expensive without SkipScan
        // or properly indexed JOINs. For a roadmap MVP, DISTINCT ON is acceptable for <50k entities.
        const mapResult = await telemetryDb.execute(sql`
      WITH LatestGPS AS (
        SELECT DISTINCT ON (device_id) device_id, latitude, longitude, time
        FROM telemetry.gps_readings
        ORDER BY device_id, time DESC
      ),
      LatestBattery AS (
        SELECT DISTINCT ON (device_id) device_id, soc, soh
        FROM telemetry.battery_readings
        WHERE time >= NOW() - INTERVAL '7 days'
        ORDER BY device_id, time DESC
      ),
      ActiveAlerts AS (
        SELECT device_id, severity
        FROM battery_alerts
        WHERE acknowledged = FALSE
        -- A single device could have multiple active alerts, take the highest severity
        GROUP BY device_id, severity
      )
      
      SELECT 
        g.device_id, 
        g.latitude, 
        g.longitude, 
        b.soc, 
        b.soh,
        (
           SELECT a.severity 
           FROM ActiveAlerts a 
           WHERE a.device_id = g.device_id
           ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END
           LIMIT 1
        ) as alert_status
      FROM LatestGPS g
      LEFT JOIN LatestBattery b ON g.device_id = b.device_id
    `);

        return NextResponse.json(mapResult, { status: 200 });

    } catch (error) {
        console.error('Error fetching map data:', error);
        // Graceful fallback dummy data format
        return NextResponse.json([], { status: 500 });
    }
}
