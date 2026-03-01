import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function test() {
    try {
        console.log("Running map query...");
        const result = await sql`
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
      LEFT JOIN LatestBattery b ON g.device_id = b.device_id;
        `;
        console.log(`Success! Rows returned: ${result.length}`);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sql.end();
    }
}

test();
