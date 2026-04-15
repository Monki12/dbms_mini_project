import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Calendar, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';

interface Appointment {
  appointment_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string;
  doctor_id: number;
  department_id: number;
}

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/patient/appointments')
      .then((res) => setAppointments(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
        <p className="text-sm text-slate-500 mt-1">All your clinic visits, scoped securely by the database layer.</p>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="font-medium">Loading appointments...</span>
        </div>
      ) : appointments.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No appointments found.</p>
          <p className="text-sm text-slate-400 mt-1">Your clinic visits will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const st = statusConfig[a.status?.toLowerCase()] || statusConfig['scheduled'];
            return (
              <div key={a.appointment_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-emerald-700 flex-shrink-0">
                      <span className="text-xs font-bold uppercase">
                        {new Date(a.appointment_date).toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {new Date(a.appointment_date).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Appointment #{a.appointment_id}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{a.reason_for_visit || 'General consultation'}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {a.appointment_time?.slice(0, 5) || '—'}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>Doctor ID: {a.doctor_id}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${st.cls}`}>
                    {st.icon}{st.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
