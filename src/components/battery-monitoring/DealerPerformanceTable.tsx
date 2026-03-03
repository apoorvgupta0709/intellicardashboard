"use client";

import { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

type DealerRow = {
  dealer_id: string;
  vehicles: number;
  avgSoh: number;
  activeAlerts: number;
  utilization: number;
};

type SortKey = keyof DealerRow;

export default function DealerPerformanceTable({ data }: { data: DealerRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('vehicles');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortAsc ? av - bv : bv - av;
    }
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc
      ? <ChevronUpIcon className="h-3 w-3 inline ml-0.5" />
      : <ChevronDownIcon className="h-3 w-3 inline ml-0.5" />;
  };

  const columns: { key: SortKey; label: string; suffix?: string }[] = [
    { key: 'dealer_id', label: 'Dealer' },
    { key: 'vehicles', label: 'Vehicles' },
    { key: 'avgSoh', label: 'Avg SOH', suffix: '%' },
    { key: 'activeAlerts', label: 'Alerts' },
    { key: 'utilization', label: 'Utilization', suffix: '%' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Dealer Performance</h3>
        <p className="text-xs text-slate-500 mt-0.5">Per-dealer fleet health comparison</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No dealer data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none"
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.dealer_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{row.dealer_id}</td>
                  <td className="py-2.5 px-3 tabular-nums">{row.vehicles}</td>
                  <td className="py-2.5 px-3 tabular-nums">
                    <span className={row.avgSoh < 80 ? 'text-red-600 font-semibold' : ''}>{row.avgSoh}%</span>
                  </td>
                  <td className="py-2.5 px-3 tabular-nums">
                    {row.activeAlerts > 0 ? (
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-semibold">{row.activeAlerts}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums">{row.utilization}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
