import dynamic from 'next/dynamic';
import FleetKPICards from '@/components/battery-monitoring/FleetKPICards';
import SOCDistribution from '@/components/battery-monitoring/SOCDistribution';
import AlertFeed from '@/components/battery-monitoring/AlertFeed';

// We must dynamically import the map because Leaflet requires window
const FleetMap = dynamic(
    () => import('@/components/battery-monitoring/FleetMap'),
    { ssr: false, loading: () => <div className="h-[400px] lg:h-[600px] bg-slate-100 animate-pulse rounded-lg border flex items-center justify-center text-gray-500">Loading Map Engine...</div> }
);

export default function BatteryMonitoringDashboard() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Fleet Overview</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Real-time metrics, analytics, and operational tracking for your battery assets.
                </p>
            </div>

            {/* KPI Row */}
            <FleetKPICards />

            {/* Second Row: Map and Alerts/Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Map takes up 2 columns */}
                <div className="lg:col-span-2">
                    <FleetMap />
                </div>

                {/* Analytics & Alerts stacked in 1 column */}
                <div className="space-y-6 flex flex-col h-full">
                    <div className="flex-1 min-h-[350px]">
                        <SOCDistribution />
                    </div>
                    <div className="flex-1 min-h-[400px] lg:min-h-0">
                        <AlertFeed />
                    </div>
                </div>

            </div>

        </div>
    );
}
