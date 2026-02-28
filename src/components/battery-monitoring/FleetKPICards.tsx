"use client";

import { useEffect, useState } from 'react';

type KPIData = {
    activeBatteries: number;
    avgSoh: string;
    chargingCount: number;
    activeAlerts: number;
    offlineCount: number;
};

const kpiConfig = [
    {
        key: 'activeBatteries',
        label: 'Active Batteries',
        icon: '🔋',
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
    },
    {
        key: 'avgSoh',
        label: 'Fleet Avg SOH',
        icon: '💚',
        gradient: 'from-emerald-500 to-emerald-600',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        suffix: '%',
    },
    {
        key: 'chargingCount',
        label: 'Charging Now',
        icon: '⚡',
        gradient: 'from-amber-500 to-orange-500',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
    },
    {
        key: 'offlineCount',
        label: 'Devices Offline',
        icon: '📡',
        gradient: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
    },
    {
        key: 'activeAlerts',
        label: 'Active Alerts',
        icon: '🚨',
        gradient: 'from-rose-500 to-red-600',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        pulse: true,
    },
];

export default function FleetKPICards() {
    const [data, setData] = useState<KPIData>({
        activeBatteries: 0,
        avgSoh: "0.0",
        chargingCount: 0,
        activeAlerts: 0,
        offlineCount: 0,
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/telemetry/fleet/overview').then((res) => res.json()),
            fetch('/api/telemetry/devices/status').then((res) => res.json()),
        ])
            .then(([overviewJson, statusJson]) => {
                let offline = 0;
                if (Array.isArray(statusJson)) {
                    offline = statusJson.filter((s: { status: string }) => s.status === 'Offline').length;
                }
                if (!overviewJson.error) {
                    setData({ ...overviewJson, offlineCount: offline });
                }
            })
            .catch(console.error);
    }, []);

    const getValue = (key: string) => {
        return (data as Record<string, string | number>)[key] ?? 0;
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpiConfig.map((kpi) => {
                const value = getValue(kpi.key);
                const showPulse = kpi.pulse && Number(value) > 0;

                return (
                    <div
                        key={kpi.key}
                        className="relative bg-white rounded-xl border border-slate-200 p-5 card-hover overflow-hidden"
                    >
                        {/* Top gradient accent */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />

                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {kpi.label}
                            </span>
                            <span className="text-lg">{kpi.icon}</span>
                        </div>

                        <div className="flex items-baseline space-x-1">
                            <span className="text-3xl font-bold text-slate-900 tabular-nums">
                                {value}
                            </span>
                            {kpi.suffix && (
                                <span className="text-lg font-semibold text-slate-500">{kpi.suffix}</span>
                            )}
                            {showPulse && (
                                <span className="ml-2 flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
