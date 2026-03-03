"use client";

import { useAuth } from '@/lib/auth/AuthContext';
import CEODashboard from '@/components/battery-monitoring/CEODashboard';
import DealerDashboard from '@/components/battery-monitoring/DealerDashboard';

export default function BatteryMonitoringDashboard() {
  const { role } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          {role === 'ceo' ? 'Fleet Command Center' : 'Operations Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {role === 'ceo'
            ? 'Strategic fleet overview — demand growth, warranty risk, and dealer performance.'
            : 'Operational monitoring — device health, usage patterns, and customer insights.'}
        </p>
      </div>

      {role === 'ceo' ? <CEODashboard /> : <DealerDashboard />}
    </div>
  );
}
