"use client";

import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const SOC_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

const mockData = [
    { range: '0-20%', count: 12 },
    { range: '21-40%', count: 24 },
    { range: '41-60%', count: 36 },
    { range: '61-80%', count: 28 },
    { range: '81-100%', count: 18 },
];

export default function SOCDistribution() {
    const [data] = useState(mockData);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 h-full flex flex-col">
            <div className="mb-1">
                <h3 className="text-sm font-bold text-slate-900">Fleet SOC Distribution</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                    Active vehicles by current state of charge
                </p>
            </div>
            <div className="flex-1 mt-4 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="range"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#f8fafc',
                                fontSize: '12px',
                            }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={800}>
                            {data.map((_, index) => (
                                <Cell key={index} fill={SOC_COLORS[index]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
