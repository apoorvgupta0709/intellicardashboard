'use client';

import dynamic from 'next/dynamic';

const FleetMap = dynamic(
  () => import('@/components/battery-monitoring/FleetMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] lg:h-[600px] bg-slate-100 animate-pulse rounded-lg border flex items-center justify-center text-gray-500">
        Loading Map Engine...
      </div>
    ),
  }
);

export default function BatteryMonitoringClient() {
  return <FleetMap />;
}