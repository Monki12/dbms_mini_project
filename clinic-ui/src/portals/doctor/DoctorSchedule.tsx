import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import {
  Calendar, Clock, User, Activity, CheckCircle, Stethoscope,
  Plus, X, AlertCircle, Pill
} from 'lucide-react';

interface Appointment {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string;
}

interface ConsultationForm {
  notes: string;
  diagnosis: string;
}

interface PrescriptionItem {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

function groupByDate(appointments: Appointment[]) {
  return appointments.reduce<Record<string, Appointment[]>>((acc, a) => {
    const d = a.appointment_date?.split('T')[0] ?? 'Unknown';
    (acc[d] = acc[d] || []).push(a);
    return acc;
  }, {});
}

export default function DoctorSchedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Consultation modal state
  const [consultModal, setConsultModal] = useState<number | null>(null);
  const [consultForm, setConsultForm] = useState<ConsultationForm>({ notes: '', diagnosis: '' });
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState('');
  const [consultSuccess, setConsultSuccess] = useState<number | null>(null); // appointment_id with done consultation

  // Prescription modal state
  const [rxModal, setRxModal] = useState<number | null>(null);
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([
    { medication_name: '', dosage: '', frequency: '', duration: '', quantity: 1 },
  ]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = () => {
    setLoading(true);
    apiClient.get('/api/doctor/appointments')
      .then((res) => setAppointments(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultModal) return;
    setConsultError('');
    setConsultLoading(true);
    try {
      await apiClient.post(`/api/doctor/appointments/${consultModal}/consultation`, consultForm);
      setConsultSuccess(consultModal);
      setConsultModal(null);
      setConsultForm({ notes: '', diagnosis: '' });
    } catch (err: any) {
      setConsultError(err.response?.data?.detail || err.response?.data?.error || 'Failed to save consultation.');
    } finally {
      setConsultLoading(false);
    }
  };

  const handleRxItemChange = (i: number, field: keyof PrescriptionItem, value: string | number) => {
    setRxItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxModal) return;
    setRxError('');
    setRxLoading(true);
    try {
      await apiClient.post(`/api/doctor/appointments/${rxModal}/prescription`, { items: rxItems });
      setRxModal(null);
      setRxItems([{ medication_name: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);
    } catch (err: any) {
      setRxError(err.response?.data?.detail || err.response?.data?.error || 'Failed to save prescription.');
    } finally {
      setRxLoading(false);
    }
  };

  const grouped = groupByDate(appointments);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">Appointments are VPD-scoped — only your patients appear here.</p>
        </div>
        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
          {appointments.length} total
        </span>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-blue-500" />
          <span className="font-medium">Loading schedule...</span>
        </div>
      ) : appointments.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No appointments assigned.</p>
        </div>
      ) : (
        sortedDates.map((date) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className={`text-sm font-bold px-3 py-1 rounded-full ${
                date === today
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {date === today ? 'Today — ' : ''}
                {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-3">
              {grouped[date].map((a) => {
                const isCompleted = a.status?.toLowerCase() === 'completed';
                const hasConsult = consultSuccess === a.appointment_id;
                return (
                  <div key={a.appointment_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold border border-blue-200 flex-shrink-0">
                          {(a.patient_name || 'P').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{a.patient_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{a.reason_for_visit || 'Consultation'}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {a.appointment_time?.slice(0, 5)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          isCompleted
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {a.status}
                        </span>

                        {!isCompleted && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setConsultModal(a.appointment_id); setConsultError(''); }}
                              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
                            >
                              <Stethoscope className="w-3.5 h-3.5" /> Consult
                            </button>
                            <button
                              onClick={() => { setRxModal(a.appointment_id); setRxError(''); }}
                              className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-white hover:bg-violet-600 px-3 py-1.5 rounded-md border border-violet-200 transition-colors"
                            >
                              <Pill className="w-3.5 h-3.5" /> Prescribe
                            </button>
                          </div>
                        )}
                        {hasConsult && (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Consultation saved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Consultation Modal */}
      {consultModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" /> Create Consultation
              </h3>
              <button onClick={() => setConsultModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConsultSubmit} className="p-6 space-y-4">
              {consultError && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{consultError}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Diagnosis</label>
                <input
                  type="text" required maxLength={1000}
                  className="input-field"
                  placeholder="e.g. Acute pharyngitis"
                  value={consultForm.diagnosis}
                  onChange={(e) => setConsultForm((f) => ({ ...f, diagnosis: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Clinical Notes</label>
                <textarea
                  required maxLength={2000} rows={4}
                  className="input-field resize-none"
                  placeholder="Patient presented with..."
                  value={consultForm.notes}
                  onChange={(e) => setConsultForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setConsultModal(null)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={consultLoading} className="flex-1 btn-primary bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
                  {consultLoading ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</> : 'Save Consultation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {rxModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-violet-600" /> Create Prescription
              </h3>
              <button onClick={() => setRxModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRxSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {rxError && (
                  <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{rxError}
                  </div>
                )}
                <p className="text-xs text-slate-400 font-medium">Note: A consultation for this appointment must be saved first.</p>
                {rxItems.map((item, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item {i + 1}</span>
                      {rxItems.length > 1 && (
                        <button type="button" onClick={() => setRxItems((p) => p.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 p-1 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Medication</label>
                        <input required type="text" className="input-field text-sm py-2" placeholder="Paracetamol 500mg"
                          value={item.medication_name} onChange={(e) => handleRxItemChange(i, 'medication_name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Dosage</label>
                        <input required type="text" className="input-field text-sm py-2" placeholder="1 tablet"
                          value={item.dosage} onChange={(e) => handleRxItemChange(i, 'dosage', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Frequency</label>
                        <input required type="text" className="input-field text-sm py-2" placeholder="3x daily"
                          value={item.frequency} onChange={(e) => handleRxItemChange(i, 'frequency', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Duration</label>
                        <input required type="text" className="input-field text-sm py-2" placeholder="5 days"
                          value={item.duration} onChange={(e) => handleRxItemChange(i, 'duration', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity</label>
                        <input required type="number" min={1} className="input-field text-sm py-2"
                          value={item.quantity} onChange={(e) => handleRxItemChange(i, 'quantity', parseInt(e.target.value))} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setRxItems((p) => [...p, { medication_name: '', dosage: '', frequency: '', duration: '', quantity: 1 }])}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Medication
                </button>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button type="button" onClick={() => setRxModal(null)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={rxLoading} className="flex-1 btn-primary bg-violet-600 hover:bg-violet-700 flex items-center justify-center gap-2">
                  {rxLoading ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</> : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
