"use client";

import { useEffect, useState } from 'react';
import { Card, Title, AreaChart, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';

type Reading = {
    time: string;
    soc: number;
    voltage: number;
    temperature: number;
};

// Since timestamps can be bunched, we format them to a nice string for Tremor
const formatDataForChart = (data: Reading[]) => {
    return data.map(d => ({
        Time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        SOC: d.soc,
        Voltage: d.voltage,
        Temperature: d.temperature
    }));
};

type ChartData = { Time: string, SOC: number, Voltage: number, Temperature: number };

export default function BatteryMetricsChart({ deviceId }: { deviceId: string }) {
    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!deviceId) return;

        fetch(`/api/telemetry/devices/${deviceId}/readings?hours=24&limit=500`)
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) {
                    setData(formatDataForChart(json));
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [deviceId]);

    if (loading) {
        return <Card className="h-80 animate-pulse bg-gray-50 flex items-center justify-center text-gray-400">Loading metrics...</Card>;
    }

    return (
        <Card className="h-full">
            <Title>Battery Metrics (Last 24 Hours)</Title>

            <TabGroup className="mt-4">
                <TabList>
                    <Tab>State of Charge (%)</Tab>
                    <Tab>Voltage (V)</Tab>
                    <Tab>Temperature (°C)</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <div className="mt-6 h-72">
                            <AreaChart
                                data={data}
                                index="Time"
                                categories={['SOC']}
                                colors={['blue']}
                                yAxisWidth={40}
                                showAnimation
                                valueFormatter={(number) => `${number}%`}
                            />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="mt-6 h-72">
                            <AreaChart
                                data={data}
                                index="Time"
                                categories={['Voltage']}
                                colors={['indigo']}
                                yAxisWidth={40}
                                showAnimation
                                valueFormatter={(number) => `${number}V`}
                            />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="mt-6 h-72">
                            <AreaChart
                                data={data}
                                index="Time"
                                categories={['Temperature']}
                                colors={['orange']}
                                yAxisWidth={40}
                                showAnimation
                                valueFormatter={(number) => `${number}°C`}
                            />
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </Card>
    );
}
