"use client";

import { useEffect, useState } from 'react';
import {
    ExclamationTriangleIcon,
    ExclamationCircleIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/solid';

type Alert = {
    id: string;
    device_id: string;
    alert_type: string;
    severity: string;
    message: string;
    created_at: string;
    vehicle_number: string | null;
};

const severityConfig: Record<string, { icon: typeof ExclamationTriangleIcon; color: string; bg: string; badge: string }> = {
    critical: {
        icon: ExclamationTriangleIcon,
        color: 'text-red-500',
        bg: 'bg-red-50 border-red-100',
        badge: 'bg-red-100 text-red-700',
    },
    warning: {
        icon: ExclamationCircleIcon,
        color: 'text-amber-500',
        bg: 'bg-amber-50 border-amber-100',
        badge: 'bg-amber-100 text-amber-700',
    },
    info: {
        icon: InformationCircleIcon,
        color: 'text-blue-500',
        bg: 'bg-blue-50 border-blue-100',
        badge: 'bg-blue-100 text-blue-700',
    },
};

export default function AlertFeed() {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        fetch('/api/telemetry/alerts?limit=10')
            .then((res) => res.json())
            .then((json) => {
                if (Array.isArray(json)) setAlerts(json);
            })
            .catch(console.error);
    }, []);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Active Alerts</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Recent critical and warning events
                    </p>
                </div>
                {alerts.length > 0 && (
                    <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {alerts.length}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                        <ExclamationCircleIcon className="h-10 w-10 text-slate-300 mb-2" />
                        <span className="text-sm font-medium">No active alerts</span>
                        <span className="text-xs text-slate-400 mt-1">All systems operating normally</span>
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const config = severityConfig[alert.severity] || severityConfig.info;
                        const Icon = config.icon;
                        return (
                            <div
                                key={alert.id}
                                className={`p-3 border rounded-lg flex items-start space-x-3 transition-colors ${config.bg}`}
                            >
                                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-sm font-semibold text-slate-900 truncate">
                                            {alert.vehicle_number || alert.device_id}
                                        </span>
                                        <span className="text-[10px] text-slate-400 ml-2 whitespace-nowrap">
                                            {new Date(alert.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-2">{alert.message}</p>
                                    <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
                                        {alert.alert_type.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
