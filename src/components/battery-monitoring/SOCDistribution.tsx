"use client";

import { useEffect, useState } from 'react';
import { Card, Title, BarChart, Subtitle } from '@tremor/react';

// For MVP, we'll bucket SOC dynamically or mock it if DB empty
const mockData = [
    { range: '0-20%', count: 12 },
    { range: '21-40%', count: 24 },
    { range: '41-60%', count: 36 },
    { range: '61-80%', count: 28 },
    { range: '81-100%', count: 18 }
];

export default function SOCDistribution() {
    const [data] = useState(mockData);

    useEffect(() => {
        // Ideally fetches from an endpoint that groups SOC, e.g. /api/telemetry/fleet/soc-distribution
        // For now we use the mock structural data
    }, []);

    return (
        <Card className="h-full flex flex-col">
            <Title>Fleet SOC Distribution</Title>
            <Subtitle>Number of active vehicles organized by their current state of charge.</Subtitle>
            <div className="flex-1 mt-6 min-h-[300px]">
                <BarChart
                    data={data}
                    index="range"
                    categories={['count']}
                    colors={['blue']}
                    yAxisWidth={48}
                    showAnimation
                />
            </div>
        </Card>
    );
}
