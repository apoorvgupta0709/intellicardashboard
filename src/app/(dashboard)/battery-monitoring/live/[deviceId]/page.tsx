import dynamic from 'next/dynamic';
import BatteryMetricsChart from '@/components/battery-monitoring/BatteryMetricsChart';
import DeviceDetailsShell from '@/components/battery-monitoring/DeviceDetailsShell';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
// Dynamically import map for client-side Leaflet rendering
const DeviceGPSMap = dynamic(
    () => import('@/components/battery-monitoring/DeviceGPSMap'),
    { ssr: false, loading: () => <div className="h-[400px] bg-slate-100 animate-pulse rounded-lg border flex items-center justify-center text-gray-500">Loading Map Engine...</div> }
);

// We define the page params type correctly for Next.js App Router
export default async function LiveDeviceMonitoringPage({
    params
}: {
    params: Promise<{ deviceId: string }>
}) {
    const resolvedParams = await params;
    const { deviceId } = resolvedParams;

    // In Next.js App Router, it's often better to fetch baseline metadata directly in Server Components
    // But to keep consistency with the FleetOverview and our current components, we'll let the client components fetch their own data
    // Or we can fetch the critical initial metadata here and pass it down.
    // We'll use absolute URL fetching or rely on client-side fetching inside the shell.
    // For this pattern, we'll let `DeviceDetailsCard` do standard client-side fetching as a fallback,
    // but to prevent layout shift, let's fetch it serverside here if possible. 

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header & Breadcrumbs */}
            <div>
                <Link href="/battery-monitoring" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Back to Fleet Overview
                </Link>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                    Device Monitor: <span className="text-gray-500 font-medium">{deviceId}</span>
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Historical traces, live position, and detailed battery metrics.
                </p>
            </div>

            {/* Main Details Metadata Card */}
            {/* We pass device=null to force the client component to fetch its own data on mount for now */}
            <DeviceDetailsShell deviceId={deviceId} />

            {/* Analytics Row: Chart (2/3) and Map (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 h-[500px]">
                    <BatteryMetricsChart deviceId={deviceId} />
                </div>
                <div className="lg:col-span-1 h-[500px]">
                    <DeviceGPSMap deviceId={deviceId} />
                </div>
            </div>

        </div>
    );
}
// End of component
