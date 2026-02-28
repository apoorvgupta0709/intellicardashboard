import AlertsTable from '@/components/battery-monitoring/AlertsTable';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AlertsMonitoringPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header & Breadcrumbs */}
            <div>
                <Link href="/battery-monitoring" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Back to Fleet Overview
                </Link>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                    Alerts & Event Rules
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Review automated battery anomalies, triage warnings, and acknowledge critical incidents.
                </p>
            </div>

            <AlertsTable />

        </div>
    );
}
