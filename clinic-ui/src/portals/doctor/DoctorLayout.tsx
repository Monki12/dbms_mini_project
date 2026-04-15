import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Stethoscope, Calendar, Users, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/client';

const navItems = [
  { to: '/doctor', label: 'My Schedule', icon: Calendar, end: true },
  { to: '/doctor/patients', label: 'My Patients', icon: Users, end: false },
];

export default function DoctorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {}
    logout();
    navigate('/login');
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
    </div>
  );
}
