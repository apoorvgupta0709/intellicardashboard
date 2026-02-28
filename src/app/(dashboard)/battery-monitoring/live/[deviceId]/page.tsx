import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import DeviceDetailsShell from '@/components/battery-monitoring/DeviceDetailsShell';
import BatteryMetricsChart from '@/components/battery-monitoring/BatteryMetricsChart';
import DeviceGPSMapDynamic from '@/components/battery-monitoring/DeviceGPSMapDynamic';

export default async function LiveDeviceMonitoringPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/battery-monitoring"
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Live Device Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Device: <span className="font-mono font-semibold text-slate-700">{deviceId}</span>
          </p>
        </div>
        <span className="ml-auto flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
          Live Updates
        </span>
      </div>

      {/* Device Details Card */}
      <DeviceDetailsShell deviceId={deviceId} />

      {/* Charts + Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BatteryMetricsChart deviceId={deviceId} />
        <DeviceGPSMapDynamic deviceId={deviceId} />
      </div>
    </div>
  );
}