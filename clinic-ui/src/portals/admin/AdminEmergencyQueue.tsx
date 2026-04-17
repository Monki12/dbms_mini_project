import React, { useEffect, useState } from 'react';
import { Siren, Activity, CheckCircle, UserCheck, X, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

interface EmergencyRequest {
  request_id: number;
  patient_name: string;
  phone_number: string;
  severity: string;
  location_text: string;
  description: string;
  status: string;
  assigned_doctor_name: string | null;
  created_at: string;
}

interface Doctor {
  doctor_id: number;
  full_name: string;
  specialisation: string;
}

const severityConfig: Record<string, { cls: string; label: string }> = {
  CRITICAL: { cls: 'bg-red-100 text-red-700 border-red-300', label: 'CRITICAL' },
  HIGH:     { cls: 'bg-orange-100 text-orange-700 border-orange-300', label: 'HIGH' },
  MODERATE: { cls: 'bg-amber-100 text-amber-700 border-amber-300', label: 'MODERATE' },
  LOW:      { cls: 'bg-green-100 text-green-700 border-green-300', label: 'LOW' },
};

const statusCls: Record<string, string> = {
  OPEN:     'bg-red-50 text-red-600 border-red-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
};

function formatTime(ts: string) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminEmergencyQueue() {
  const [queue, setQueue] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [assignModal, setAssignModal] = useState<EmergencyRequest | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [resolveLoading, setResolveLoading] = useState<number | null>(null);

  const fetchQueue = () => {
    setLoading(true);
    apiClient.get('/api/admin/emergency-queue')
      .then((res) => setQueue(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchDoctors = async () => {
    if (doctors.length > 0) return;
    try {
      const res = await apiClient.get('/doctors');
      setDoctors(res.data.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const openAssign = async (er: EmergencyRequest) => {
    setAssignModal(er);
    setSelectedDoctor('');
    setAssignError('');
    await fetchDoctors();
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal || !selectedDoctor) return;
    setAssignLoading(true);
    setAssignError('');
    try {
      await apiClient.patch(`/api/admin/emergency/${assignModal.request_id}/assign`, null, {
        params: { doctor_id: Number(selectedDoctor) },
      });
      setAssignModal(null);
      fetchQueue();
    } catch (err: any) {
      setAssignError(err.response?.data?.detail || err.response?.data?.error || 'Assignment failed.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleResolve = async (id: number) => {
    if (!window.confirm('Mark this emergency as resolved?')) return;
    setResolveLoading(id);
    try {
      await apiClient.patch(`/api/admin/emergency/${id}/resolve`);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.error || 'Failed to resolve.');
    } finally {
      setResolveLoading(null);
    }
  };

  const pending = queue.filter((e) => e.status === 'OPEN' || e.status === 'ASSIGNED');
  const resolved = queue.filter((e) => e.status === 'RESOLVED');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Siren className="w-6 h-6 text-red-500" /> Emergency Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Live feed — auto-refreshes every 30 seconds.</p>
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">
              {pending.length} active
            </span>
          )}
          <button onClick={fetchQueue} className="btn-secondary text-sm">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-red-500" />
          <span>Loading emergency queue...</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="font-semibold">No emergency requests.</p>
          <p className="text-sm text-slate-400 mt-1">All clear.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Active Requests</h2>
              {pending.map((er) => {
                const sev = severityConfig[er.severity] || severityConfig.MODERATE;
                const stCls = statusCls[er.status] || statusCls.PENDING;
                return (
                  <div key={er.request_id} className={`bg-white border-2 rounded-xl p-5 shadow-sm ${er.severity === 'CRITICAL' ? 'border-red-300' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${sev.cls}`}>{sev.label}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${stCls}`}>{er.status}</span>
                          <span className="text-xs text-slate-400">{formatTime(er.created_at)}</span>
                        </div>
                        <p className="font-bold text-slate-800">{er.patient_name || `Patient #${er.patient_id}`}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{er.description}</p>
                        <p className="text-xs text-slate-500 mt-1">Location: <span className="font-semibold">{er.location_text}</span></p>
                        {er.assigned_doctor_name && (
                          <p className="text-xs text-blue-600 mt-1 font-semibold">Assigned to: Dr. {er.assigned_doctor_name}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {(er.status === 'OPEN' || er.status === 'ASSIGNED') && (
                          <>
                            {er.status === 'OPEN' && (
                              <button
                                onClick={() => openAssign(er)}
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-md border border-blue-200 transition-colors whitespace-nowrap"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Assign Doctor
                              </button>
                            )}
                            <button
                              onClick={() => handleResolve(er.request_id)}
                              disabled={resolveLoading === er.request_id}
                              className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-white hover:bg-green-600 px-3 py-1.5 rounded-md border border-green-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {resolveLoading === er.request_id ? 'Resolving...' : 'Resolve'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Resolved</h2>
              {resolved.map((er) => {
                const sev = severityConfig[er.severity] || severityConfig.MODERATE;
                return (
                  <div key={er.request_id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-70">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${sev.cls}`}>{sev.label}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">RESOLVED</span>
                      <span className="text-xs text-slate-400">{formatTime(er.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600">{er.patient_name || `Patient #${er.patient_id}`}</p>
                    <p className="text-xs text-slate-500">{er.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Assign Doctor Modal ── */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Assign Doctor
              </h3>
              <button onClick={() => setAssignModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              {assignError && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />{assignError}
                </div>
              )}
              <p className="text-sm text-slate-600">
                Assigning doctor for <span className="font-semibold">{assignModal.patient_name}</span> — <span className={`font-bold ${assignModal.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>{assignModal.severity}</span> emergency.
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Doctor</label>
                <select required className="input-field" value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}>
                  <option value="">— Choose a doctor —</option>
                  {doctors.map((d) => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      Dr. {d.full_name} — {d.specialisation}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAssignModal(null)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={assignLoading} className="flex-1 btn-primary bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
                  {assignLoading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
