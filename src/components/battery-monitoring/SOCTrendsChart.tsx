"use client";

import { useEffect, useState } from 'react';
import { Card, Title, Text } from '@tremor/react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    ComposedChart,
} from 'recharts';

/**
 * SOCTrendsChart — Fleet-wide daily SOC trends over time (#87)
 * Fetches data from /api/telemetry/analytics/soc-trends
 * Shows avg SOC as a line with min/max as a shaded area band.
 */

interface SOCDataPoint {
    date: string;
    avg_soc: number;
    min_soc: number;
    max_soc: number;
    total_readings: number;
}

interface SOCTrendsChartProps {
    days?: number;
}

export default function SOCTrendsChart({ days = 30 }: SOCTrendsChartProps) {
    const [data, setData] = useState<SOCDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/telemetry/analytics/soc-trends?days=${days}`)
            .then((res) => res.json())
            .then((json) => {
                if (Array.isArray(json)) {
                    setData(
                        json.map((d: Record<string, unknown>) => ({
                            date: String(d.date),
                            avg_soc: Number(d.avg_soc) || 0,
                            min_soc: Number(d.min_soc) || 0,
                            max_soc: Number(d.max_soc) || 0,
                            total_readings: Number(d.total_readings) || 0,
                        }))
                    );
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [days]);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <Card>
            <Title>Fleet SOC Trends</Title>
            <Text className="mt-1">
                Average State of Charge across fleet over the last {days} days
            </Text>

            {loading ? (
                <div className="h-72 flex items-center justify-center text-gray-400 animate-pulse">
                    Loading SOC trends...
                </div>
            ) : data.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-gray-400">
                    No SOC trend data available yet.
                </div>
            ) : (
                <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                                tickFormatter={(v: number) => `${v}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any) => [`${value}%`]}
                                labelFormatter={(label) => formatDate(String(label))}
                            />
                            {/* Shaded area for min-max range */}
                            <Area
                                type="monotone"
                                dataKey="max_soc"
                                fill="#dbeafe"
                                stroke="none"
                                fillOpacity={0.5}
                            />
                            <Area
                                type="monotone"
                                dataKey="min_soc"
                                fill="#ffffff"
                                stroke="none"
                                fillOpacity={1}
                            />
                            {/* Average SOC line */}
                            <Line
                                type="monotone"
                                dataKey="avg_soc"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 4, fill: '#3b82f6' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}
