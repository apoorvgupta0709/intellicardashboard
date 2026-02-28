"use client";

import { Card, Title, Text } from '@tremor/react';

/**
 * ChargeTimeline — Visual charge/discharge session blocks (#58)
 * Renders a horizontal timeline bar colored by current direction:
 *   - Green = Charging (positive current)
 *   - Red = Discharging (negative current)
 *   - Gray = Idle (near-zero current)
 */

interface TimelineReading {
    time: string;
    current: number;
}

interface ChargeTimelineProps {
    readings: TimelineReading[];
}

function getSessionColor(current: number): string {
    if (current > 1) return 'bg-emerald-400';    // Charging
    if (current < -1) return 'bg-rose-400';       // Discharging
    return 'bg-gray-300';                          // Idle
}

function getSessionLabel(current: number): string {
    if (current > 1) return 'Charging';
    if (current < -1) return 'Discharging';
    return 'Idle';
}

export default function ChargeTimeline({ readings }: ChargeTimelineProps) {
    if (!readings || readings.length === 0) {
        return (
            <Card>
                <Title>Charge / Discharge Timeline</Title>
                <div className="py-8 text-center text-gray-400">
                    No readings available for timeline visualization.
                </div>
            </Card>
        );
    }

    // Group consecutive readings by session type (charge/discharge/idle)
    const sessions: { type: string; color: string; startIndex: number; endIndex: number; avgCurrent: number }[] = [];
    let currentSession = {
        type: getSessionLabel(readings[0].current),
        color: getSessionColor(readings[0].current),
        startIndex: 0,
        endIndex: 0,
        totalCurrent: readings[0].current,
        count: 1,
    };

    for (let i = 1; i < readings.length; i++) {
        const label = getSessionLabel(readings[i].current);
        if (label === currentSession.type) {
            currentSession.endIndex = i;
            currentSession.totalCurrent += readings[i].current;
            currentSession.count++;
        } else {
            sessions.push({
                ...currentSession,
                avgCurrent: currentSession.totalCurrent / currentSession.count,
            });
            currentSession = {
                type: label,
                color: getSessionColor(readings[i].current),
                startIndex: i,
                endIndex: i,
                totalCurrent: readings[i].current,
                count: 1,
            };
        }
    }
    // Push last session
    sessions.push({
        ...currentSession,
        avgCurrent: currentSession.totalCurrent / currentSession.count,
    });

    const totalReadings = readings.length;

    // Format time for display
    const formatTime = (timeStr: string) => {
        try {
            return new Date(timeStr).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return timeStr;
        }
    };

    return (
        <Card>
            <Title>Charge / Discharge Timeline</Title>
            <Text className="mt-1">
                {readings.length > 0 && (
                    <>
                        {formatTime(readings[0].time)} → {formatTime(readings[readings.length - 1].time)}
                    </>
                )}
            </Text>

            {/* Timeline bar */}
            <div className="mt-4 flex h-8 rounded-lg overflow-hidden shadow-inner bg-gray-100">
                {sessions.map((session, idx) => {
                    const widthPercent = ((session.endIndex - session.startIndex + 1) / totalReadings) * 100;
                    if (widthPercent < 0.5) return null; // Skip tiny slivers
                    return (
                        <div
                            key={idx}
                            className={`${session.color} relative group transition-all hover:opacity-80`}
                            style={{ width: `${widthPercent}%`, minWidth: '2px' }}
                            title={`${session.type} (${Math.abs(session.avgCurrent).toFixed(1)}A)`}
                        >
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                    {session.type}: {Math.abs(session.avgCurrent).toFixed(1)}A avg
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <Text className="text-xs">Charging</Text>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <Text className="text-xs">Discharging</Text>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <Text className="text-xs">Idle</Text>
                </div>
            </div>
        </Card>
    );
}
