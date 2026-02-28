"use client";

import { useEffect, useState } from 'react';
import { Card, Text, Metric, Flex, BadgeDelta, Grid } from '@tremor/react';

export default function FleetKPICards() {
    const [data, setData] = useState({
        activeBatteries: 0,
        avgSoh: "0.0",
        chargingCount: 0,
        activeAlerts: 0
    });

    useEffect(() => {
        fetch('/api/telemetry/fleet/overview')
            .then(res => res.json())
            .then(json => {
                if (!json.error) setData(json);
            })
            .catch(console.error);
    }, []);

    return (
        <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
            <Card decoration="top" decorationColor="blue">
                <Text>Active Batteries</Text>
                <Metric>{data.activeBatteries}</Metric>
            </Card>
            <Card decoration="top" decorationColor="green">
                <Flex alignItems="baseline" className="justify-start space-x-2">
                    <Text>Fleet Avg SOH</Text>
                </Flex>
                <Flex alignItems="baseline" className="justify-start space-x-4">
                    <Metric>{data.avgSoh}%</Metric>
                    {Number(data.avgSoh) < 80 ? (
                        <BadgeDelta deltaType="moderateDecrease">Degrading</BadgeDelta>
                    ) : (
                        <BadgeDelta deltaType="moderateIncrease">Healthy</BadgeDelta>
                    )}
                </Flex>
            </Card>
            <Card decoration="top" decorationColor="amber">
                <Text>Charging Right Now</Text>
                <Metric>{data.chargingCount}</Metric>
            </Card>
            <Card decoration="top" decorationColor="rose">
                <Text>Active Alerts</Text>
                <Flex alignItems="center" className="justify-between">
                    <Metric>{data.activeAlerts}</Metric>
                    {data.activeAlerts > 0 && (
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </Flex>
            </Card>
        </Grid>
    );
}
