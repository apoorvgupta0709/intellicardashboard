import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);
    // 1. Total Active Batteries
    // From CRM bridge table:
    const activeResult = await telemetryDb.execute(sql`
      SELECT COUNT(*) as active_count FROM device_battery_map 
      WHERE is_active = TRUE
      ${auth.role === 'dealer' ? sql` AND dealer_id = ${auth.dealer_id}` : sql``}
    `);
    const activeBatteries = Number(activeResult[0]?.active_count || 0);

    // 2. Fleet Average SOH
    // Average SOH from most recent reading per device
    const sohResult = await telemetryDb.execute(sql`
      WITH LatestReadings AS (
        SELECT DISTINCT ON (device_id) soh, device_id
        FROM telemetry.battery_readings
        ORDER BY device_id, time DESC
      )
      SELECT AVG(soh) as avg_soh FROM LatestReadings 
      WHERE soh IS NOT NULL
      ${auth.role === 'dealer' ? sql` AND device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = ${auth.dealer_id})` : sql``}
    `);
    const avgSoh = Number(sohResult[0]?.avg_soh || 0);

    // 3. Batteries Charging Now
    // Positive current means charging. Assuming reading is recent (e.g. within last 1 hour)
    const chargingResult = await telemetryDb.execute(sql`
      WITH LatestReadings AS (
        SELECT DISTINCT ON (device_id) current, time, device_id
        FROM telemetry.battery_readings
        ORDER BY device_id, time DESC
      )
      SELECT COUNT(*) as charging_count 
      FROM LatestReadings 
      WHERE current > 0 AND time >= NOW() - INTERVAL '1 hour'
      ${auth.role === 'dealer' ? sql` AND device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = ${auth.dealer_id})` : sql``}
    `);
    const chargingCount = Number(chargingResult[0]?.charging_count || 0);

    // 4. Active Alerts
    // Unacknowledged alerts across the fleet
    const alertsResult = await telemetryDb.execute(sql`
      SELECT COUNT(*) as active_alerts 
      FROM battery_alerts 
      WHERE acknowledged = FALSE
      ${auth.role === 'dealer' ? sql` AND device_id IN (SELECT device_id FROM device_battery_map WHERE dealer_id = ${auth.dealer_id})` : sql``}
    `);
    const activeAlerts = Number(alertsResult[0]?.active_alerts || 0);

    return NextResponse.json({
      activeBatteries,
      avgSoh: avgSoh.toFixed(1),
      chargingCount,
      activeAlerts
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching fleet overview:', error);
    // Return graceful fallback data so UI doesn't crash while DB isn't seeded
    return NextResponse.json({
      activeBatteries: 0,
      avgSoh: '0.0',
      chargingCount: 0,
      activeAlerts: 0,
      error: 'Failed to fetch'
    }, { status: 500 });
  }
}
