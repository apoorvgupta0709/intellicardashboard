"use client";

import { useEffect, useState } from 'react';
import FleetMapDynamic from './FleetMapDynamic';
import FaultDetectionPanel from './FaultDetectionPanel';
import UsagePatternCharts from './UsagePatternCharts';
import CustomerRankingTable from './CustomerRankingTable';

type DealerData = {
  role: 'dealer';
  kpis: {
    myVehicles: number;
    avgSOCNow: number;
    faultyDevices: number;
    activeVehiclesToday: number;
    energyConsumedKwh: number;
  };
  faultSummary: {
    bmsAlarms: number;
    cellImbalanceWarnings: number;
    recentAlerts: number;
  };
  usagePatterns: {
    dailyDistance: { date: string; avgKm: number; vehicleCount: number }[];
    chargingEvents: { date: string; count: number }[];
  };
  customerRanking: {
    customer: string; vehicle: string; soh: number; soc: number; lastActive: string; distanceThisWeek: number;
  }[];
};

const kpiConfig = [
  { key: 'myVehicles', label: 'My Vehicles', icon: '🔋', gradient: 'from-teal-500 to-teal-600' },
  { key: 'avgSOCNow', label: 'Avg SOC', icon: '⚡', gradient: 'from-emerald-500 to-emerald-600', suffix: '%' },
  { key: 'faultyDevices', label: 'Faulty Devices', icon: '⚠️', gradient: 'from-amber-500 to-orange-500', pulse: true },
  { key: 'activeVehiclesToday', label: 'Active Today', icon: '📍', gradient: 'from-cyan-500 to-cyan-600' },
  { key: 'energyConsumedKwh', label: 'Energy (24h)', icon: '🔌', gradient: 'from-violet-500 to-violet-600', suffix: ' kWh' },
];

export default function DealerDashboard() {
  const [data, setData] = useState<DealerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/telemetry/fleet/dashboard')
      .then((res) => res.json())
      .then((json) => { if (json.role === 'dealer') setData(json); })
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
          const value = data.kpis[kpi.key as keyof DealerData['kpis']];
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

      {/* Map + Fault Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FleetMapDynamic />
        </div>
        <div>
          <FaultDetectionPanel data={data.faultSummary} />
        </div>
      </div>

      {/* Usage Patterns */}
      <UsagePatternCharts data={data.usagePatterns} />

      {/* Customer Ranking */}
      <CustomerRankingTable data={data.customerRanking} />
    </div>
  );
}
