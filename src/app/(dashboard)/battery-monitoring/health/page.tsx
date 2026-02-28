import SOHDegradationChart from '@/components/battery-monitoring/SOHDegradationChart';
import TripHistoryTable from '@/components/battery-monitoring/TripHistoryTable';
import WarrantyRiskTable from '@/components/battery-monitoring/WarrantyRiskTable';
import DealerComparisonChart from '@/components/battery-monitoring/DealerComparisonChart';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function BatteryHealthOverviewPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header & Breadcrumbs */}
            <div>
                <Link href="/battery-monitoring" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Back to Fleet Overview
                </Link>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                    Battery Health & Analytics
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Track long-term degradation vectors and review recent active trip summaries across the fleet.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <SOHDegradationChart />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DealerComparisonChart />
                    <WarrantyRiskTable />
                </div>

                <TripHistoryTable />
            </div>

        </div>
    );
}
