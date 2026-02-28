"use client";

import { Card, Text, Metric, Title, BadgeDelta, Flex, Grid } from '@tremor/react';
import { BoltIcon, MapPinIcon } from '@heroicons/react/24/solid';

type DeviceMetadata = {
    device_id: string;
    vehicle_number: string | null;
    customer_name: string | null;
    latest_battery: {
        soc: number;
        soh: number;
        voltage: number;
        current: number;
        temperature: number;
        time: string;
    } | null;
    latest_gps: {
        latitude: number;
        longitude: number;
        speed: number;
        time: string;
    } | null;
};

export default function DeviceDetailsCard({ device }: { device: DeviceMetadata | null }) {
    if (!device) {
        return (
            <Card className="animate-pulse flex items-center justify-center p-6 min-h-[150px]">
                <Text className="text-gray-400">Loading device details...</Text>
            </Card>
        );
    }

    const { latest_battery, latest_gps } = device;

    return (
        <Card className="bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <Flex alignItems="start" className="justify-between border-b pb-4 mb-4">
                <div>
                    <Title className="text-2xl font-bold flex items-center space-x-2">
                        <span>{device.vehicle_number || device.device_id}</span>
                        {latest_battery && latest_battery.current > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <BoltIcon className="w-3 h-3 mr-1" />
                                Charging
                            </span>
                        )}
                    </Title>
                    <Text className="text-gray-500 mt-1">ID: {device.device_id} {device.customer_name ? `• ${device.customer_name}` : ''}</Text>
                </div>

                {latest_gps && (
                    <div className="text-right text-sm text-gray-500 flex flex-col items-end">
                        <Flex className="space-x-1 items-center text-gray-700 font-medium">
                            <MapPinIcon className="w-4 h-4 text-gray-400" />
                            <span>{latest_gps.speed} km/h</span>
                        </Flex>
                        <span className="mt-1 text-xs">Last seen: {new Date(latest_gps.time).toLocaleTimeString()}</span>
                    </div>
                )}
            </Flex>

            {latest_battery ? (
                <Grid numItemsSm={2} numItemsLg={4} className="gap-6 mt-4">
                    <div>
                        <Text>State of Charge</Text>
                        <Flex alignItems="baseline" className="justify-start space-x-2 mt-1">
                            <Metric className="text-3xl">{latest_battery.soc}%</Metric>
                            <BadgeDelta deltaType={latest_battery.soc < 20 ? 'decrease' : 'unchanged'} size="xs">
                                {latest_battery.soc < 20 ? 'Low' : 'OK'}
                            </BadgeDelta>
                        </Flex>
                    </div>
                    <div>
                        <Text>Health (SOH)</Text>
                        <Metric className="text-3xl mt-1">{latest_battery.soh}%</Metric>
                    </div>
                    <div>
                        <Text>Voltage / Current</Text>
                        <Metric className="text-2xl mt-1">{latest_battery.voltage}V</Metric>
                        <Text className="text-gray-500">{latest_battery.current}A</Text>
                    </div>
                    <div>
                        <Text>Temperature</Text>
                        <Flex alignItems="baseline" className="justify-start space-x-2 mt-1">
                            <Metric className="text-3xl">{latest_battery.temperature}°C</Metric>
                            <BadgeDelta deltaType={latest_battery.temperature > 45 ? 'increase' : 'unchanged'} size="xs">
                                {latest_battery.temperature > 45 ? 'Hot' : 'Normal'}
                            </BadgeDelta>
                        </Flex>
                    </div>
                </Grid>
            ) : (
                <div className="py-4 text-center text-gray-500">No recent battery telemetry found.</div>
            )}
        </Card>
    );
}
