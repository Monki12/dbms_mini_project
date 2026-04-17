import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Stethoscope, Calendar, Users, LogOut, PlaneTakeoff, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/client';
import NotificationsBell from '../../components/NotificationsBell';

const navItems = [
  { to: '/doctor', label: 'My Schedule', icon: Calendar, end: true },
  { to: '/doctor/patients', label: 'My Patients', icon: Users, end: false },
];

export default function DoctorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState('');
  const [leaveError, setLeaveError] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch (_) {}
    logout();
    navigate('/login');
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveLoading(true);
    setLeaveMsg('');
    try {
      await apiClient.post('/api/doctor/leave', leaveForm);
      setLeaveMsg('Leave request submitted successfully.');
      setLeaveError(false);
      setLeaveForm({ start_date: '', end_date: '', reason: '' });
    } catch (err: any) {
      setLeaveMsg(err.response?.data?.detail || err.response?.data?.error || 'Failed to submit leave.');
      setLeaveError(true);
    } finally {
      setLeaveLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="bg-blue-600 rounded p-1.5 shadow-sm shadow-blue-500/20">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-800 leading-none">Clinic OS</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">Doctor Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}

          <button
            onClick={() => { setLeaveModal(true); setLeaveMsg(''); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-transparent transition-all duration-200"
          >
            <PlaneTakeoff className="w-5 h-5" />
            Request Leave
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold border border-blue-200">
              {user?.display_name?.charAt(0).toUpperCase() || 'D'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-800">{user?.display_name || 'Doctor'}</p>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mt-0.5">Doctor</p>
            </div>
            <NotificationsBell role="DOCTOR" />
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-lg"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* ── Request Leave Modal ── */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PlaneTakeoff className="w-5 h-5 text-amber-500" /> Request Leave
              </h3>
              <button onClick={() => setLeaveModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitLeave} className="p-6 space-y-4">
              {leaveMsg && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${leaveError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                  {leaveError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {leaveMsg}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">From</label>
                  <input type="date" required min={today} className="input-field"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">To</label>
                  <input type="date" required min={leaveForm.start_date || today} className="input-field"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Reason <span className="font-normal text-slate-400">(optional)</span></label>
                <input type="text" maxLength={500} className="input-field" placeholder="Conference, personal, medical..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setLeaveModal(false)} className="flex-1 btn-secondary">Close</button>
                <button type="submit" disabled={leaveLoading} className="flex-1 btn-primary bg-amber-500 hover:bg-amber-600 flex items-center justify-center gap-2">
                  {leaveLoading ? 'Submitting...' : 'Submit Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
