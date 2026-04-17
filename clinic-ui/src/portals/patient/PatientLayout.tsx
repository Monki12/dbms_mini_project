import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Calendar, FileText, Pill, LogOut, LayoutDashboard, FlaskConical, Heart, ShoppingBag, Siren, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/client';
import NotificationsBell from '../../components/NotificationsBell';

const navItems = [
  { to: '/patient', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/patient/appointments', label: 'My Appointments', icon: Calendar, end: false },
  { to: '/patient/medical-records', label: 'Medical Records', icon: FileText, end: false },
  { to: '/patient/prescriptions', label: 'Prescriptions', icon: Pill, end: false },
  { to: '/patient/lab-results', label: 'Lab Results', icon: FlaskConical, end: false },
  { to: '/patient/vitals', label: 'Vitals History', icon: Heart, end: false },
  { to: '/patient/pharmacy', label: 'Pharmacy', icon: ShoppingBag, end: false },
];

export default function PatientLayout() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const [emergencyModal, setEmergencyModal] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ severity: 'MODERATE', location_text: '', description: '' });
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState('');
  const [emergencyError, setEmergencyError] = useState(false);

  const submitEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmergencyLoading(true);
    setEmergencyMsg('');
    try {
      await apiClient.post('/api/patient/emergency', emergencyForm);
      setEmergencyMsg('Emergency request sent. Staff have been notified.');
      setEmergencyError(false);
      setEmergencyForm({ severity: 'MODERATE', location_text: '', description: '' });
    } catch (err: any) {
      setEmergencyMsg(err.response?.data?.detail || err.response?.data?.error || 'Failed to send emergency request.');
      setEmergencyError(true);
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await apiClient.post('/api/patient/auth/logout', { refresh_token: refreshToken });
      }
    } catch (_) {
      // ignore
    } finally {
      logout();
      navigate('/patient/login');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="bg-emerald-600 rounded p-1.5 shadow-sm shadow-emerald-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-800 leading-none">Clinic OS</h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Patient Portal</p>
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
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 text-sm">
              P
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-800">
                {user?.display_name || 'Patient'}
              </p>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide mt-0.5">Patient</p>
            </div>
            <NotificationsBell role="PATIENT" />
            <button
              onClick={() => { setEmergencyModal(true); setEmergencyMsg(''); }}
              className="text-white bg-red-500 hover:bg-red-600 transition-colors p-2 rounded-lg"
              title="Emergency"
            >
              <Siren className="w-4 h-4" />
            </button>
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

      {/* ── Emergency Modal ── */}
      {emergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <h3 className="font-bold text-red-700 flex items-center gap-2">
                <Siren className="w-5 h-5" /> Emergency Request
              </h3>
              <button onClick={() => setEmergencyModal(false)} className="text-red-400 hover:text-red-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitEmergency} className="p-6 space-y-4">
              {emergencyMsg && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${emergencyError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                  {emergencyError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {emergencyMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Severity</label>
                <select required className="input-field" value={emergencyForm.severity}
                  onChange={(e) => setEmergencyForm((f) => ({ ...f, severity: e.target.value }))}>
                  <option value="LOW">Low — Non-urgent assistance</option>
                  <option value="MODERATE">Moderate — Needs attention soon</option>
                  <option value="HIGH">High — Urgent medical help</option>
                  <option value="CRITICAL">Critical — Life-threatening</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Your Location</label>
                <input type="text" required maxLength={500} className="input-field"
                  placeholder="e.g. Waiting area, Room 4B, Corridor near pharmacy"
                  value={emergencyForm.location_text}
                  onChange={(e) => setEmergencyForm((f) => ({ ...f, location_text: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows={3} required maxLength={1000} className="input-field resize-none"
                  placeholder="Briefly describe the emergency..."
                  value={emergencyForm.description}
                  onChange={(e) => setEmergencyForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEmergencyModal(false)} className="flex-1 btn-secondary">Close</button>
                <button type="submit" disabled={emergencyLoading} className="flex-1 btn-primary bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2">
                  {emergencyLoading ? 'Sending...' : 'Send Emergency Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
