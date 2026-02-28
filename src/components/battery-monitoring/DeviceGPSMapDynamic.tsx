'use client';

import dynamic from 'next/dynamic';

const DeviceGPSMap = dynamic(
  () => import('@/components/battery-monitoring/DeviceGPSMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-slate-100 animate-pulse rounded-lg border flex items-center justify-center text-gray-500">
        Loading Map Engine...
      </div>
    ),
  }
);

export default function DeviceGPSMapDynamic({ deviceId }: { deviceId: string }) {
  return <DeviceGPSMap deviceId={deviceId} />;
}