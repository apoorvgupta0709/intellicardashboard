"use client";

import { useEffect, useState } from 'react';
import FleetMapDynamic from './FleetMapDynamic';
import WarrantyRiskPanel from './WarrantyRiskPanel';
import DealerPerformanceTable from './DealerPerformanceTable';
import ServiceMetricsRow from './ServiceMetricsRow';

type CEOData = {
  role: 'ceo';
  kpis: {
    totalFleet: number;
    fleetUtilization: number;
    avgFleetSOH: number;
    warrantyAtRisk: number;
    activeAlerts: number;
  };
  warrantyRisk: {
    trend: { date: string; avgSoh: number }[];
    atRiskDevices: { vehiclenos: string; soh: number; customer: string; dealer: string }[];
  };
  dealerPerformance: {
    dealer_id: string; vehicles: number; avgSoh: number; activeAlerts: number; utilization: number;
  }[];
  serviceMetrics: {
    fleetUptime: number;
    avgDailyDistanceKm: number;
    offlineDevices: number;
  };
};

const kpiConfig = [
  { key: 'totalFleet', label: 'Fleet Size', icon: '🚛', gradient: 'from-indigo-500 to-indigo-600' },
  { key: 'fleetUtilization', label: 'Utilization', icon: '📊', gradient: 'from-blue-500 to-blue-600', suffix: '%' },
  { key: 'avgFleetSOH', label: 'Avg SOH', icon: '💚', gradient: 'from-emerald-500 to-emerald-600', suffix: '%' },
  { key: 'warrantyAtRisk', label: 'Warranty At-Risk', icon: '⚠️', gradient: 'from-amber-500 to-orange-500', pulse: true },
  { key: 'activeAlerts', label: 'Active Alerts', icon: '🚨', gradient: 'from-rose-500 to-red-600', pulse: true },
];

export default function CEODashboard() {
  const [data, setData] = useState<CEOData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/telemetry/fleet/dashboard')
      .then((res) => res.json())
      .then((json) => { if (json.role === 'ceo') setData(json); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[500px] bg-slate-100 animate-pulse rounded-xl" />
          <div className="h-[500px] bg-slate-100 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-500 text-center py-12">Failed to load dashboard data.</p>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiConfig.map((kpi) => {
          const value = data.kpis[kpi.key as keyof CEOData['kpis']];
          const showPulse = kpi.pulse && Number(value) > 0;
          return (
            <div key={kpi.key} className="relative bg-white rounded-xl border border-slate-200 p-5 card-hover overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</span>
                <span className="text-lg">{kpi.icon}</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold text-slate-900 tabular-nums">{value}</span>
                {kpi.suffix && <span className="text-lg font-semibold text-slate-500">{kpi.suffix}</span>}
                {showPulse && (
                  <span className="ml-2 flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map + Warranty Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FleetMapDynamic />
        </div>
        <div>
          <WarrantyRiskPanel
            trend={data.warrantyRisk.trend}
            atRiskDevices={data.warrantyRisk.atRiskDevices}
          />
        </div>
      </div>

      {/* Dealer Performance Table */}
      <DealerPerformanceTable data={data.dealerPerformance} />

      {/* Service Metrics Row */}
      <ServiceMetricsRow data={data.serviceMetrics} />
    </div>
  );
}
