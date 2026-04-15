import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, Calendar, DollarSign, LogOut, LayoutDashboard, Stethoscope } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Layout() {
  const { user, logout } = useAuthStore();
  
  const navItems = [
    { to: '/', name: 'Dashboard', icon: LayoutDashboard },
    { to: '/patients', name: 'Patient Directory', icon: Users },
    { to: '/appointments', name: 'Appointments', icon: Calendar },
    { to: '/billing', name: 'Revenue Tracking', icon: DollarSign },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm relative z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
           <div className="bg-primary-600 rounded p-1.5 shadow-sm shadow-primary-500/20">
             <Stethoscope className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-xl font-bold tracking-tight text-slate-800">Clinic OS</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`
                }
                end={item.to === '/'}
              >
                <Icon className={`w-5 h-5 ${location.pathname === item.to ? 'text-primary-600' : 'text-slate-400'}`} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
           <div className="flex items-center gap-3 py-1">
             <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold border border-primary-200 shadow-sm">
               {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-semibold truncate text-slate-800">{user?.username}</p>
               <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-0.5">{user?.role}</p>
             </div>
             <button onClick={logout} className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-lg group" title="Secure Logout">
               <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
             </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col w-full h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
           <Outlet />
        </div>
      </main>
    </div>
  );
}
