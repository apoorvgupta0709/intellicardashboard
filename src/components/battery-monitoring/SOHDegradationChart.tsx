"use client";

import { useEffect, useState } from 'react';
import { Card, Title, LineChart, Select, SelectItem } from '@tremor/react';

type SOHDataPoint = {
    Date: string;
    'Avg SOH': string;
    'Min SOH': string;
    'Max SOH': string;
};

export default function SOHDegradationChart() {
    const [data, setData] = useState<SOHDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState("30");

    useEffect(() => {
        fetch(`/api/telemetry/health/degradation?days=${days}`)
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setData(json);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [days]);

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <Title>Fleet Average State of Health (SOH) Trend</Title>
                <div className="w-48">
                    <Select value={days} onValueChange={(val) => { setLoading(true); setDays(val); }}>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 3 Months</SelectItem>
                        <SelectItem value="180">Last 6 Months</SelectItem>
                        <SelectItem value="365">Last Year</SelectItem>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="h-72 w-full flex items-center justify-center bg-gray-50 animate-pulse text-gray-400 mt-4 rounded">
                    Aggregating fleet data...
                </div>
            ) : data.length === 0 ? (
                <div className="h-72 w-full flex items-center justify-center border-dashed border-2 text-gray-400 mt-4 rounded">
                    No historical SOH data found.
                </div>
            ) : (
                <LineChart
                    className="h-72 mt-4"
                    data={data}
                    index="Date"
                    categories={['Avg SOH', 'Min SOH', 'Max SOH']}
                    colors={['blue', 'red', 'emerald']}
                    yAxisWidth={40}
                    valueFormatter={(number) => `${number}%`}
                    showLegend={true}
                    curveType="monotone"
                />
            )}
        </Card>
    );
}
