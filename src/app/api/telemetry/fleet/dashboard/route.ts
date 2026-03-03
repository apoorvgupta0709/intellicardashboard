import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { getServerSession } from '@/lib/auth/server-auth';

export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(req);

    if (auth.role === 'dealer') {
      return NextResponse.json(await getDealerDashboard(auth.dealer_id));
    }
    return NextResponse.json(await getCEODashboard());
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

async function getCEODashboard() {
  // Run all queries in parallel
  const [
    fleetResult,
    utilizationResult,
    sohResult,
    warrantyResult,
    alertsResult,
    sohTrendResult,
    atRiskResult,
    dealerPerfResult,
    uptimeResult,
    avgDistResult,
  ] = await Promise.all([
    // totalFleet
    telemetryDb.execute(sql`
      SELECT COUNT(*) as count FROM vehicle_device_map WHERE is_active = TRUE
    `),
    // fleetUtilization: vehicles with GPS in last 24h / total
    telemetryDb.execute(sql`
      SELECT COUNT(DISTINCT device_id) as active_count
      FROM telemetry.gps_readings
      WHERE time > NOW() - INTERVAL '24 hours'
    `),
    // avgFleetSOH
    telemetryDb.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (vehiclenos) soh
        FROM telemetry.battery_readings
        WHERE soh IS NOT NULL
        ORDER BY vehiclenos, time DESC
      )
      SELECT AVG(soh) as avg_soh, COUNT(*) as total FROM latest
    `),
    // warrantyAtRisk: SOH < 80
    telemetryDb.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (vehiclenos) soh, vehiclenos
        FROM telemetry.battery_readings
        WHERE soh IS NOT NULL
        ORDER BY vehiclenos, time DESC
      )
      SELECT COUNT(*) as count FROM latest WHERE soh < 80
    `),
    // activeAlerts
    telemetryDb.execute(sql`
      SELECT COUNT(*) as count FROM battery_alerts WHERE acknowledged = FALSE
    `),
    // SOH trend (daily avg for last 30 days)
    telemetryDb.execute(sql`
      SELECT date_trunc('day', time)::date as date, AVG(soh) as avg_soh
      FROM telemetry.battery_readings
      WHERE soh IS NOT NULL AND time > NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', time)
      ORDER BY date ASC
    `),
    // at-risk devices (SOH < 80)
    telemetryDb.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (br.vehiclenos) br.vehiclenos, br.soh, br.time
        FROM telemetry.battery_readings br
        WHERE br.soh IS NOT NULL
        ORDER BY br.vehiclenos, br.time DESC
      )
      SELECT l.vehiclenos, l.soh,
        COALESCE(d.customer_name, '') as customer,
        COALESCE(d.dealer_id, 'Unassigned') as dealer
      FROM latest l
      LEFT JOIN device_battery_map d ON d.vehicle_number = l.vehiclenos
      WHERE l.soh < 80
      ORDER BY l.soh ASC
      LIMIT 20
    `),
    // dealer performance
    telemetryDb.execute(sql`
      WITH latest_soh AS (
        SELECT DISTINCT ON (vehiclenos) vehiclenos, soh
        FROM telemetry.battery_readings
        WHERE soh IS NOT NULL
        ORDER BY vehiclenos, time DESC
      ),
      dealer_vehicles AS (
        SELECT
          COALESCE(d.dealer_id, 'Unassigned') as dealer_id,
          COUNT(*) as vehicles,
          AVG(ls.soh) as avg_soh
        FROM device_battery_map d
        LEFT JOIN latest_soh ls ON ls.vehiclenos = d.vehicle_number
        WHERE d.is_active = TRUE
        GROUP BY COALESCE(d.dealer_id, 'Unassigned')
      ),
      dealer_alerts AS (
        SELECT
          COALESCE(d.dealer_id, 'Unassigned') as dealer_id,
          COUNT(*) as active_alerts
        FROM battery_alerts ba
        JOIN device_battery_map d ON d.device_id = ba.device_id
        WHERE ba.acknowledged = FALSE
        GROUP BY COALESCE(d.dealer_id, 'Unassigned')
      ),
      dealer_util AS (
        SELECT
          COALESCE(d.dealer_id, 'Unassigned') as dealer_id,
          COUNT(DISTINCT g.device_id) as active_gps
        FROM telemetry.gps_readings g
        JOIN device_battery_map d ON d.device_id = g.device_id
        WHERE g.time > NOW() - INTERVAL '24 hours'
        GROUP BY COALESCE(d.dealer_id, 'Unassigned')
      )
      SELECT
        dv.dealer_id,
        dv.vehicles,
        COALESCE(dv.avg_soh, 0) as avg_soh,
        COALESCE(da.active_alerts, 0) as active_alerts,
        CASE WHEN dv.vehicles > 0
          THEN ROUND(COALESCE(du.active_gps, 0)::numeric / dv.vehicles * 100, 1)
          ELSE 0
        END as utilization
      FROM dealer_vehicles dv
      LEFT JOIN dealer_alerts da ON da.dealer_id = dv.dealer_id
      LEFT JOIN dealer_util du ON du.dealer_id = dv.dealer_id
      ORDER BY dv.vehicles DESC
    `),
    // fleetUptime (% reporting in 24h)
    telemetryDb.execute(sql`
      SELECT COUNT(DISTINCT device_id) as reporting
      FROM telemetry.gps_readings
      WHERE time > NOW() - INTERVAL '24 hours'
    `),
    // avgDailyDistanceKm
    telemetryDb.execute(sql`
      SELECT AVG(daily_dist) as avg_dist FROM (
        SELECT date_trunc('day', start_time) as day, SUM(distance_km) as daily_dist
        FROM telemetry.trips
        WHERE start_time > NOW() - INTERVAL '7 days' AND distance_km IS NOT NULL
        GROUP BY date_trunc('day', start_time)
      ) sub
    `),
  ]);

  const totalFleet = Number(fleetResult[0]?.count || 0);
  const activeGps = Number(utilizationResult[0]?.active_count || 0);
  const offlineDevices = Math.max(0, totalFleet - activeGps);

  return {
    role: 'ceo' as const,
    kpis: {
      totalFleet,
      fleetUtilization: totalFleet > 0 ? Math.round((activeGps / totalFleet) * 100) : 0,
      avgFleetSOH: Number(Number(sohResult[0]?.avg_soh || 0).toFixed(1)),
      warrantyAtRisk: Number(warrantyResult[0]?.count || 0),
      activeAlerts: Number(alertsResult[0]?.count || 0),
    },
    warrantyRisk: {
      trend: (sohTrendResult as unknown as Array<{ date: string; avg_soh: number }>).map(r => ({
        date: String(r.date),
        avgSoh: Number(Number(r.avg_soh).toFixed(1)),
      })),
      atRiskDevices: (atRiskResult as unknown as Array<{ vehiclenos: string; soh: number; customer: string; dealer: string }>).map(r => ({
        vehiclenos: r.vehiclenos,
        soh: Number(Number(r.soh).toFixed(1)),
        customer: r.customer,
        dealer: r.dealer,
      })),
    },
    dealerPerformance: (dealerPerfResult as unknown as Array<{
      dealer_id: string; vehicles: number; avg_soh: number; active_alerts: number; utilization: number;
    }>).map(r => ({
      dealer_id: r.dealer_id,
      vehicles: Number(r.vehicles),
      avgSoh: Number(Number(r.avg_soh).toFixed(1)),
      activeAlerts: Number(r.active_alerts),
      utilization: Number(r.utilization),
    })),
    serviceMetrics: {
      fleetUptime: totalFleet > 0 ? Math.round((Number(uptimeResult[0]?.reporting || 0) / totalFleet) * 100) : 0,
      avgDailyDistanceKm: Number(Number(avgDistResult[0]?.avg_dist || 0).toFixed(1)),
      offlineDevices,
    },
  };
}

async function getDealerDashboard(dealerId: string | null) {
  const dealerFilter = dealerId
    ? sql`AND d.dealer_id = ${dealerId}`
    : sql``;
  const vehicleSubquery = dealerId
    ? sql`SELECT vehicle_number FROM device_battery_map WHERE dealer_id = ${dealerId}`
    : sql`SELECT vehicle_number FROM device_battery_map`;
  const deviceSubquery = dealerId
    ? sql`SELECT device_id FROM device_battery_map WHERE dealer_id = ${dealerId}`
    : sql`SELECT device_id FROM device_battery_map`;

  const [
    vehicleCountResult,
    avgSocResult,
    faultyResult,
    activeVehiclesResult,
    energyResult,
    bmsAlarmResult,
    cellImbalanceResult,
    recentAlertsResult,
    dailyDistResult,
    chargingResult,
    customerResult,
  ] = await Promise.all([
    // myVehicles
    telemetryDb.execute(sql`
      SELECT COUNT(*) as count FROM device_battery_map d
      WHERE d.is_active = TRUE ${dealerFilter}
    `),
    // avgSOCNow
    telemetryDb.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (vehiclenos) soc
        FROM telemetry.battery_readings
        WHERE vehiclenos IN (${vehicleSubquery}) AND soc IS NOT NULL
        ORDER BY vehiclenos, time DESC
      )
      SELECT AVG(soc) as avg_soc FROM latest
    `),
    // faultyDevices (alarm > 0 or SOH < 80)
    telemetryDb.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (vehiclenos) vehiclenos, alarm, soh
        FROM telemetry.battery_readings
        WHERE vehiclenos IN (${vehicleSubquery})
        ORDER BY vehiclenos, time DESC
      )
      SELECT COUNT(*) as count FROM latest
      WHERE (alarm IS NOT NULL AND alarm > 0) OR (soh IS NOT NULL AND soh < 80)
    `),
    // activeVehiclesToday (GPS in last 24h)
    telemetryDb.execute(sql`
      SELECT COUNT(DISTINCT device_id) as count
      FROM telemetry.gps_readings
      WHERE device_id IN (${deviceSubquery})
        AND time > NOW() - INTERVAL '24 hours'
    `),
    // energyConsumedKwh (last 24h)
    telemetryDb.execute(sql`
      SELECT COALESCE(SUM(energy_consumption), 0) as total
      FROM telemetry.energy_consumption
      WHERE vehicleno IN (${vehicleSubquery})
        AND start_time > NOW() - INTERVAL '24 hours'
    `),
    // bmsAlarms count
    telemetryDb.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (vehiclenos) alarm
        FROM telemetry.battery_readings
        WHERE vehiclenos IN (${vehicleSubquery})
        ORDER BY vehiclenos, time DESC
      )
      SELECT COUNT(*) as count FROM latest WHERE alarm IS NOT NULL AND alarm > 0
    `),
    // cellImbalanceWarnings
    telemetryDb.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (vehiclenos) maximum_cell_voltage, minimum_cell_voltage
        FROM telemetry.battery_readings
        WHERE vehiclenos IN (${vehicleSubquery})
          AND maximum_cell_voltage IS NOT NULL AND minimum_cell_voltage IS NOT NULL
        ORDER BY vehiclenos, time DESC
      )
      SELECT COUNT(*) as count FROM latest
      WHERE maximum_cell_voltage - minimum_cell_voltage > 0.1
    `),
    // recentAlerts
    telemetryDb.execute(sql`
      SELECT COUNT(*) as count FROM battery_alerts
      WHERE acknowledged = FALSE
        AND device_id IN (${deviceSubquery})
    `),
    // dailyDistance (last 7 days)
    telemetryDb.execute(sql`
      SELECT date_trunc('day', t.start_time)::date as date,
        AVG(t.distance_km) as avg_km,
        COUNT(DISTINCT t.device_id) as vehicle_count
      FROM telemetry.trips t
      WHERE t.device_id IN (${deviceSubquery})
        AND t.start_time > NOW() - INTERVAL '7 days'
        AND t.distance_km IS NOT NULL
      GROUP BY date_trunc('day', t.start_time)
      ORDER BY date ASC
    `),
    // chargingEvents (last 7 days — current > 0 sessions)
    telemetryDb.execute(sql`
      SELECT date_trunc('day', time)::date as date, COUNT(*) as count
      FROM telemetry.battery_readings
      WHERE vehiclenos IN (${vehicleSubquery})
        AND current > 0
        AND time > NOW() - INTERVAL '7 days'
      GROUP BY date_trunc('day', time)
      ORDER BY date ASC
    `),
    // customerRanking
    telemetryDb.execute(sql`
      WITH latest_br AS (
        SELECT DISTINCT ON (vehiclenos) vehiclenos, soh, soc, time as last_active
        FROM telemetry.battery_readings
        WHERE vehiclenos IN (${vehicleSubquery})
        ORDER BY vehiclenos, time DESC
      ),
      weekly_dist AS (
        SELECT device_id, SUM(distance_km) as dist
        FROM telemetry.trips
        WHERE device_id IN (${deviceSubquery})
          AND start_time > NOW() - INTERVAL '7 days'
          AND distance_km IS NOT NULL
        GROUP BY device_id
      )
      SELECT
        COALESCE(d.customer_name, 'Unknown') as customer,
        COALESCE(d.vehicle_number, d.device_id) as vehicle,
        COALESCE(lb.soh, 0) as soh,
        COALESCE(lb.soc, 0) as soc,
        lb.last_active,
        COALESCE(wd.dist, 0) as distance_this_week
      FROM device_battery_map d
      LEFT JOIN latest_br lb ON lb.vehiclenos = d.vehicle_number
      LEFT JOIN weekly_dist wd ON wd.device_id = d.device_id
      WHERE d.is_active = TRUE ${dealerFilter}
      ORDER BY lb.soh ASC NULLS LAST
      LIMIT 50
    `),
  ]);

  return {
    role: 'dealer' as const,
    kpis: {
      myVehicles: Number(vehicleCountResult[0]?.count || 0),
      avgSOCNow: Number(Number(avgSocResult[0]?.avg_soc || 0).toFixed(1)),
      faultyDevices: Number(faultyResult[0]?.count || 0),
      activeVehiclesToday: Number(activeVehiclesResult[0]?.count || 0),
      energyConsumedKwh: Number(Number(energyResult[0]?.total || 0).toFixed(1)),
    },
    faultSummary: {
      bmsAlarms: Number(bmsAlarmResult[0]?.count || 0),
      cellImbalanceWarnings: Number(cellImbalanceResult[0]?.count || 0),
      recentAlerts: Number(recentAlertsResult[0]?.count || 0),
    },
    usagePatterns: {
      dailyDistance: (dailyDistResult as unknown as Array<{ date: string; avg_km: number; vehicle_count: number }>).map(r => ({
        date: String(r.date),
        avgKm: Number(Number(r.avg_km).toFixed(1)),
        vehicleCount: Number(r.vehicle_count),
      })),
      chargingEvents: (chargingResult as unknown as Array<{ date: string; count: number }>).map(r => ({
        date: String(r.date),
        count: Number(r.count),
      })),
    },
    customerRanking: (customerResult as unknown as Array<{
      customer: string; vehicle: string; soh: number; soc: number; last_active: string; distance_this_week: number;
    }>).map(r => ({
      customer: r.customer,
      vehicle: r.vehicle,
      soh: Number(Number(r.soh).toFixed(1)),
      soc: Number(Number(r.soc).toFixed(1)),
      lastActive: r.last_active ? new Date(r.last_active).toISOString() : '',
      distanceThisWeek: Number(Number(r.distance_this_week).toFixed(1)),
    })),
  };
}
