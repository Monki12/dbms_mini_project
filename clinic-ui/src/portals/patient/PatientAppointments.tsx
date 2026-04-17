import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Calendar, Clock, CheckCircle, XCircle, Activity, Plus, X, AlertCircle, Stethoscope } from 'lucide-react';

interface Appointment {
  appointment_id: number;
  appt_date: string;
  slot_start: string;
  status: string;
  reason_for_visit: string;
  doctor_name: string;
  specialty: string;
  department_name: string;
}

interface Doctor {
  doctor_id: number;
  full_name: string;
  specialty: string;
  qualification: string;
  experience_years: number;
  department_name: string;
  department_id: number;
}

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30',
];

function formatSlotTime(slot: string | undefined): string {
  if (!slot) return '—';
  if (slot.includes('T')) return slot.split('T')[1].slice(0, 5);
  const d = new Date(slot);
  if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return slot.slice(0, 5);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBooking, setShowBooking] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [form, setForm] = useState({ doctor_id: '', appt_date: '', slot_start: '', reason_for_visit: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const fetchAppointments = () => {
    setLoading(true);
    apiClient.get('/api/patient/appointments')
      .then((res) => setAppointments(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAppointments(); }, []);

  const openBooking = async () => {
    setShowBooking(true);
    setBookingError('');
    setBookingSuccess(false);
    setForm({ doctor_id: '', appt_date: '', slot_start: '', reason_for_visit: '' });
    if (doctors.length === 0) {
      setDoctorsLoading(true);
      try {
        const res = await apiClient.get('/api/patient/doctors');
        setDoctors(res.data.data || []);
      } catch { /* ignore */ } finally {
        setDoctorsLoading(false);
      }
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingLoading(true);
    try {
      await apiClient.post('/api/patient/appointments', {
        doctor_id: Number(form.doctor_id),
        appt_date: form.appt_date,
        slot_start: form.slot_start,
        reason_for_visit: form.reason_for_visit || null,
      });
      setBookingSuccess(true);
      fetchAppointments();
    } catch (err: any) {
      setBookingError(err.response?.data?.detail || err.response?.data?.error || 'Booking failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">Your upcoming and past clinic visits.</p>
        </div>
        <button onClick={openBooking} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
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
          <p className="text-sm text-slate-400 mt-1">Click "Book Appointment" to schedule a visit.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const key = a.status?.toLowerCase();
            const st = statusConfig[key] || statusConfig['scheduled'];
            const dateStr = a.appt_date?.split('T')[0] ?? '';
            return (
              <div key={a.appointment_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-emerald-700 flex-shrink-0">
                      <span className="text-xs font-bold uppercase">
                        {new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {new Date(dateStr + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        Dr. {a.doctor_name}
                        <span className="ml-2 text-xs font-normal text-slate-400">{a.specialty}</span>
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">{a.reason_for_visit || 'General consultation'}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatSlotTime(a.slot_start)}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>{a.department_name}</span>
                        <span className="text-slate-300">·</span>
                        <span>{formatDate(a.appt_date)}</span>
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

      {/* ── Booking Modal ── */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" /> Book Appointment
              </h3>
              <button onClick={() => setShowBooking(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-800 text-lg">Appointment Booked!</p>
                <p className="text-sm text-slate-500">Your appointment has been scheduled successfully.</p>
                <button onClick={() => setShowBooking(false)} className="btn-primary mt-2">Close</button>
              </div>
            ) : (
              <form onSubmit={handleBook} className="p-6 space-y-4">
                {bookingError && (
                  <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{bookingError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Doctor</label>
                  {doctorsLoading ? (
                    <div className="input-field flex items-center gap-2 text-slate-400">
                      <Activity className="w-4 h-4 animate-spin" /> Loading doctors...
                    </div>
                  ) : (
                    <select required className="input-field" value={form.doctor_id}
                      onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}>
                      <option value="">— Select a doctor —</option>
                      {doctors.map((d) => (
                        <option key={d.doctor_id} value={d.doctor_id}>
                          Dr. {d.full_name} — {d.specialty} ({d.department_name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" required min={today} className="input-field"
                    value={form.appt_date}
                    onChange={(e) => setForm((f) => ({ ...f, appt_date: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Time Slot</label>
                  <select required className="input-field" value={form.slot_start}
                    onChange={(e) => setForm((f) => ({ ...f, slot_start: e.target.value }))}>
                    <option value="">— Select time —</option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Visit <span className="font-normal text-slate-400">(optional)</span></label>
                  <textarea rows={2} maxLength={500} className="input-field resize-none"
                    placeholder="e.g. Fever and body ache for 2 days"
                    value={form.reason_for_visit}
                    onChange={(e) => setForm((f) => ({ ...f, reason_for_visit: e.target.value }))} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowBooking(false)} className="flex-1 btn-secondary">Cancel</button>
                  <button type="submit" disabled={bookingLoading} className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2">
                    {bookingLoading ? (
                      <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Booking...</>
                    ) : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
