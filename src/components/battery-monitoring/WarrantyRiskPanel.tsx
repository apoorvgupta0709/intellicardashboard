"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ShieldExclamationIcon } from '@heroicons/react/24/solid';

type WarrantyRiskProps = {
  trend: { date: string; avgSoh: number }[];
  atRiskDevices: { vehiclenos: string; soh: number; customer: string; dealer: string }[];
};

export default function WarrantyRiskPanel({ trend, atRiskDevices }: WarrantyRiskProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Warranty Risk</h3>
          <p className="text-xs text-slate-500 mt-0.5">SOH degradation trend & at-risk devices</p>
        </div>
        {atRiskDevices.length > 0 && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {atRiskDevices.length} at risk
          </span>
        )}
      </div>

      {/* SOH Trend Chart */}
      {trend.length > 0 && (
        <div className="h-[160px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sohGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[60, 100]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                formatter={(v) => [`${v}%`, 'Avg SOH']}
              />
              <Area type="monotone" dataKey="avgSoh" stroke="#6366f1" fill="url(#sohGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* At-risk device list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {atRiskDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
            <ShieldExclamationIcon className="h-8 w-8 text-slate-300 mb-2" />
            <span className="text-sm font-medium">No warranty risks</span>
            <span className="text-xs mt-1">All devices above 80% SOH</span>
          </div>
        ) : (
          atRiskDevices.map((d) => (
            <div key={d.vehiclenos} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{d.vehiclenos}</p>
                <p className="text-xs text-slate-500 truncate">{d.customer || d.dealer}</p>
              </div>
              <span className={`text-sm font-bold tabular-nums ${d.soh < 70 ? 'text-red-600' : 'text-amber-600'}`}>
                {d.soh}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
