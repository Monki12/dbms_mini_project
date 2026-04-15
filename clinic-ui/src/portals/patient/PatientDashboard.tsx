import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { Calendar, FileText, Pill, UserCircle, Activity, ChevronRight } from 'lucide-react';

interface Profile {
  full_name: string;
  gender: string;
  blood_group: string;
  dob: string;
  email: string;
}

export default function PatientDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    apiClient.get('/api/patient/profile')
      .then((res) => setProfile(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { to: '/patient/appointments', label: 'My Appointments', icon: Calendar, color: 'bg-blue-50 text-blue-600 border-blue-100', desc: 'View all your scheduled visits' },
    { to: '/patient/medical-records', label: 'Medical Records', icon: FileText, color: 'bg-violet-50 text-violet-600 border-violet-100', desc: 'Access your health history' },
    { to: '/patient/prescriptions', label: 'Prescriptions', icon: Pill, color: 'bg-amber-50 text-amber-600 border-amber-100', desc: 'Current and past medications' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome header */}
      <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
        {loading ? (
          <div className="flex items-center gap-3 text-slate-400">
            <Activity className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="font-medium">Loading profile...</span>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl border-2 border-emerald-200 flex-shrink-0">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Welcome, {profile?.full_name || 'Patient'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Patient ID: <span className="font-semibold text-slate-700">UID-{user?.linked_entity_id}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile?.gender && (
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                    {profile.gender}
                  </span>
                )}
                {profile?.blood_group && (
                  <span className="text-xs font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100 uppercase">
                    {profile.blood_group}
                  </span>
                )}
                {profile?.dob && (
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                    DOB: {new Date(profile.dob).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick access cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map(({ to, label, icon: Icon, color, desc }) => (
            <Link
              key={to}
              to={to}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex flex-col gap-3"
            >
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center border ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors flex items-center justify-between">
                  {label}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile info card */}
      {!loading && profile && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <UserCircle className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-700">Profile Information</h3>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Full Name', value: profile.full_name },
              { label: 'Email', value: profile.email || '—' },
              { label: 'Phone', value: user?.display_name || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</dt>
                <dd className="mt-0.5 font-semibold text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
