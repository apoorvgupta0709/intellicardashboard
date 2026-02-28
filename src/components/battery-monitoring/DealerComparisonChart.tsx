"use client";

import { useEffect, useState } from 'react';
import { Card, Title, BarChart, Text } from '@tremor/react';

type DealerComparison = {
    dealer_id: string;
    total_devices: number;
    avg_soh: number | null;
    active_alerts_count: number;
};

export default function DealerComparisonChart() {
    const [data, setData] = useState<DealerComparison[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/telemetry/analytics/dealer-comparison')
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setData(json);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Format data for the chart. Exclude dealers with 0 mapped devices 
    // to avoid cluttering if unassigned is empty
    const chartData = data
        .filter(d => d.total_devices > 0)
        .map(d => ({
            Dealer: d.dealer_id.length > 20 ? d.dealer_id.substring(0, 20) + '...' : d.dealer_id,
            'Average SOH': d.avg_soh,
            'Active Alerts': d.active_alerts_count,
            'Total Devices': d.total_devices
        }));

    return (
        <Card>
            <Title>Fleet Health by Dealer</Title>
            <Text>Correlation of average battery State of Health (SOH) and active alert volume per dealer network.</Text>

            {loading ? (
                <div className="h-72 w-full flex items-center justify-center bg-gray-50 animate-pulse text-gray-400 mt-4 rounded">
                    Aggregating dealer statistics...
                </div>
            ) : chartData.length === 0 ? (
                <div className="h-72 w-full flex items-center justify-center border-dashed border-2 text-gray-400 mt-4 rounded">
                    No mapped dealers found to compare.
                </div>
            ) : (
                <BarChart
                    className="h-72 mt-4"
                    data={chartData}
                    index="Dealer"
                    categories={['Average SOH', 'Active Alerts']}
                    colors={['blue', 'amber']}
                    yAxisWidth={48}
                    valueFormatter={(number) => Intl.NumberFormat('us').format(number).toString()}
                />
            )}
        </Card>
    );
}
