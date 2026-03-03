"use client";

import { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

type CustomerRow = {
  customer: string;
  vehicle: string;
  soh: number;
  soc: number;
  lastActive: string;
  distanceThisWeek: number;
};

type SortKey = keyof CustomerRow;

export default function CustomerRankingTable({ data }: { data: CustomerRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('soh');
  const [sortAsc, setSortAsc] = useState(true);

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
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc
      ? <ChevronUpIcon className="h-3 w-3 inline ml-0.5" />
      : <ChevronDownIcon className="h-3 w-3 inline ml-0.5" />;
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: 'customer', label: 'Customer' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'soh', label: 'SOH' },
    { key: 'soc', label: 'SOC' },
    { key: 'lastActive', label: 'Last Active' },
    { key: 'distanceThisWeek', label: 'Dist (7d)' },
  ];

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const now = new Date();
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.round(diffH / 24)}d ago`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Customer Battery Ranking</h3>
        <p className="text-xs text-slate-500 mt-0.5">Sorted by battery health — lowest first</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No customer data available</p>
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
              {sorted.map((row, i) => (
                <tr key={`${row.vehicle}-${i}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{row.customer}</td>
                  <td className="py-2.5 px-3 text-slate-600">{row.vehicle}</td>
                  <td className="py-2.5 px-3 tabular-nums">
                    <span className={row.soh < 80 ? 'text-red-600 font-semibold' : row.soh < 90 ? 'text-amber-600' : 'text-emerald-600'}>
                      {row.soh}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 tabular-nums">
                    <span className={row.soc < 20 ? 'text-red-600' : ''}>{row.soc}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{formatTime(row.lastActive)}</td>
                  <td className="py-2.5 px-3 tabular-nums">{row.distanceThisWeek} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
