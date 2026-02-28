"use client";

import { useEffect, useState } from 'react';
import { Card, Title, Subtitle, Text, Badge } from '@tremor/react';
import { ExclamationTriangleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

type Alert = {
    id: string;
    device_id: string;
    alert_type: string;
    severity: string;
    message: string;
    created_at: string;
    vehicle_number: string | null;
};

export default function AlertFeed() {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        fetch('/api/telemetry/alerts?limit=10')
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setAlerts(json);
            })
            .catch(console.error);
    }, []);

    return (
        <Card className="h-full flex flex-col">
            <Title>Active Alerts</Title>
            <Subtitle>Recent critical and warning battery events</Subtitle>

            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-2">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <span className="text-sm">No active alerts found.</span>
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className="p-3 border rounded-lg bg-gray-50 flex items-start space-x-3">
                            {alert.severity === 'critical' ? (
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                            ) : (
                                <ExclamationCircleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <Text className="font-semibold text-gray-900 truncate">
                                        {alert.vehicle_number || alert.device_id}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                        {new Date(alert.created_at).toLocaleTimeString()}
                                    </Text>
                                </div>
                                <Text className="text-sm text-gray-600 line-clamp-2">{alert.message}</Text>
                                <div className="mt-2">
                                    <Badge color={alert.severity === 'critical' ? 'red' : 'amber'} size="xs">
                                        {alert.alert_type}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
