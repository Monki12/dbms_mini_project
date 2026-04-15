import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Users, Stethoscope, Calendar, TrendingUp, Activity, BarChart2, IndianRupee } from 'lucide-react';

interface Stats {
  total_patients: number;
  total_doctors: number;
  pending_appointments: number;
  total_revenue: number;
}

interface RevenueRow {
  department: string;
  revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/admin/dashboard-stats'),
      apiClient.get('/api/admin/revenue-report'),
    ])
      .then(([statsRes, revRes]) => {
        setStats(statsRes.data.data);
        setRevenue(revRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = Math.max(...revenue.map((r) => Number(r.revenue)), 1);

  const statCards = stats
    ? [
        { label: 'Total Patients', value: stats.total_patients, icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100' },
        { label: 'Active Doctors', value: stats.total_doctors, icon: Stethoscope, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        { label: 'Pending Appointments', value: stats.pending_appointments, icon: Calendar, color: 'bg-amber-50 text-amber-600 border-amber-100' },
        { label: 'Total Revenue Collected', value: `₹${Number(stats.total_revenue).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'bg-primary-50 text-primary-600 border-primary-100' },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Clinic-wide overview. Admin context bypasses VPD row-level scoping.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-primary-500" />
          <span className="font-medium">Loading dashboard...</span>
        </div>
      ) : (
        <>
          {/* KPI stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${color} mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-black text-slate-800">{value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue by Department bar chart */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary-600" />
              <h2 className="font-bold text-slate-800">Revenue by Department</h2>
              <span className="ml-auto text-xs font-bold bg-primary-50 text-primary-600 px-2.5 py-1 rounded-full border border-primary-100">
                /api/admin/revenue-report
              </span>
            </div>

            <div className="p-6">
              {revenue.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No revenue data available.</p>
              ) : (
                <div className="space-y-4">
                  {revenue.map((row) => {
                    const pct = (Number(row.revenue) / maxRevenue) * 100;
                    return (
                      <div key={row.department}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-semibold text-slate-700">{row.department}</span>
                          <span className="font-bold text-slate-800">₹{Number(row.revenue).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-primary-500 h-3 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* VPD Architecture note */}
          <div className="bg-slate-800 text-slate-200 rounded-xl p-6 text-sm">
            <p className="font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-400" /> Security Architecture Note
            </p>
            <p className="leading-relaxed text-slate-400">
              This dashboard queries the Oracle database with{' '}
              <code className="text-primary-400 bg-slate-700 px-1.5 py-0.5 rounded text-xs">clinic_ctx_pkg.set_role('ADMIN')</code>{' '}
              context, which bypasses all VPD row-level policies on{' '}
              <code className="text-primary-400 bg-slate-700 px-1.5 py-0.5 rounded text-xs">APPOINTMENT</code>,{' '}
              <code className="text-primary-400 bg-slate-700 px-1.5 py-0.5 rounded text-xs">BILLING</code>, and other tables —
              giving full unscoped aggregate visibility. Patient and Doctor portals see only their own rows.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
