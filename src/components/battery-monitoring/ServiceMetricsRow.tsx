"use client";

type ServiceMetrics = {
  fleetUptime: number;
  avgDailyDistanceKm: number;
  offlineDevices: number;
};

const metrics = [
  {
    key: 'fleetUptime' as const,
    label: 'Fleet Uptime (24h)',
    suffix: '%',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    key: 'avgDailyDistanceKm' as const,
    label: 'Avg Daily Distance',
    suffix: ' km',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    key: 'offlineDevices' as const,
    label: 'Offline Devices',
    suffix: '',
    gradient: 'from-slate-500 to-slate-600',
  },
];

export default function ServiceMetricsRow({ data }: { data: ServiceMetrics }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Service Delivery</h3>
        <p className="text-xs text-slate-500 mt-0.5">Fleet availability and usage metrics</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.key} className="relative bg-slate-50 rounded-lg p-4 overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.gradient}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {data[m.key]}{m.suffix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
