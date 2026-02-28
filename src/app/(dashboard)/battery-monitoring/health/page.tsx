"use client";

import { useState } from 'react';
import SOHDegradationChart from '@/components/battery-monitoring/SOHDegradationChart';
import WarrantyRiskTable from '@/components/battery-monitoring/WarrantyRiskTable';
import DealerComparisonChart from '@/components/battery-monitoring/DealerComparisonChart';
import TripHistoryTable from '@/components/battery-monitoring/TripHistoryTable';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Button } from '@tremor/react';

/**
 * Battery Health & Analytics page — enhanced with Export (#96)
 */
export default function BatteryHealthOverviewPage() {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            // Fetch warranty data for export
            const warrantyRes = await fetch('/api/telemetry/analytics/warranty');
            const warrantyData = await warrantyRes.json();

            // Fetch dealer comparison data
            const dealerRes = await fetch('/api/telemetry/analytics/dealer-comparison');
            const dealerData = await dealerRes.json();

            // Build CSV content
            let csv = 'Battery Health Report\n';
            csv += `Generated: ${new Date().toLocaleString()}\n\n`;

            // Warranty risk section
            csv += 'WARRANTY RISK BATTERIES\n';
            if (Array.isArray(warrantyData) && warrantyData.length > 0) {
                const headers = Object.keys(warrantyData[0]);
                csv += headers.join(',') + '\n';
                warrantyData.forEach((row: Record<string, unknown>) => {
                    csv += headers.map(h => {
                        const val = row[h];
                        const str = String(val ?? '');
                        return str.includes(',') ? `"${str}"` : str;
                    }).join(',') + '\n';
                });
            } else {
                csv += 'No warranty risk batteries found.\n';
            }

            csv += '\nDEALER COMPARISON\n';
            if (Array.isArray(dealerData) && dealerData.length > 0) {
                const headers = Object.keys(dealerData[0]);
                csv += headers.join(',') + '\n';
                dealerData.forEach((row: Record<string, unknown>) => {
                    csv += headers.map(h => {
                        const val = row[h];
                        const str = String(val ?? '');
                        return str.includes(',') ? `"${str}"` : str;
                    }).join(',') + '\n';
                });
            } else {
                csv += 'No dealer comparison data available.\n';
            }

            // Trigger download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `battery-health-report-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export report.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header & Breadcrumbs */}
            <div className="flex justify-between items-center">
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
                <Button
                    icon={ArrowDownTrayIcon}
                    variant="secondary"
                    onClick={handleExport}
                    loading={exporting}
                >
                    Export Report (CSV)
                </Button>
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
