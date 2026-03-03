"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type UsagePatterns = {
  dailyDistance: { date: string; avgKm: number; vehicleCount: number }[];
  chargingEvents: { date: string; count: number }[];
};

export default function UsagePatternCharts({ data }: { data: UsagePatterns }) {
  const formatDate = (d: string | number) =>
    new Date(String(d)).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: 'none',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '12px',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Usage Patterns</h3>
        <p className="text-xs text-slate-500 mt-0.5">Last 7 days driving and charging activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Distance */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Avg Daily Distance (km)</p>
          <div className="h-[220px]">
            {data.dailyDistance.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No trip data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyDistance} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatDate(String(v))} />
                  <Bar dataKey="avgKm" name="Avg km" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charging Events */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Charging Events</p>
          <div className="h-[220px]">
            {data.chargingEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No charging data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chargingEvents} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatDate(String(v))} />
                  <Line type="monotone" dataKey="count" name="Events" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
