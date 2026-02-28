import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

import DeviceGPSMapDynamic from '@/components/battery-monitoring/DeviceGPSMapDynamic';

export default async function LiveDeviceMonitoringPage({
  params,
}: {
  params: { deviceId: string };
}) {
  const { deviceId } = params;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/battery-monitoring"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Live Device Monitoring
          </h1>
          <p className="mt-1 text-sm text-gray-500">Device ID: {deviceId}</p>
        </div>
      </div>

      <DeviceGPSMapDynamic />
    </div>
  );
}