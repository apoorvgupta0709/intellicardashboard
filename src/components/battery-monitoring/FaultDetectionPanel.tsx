"use client";

import {
  ExclamationTriangleIcon,
  BoltIcon,
  BellAlertIcon,
} from '@heroicons/react/24/solid';

type FaultSummary = {
  bmsAlarms: number;
  cellImbalanceWarnings: number;
  recentAlerts: number;
};

export default function FaultDetectionPanel({ data }: { data: FaultSummary }) {
  const items = [
    {
      label: 'BMS Alarms',
      value: data.bmsAlarms,
      icon: ExclamationTriangleIcon,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: 'Cell Imbalance',
      value: data.cellImbalanceWarnings,
      icon: BoltIcon,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Unacked Alerts',
      value: data.recentAlerts,
      icon: BellAlertIcon,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
  ];

  const totalFaults = data.bmsAlarms + data.cellImbalanceWarnings + data.recentAlerts;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Fault Detection</h3>
          <p className="text-xs text-slate-500 mt-0.5">BMS alarms & cell health issues</p>
        </div>
        {totalFaults > 0 && (
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {totalFaults} issues
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg ${item.bg}`}>
              <div className="flex items-center space-x-3">
                <Icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
              <span className="text-xl font-bold text-slate-900 tabular-nums">{item.value}</span>
            </div>
          );
        })}
      </div>

      {totalFaults === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-emerald-600 font-medium">All systems healthy</p>
        </div>
      )}
    </div>
  );
}
