import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Pill, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface PrescriptionItem {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

interface Prescription {
  prescription_id: number;
  consultation_id: number;
  created_at: string;
  doctor_name: string;
  appt_date: string;
  items: PrescriptionItem[];
}

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    apiClient.get('/api/patient/prescriptions')
      .then((res) => setPrescriptions(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
        <p className="text-sm text-slate-500 mt-1">Medications prescribed by your doctors, scoped to your records.</p>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="font-medium">Loading prescriptions...</span>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500">
          <Pill className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No prescriptions found.</p>
          <p className="text-sm text-slate-400 mt-1">Prescriptions will appear here after your consultations.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.prescription_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === rx.prescription_id ? null : rx.prescription_id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <Pill className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">
                      Prescription #{rx.prescription_id}
                      <span className="ml-2 text-xs font-normal text-slate-400">{rx.items.length} item{rx.items.length !== 1 ? 's' : ''}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rx.doctor_name ? `Dr. ${rx.doctor_name} · ` : ''}
                      {rx.appt_date
                        ? new Date(rx.appt_date.split('T')[0] + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                        : rx.created_at
                        ? new Date(rx.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                        : 'Date unavailable'}
                    </p>
                  </div>
                </div>
                {expanded === rx.prescription_id
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {expanded === rx.prescription_id && rx.items && rx.items.length > 0 && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {rx.items.map((item, i) => (
                    <div key={i} className="px-5 py-4 bg-amber-50/30">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">{item.medication_name}</p>
                          <div className="flex flex-wrap gap-3 mt-1.5 text-xs font-medium text-slate-500">
                            <span className="bg-white border border-slate-200 rounded px-2 py-0.5">
                              Dosage: <strong className="text-slate-700">{item.dosage}</strong>
                            </span>
                            <span className="bg-white border border-slate-200 rounded px-2 py-0.5">
                              {item.frequency}
                            </span>
                            <span className="bg-white border border-slate-200 rounded px-2 py-0.5">
                              {item.duration}
                            </span>
                          </div>
                        </div>
                        <div className="text-center flex-shrink-0 bg-amber-100 text-amber-700 font-bold text-sm px-3 py-1.5 rounded-lg border border-amber-200">
                          Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expanded === rx.prescription_id && (!rx.items || rx.items.length === 0) && (
                <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-400 text-center">
                  No items in this prescription.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
