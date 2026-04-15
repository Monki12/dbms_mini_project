import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { FileText, Activity, Heart, Droplets } from 'lucide-react';

interface MedicalRecord {
  record_id?: number;
  diagnosis?: string;
  allergies?: string;
  chronic_conditions?: string;
  surgical_history?: string;
  current_medications?: string;
  notes?: string;
  last_updated?: string;
}

export default function PatientMedicalRecords() {
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/patient/medical-records')
      .then((res) => setRecord(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fields: { label: string; key: keyof MedicalRecord; icon?: React.ReactNode }[] = [
    { label: 'Primary Diagnosis', key: 'diagnosis', icon: <Heart className="w-4 h-4 text-red-400" /> },
    { label: 'Known Allergies', key: 'allergies', icon: <Droplets className="w-4 h-4 text-orange-400" /> },
    { label: 'Chronic Conditions', key: 'chronic_conditions' },
    { label: 'Surgical History', key: 'surgical_history' },
    { label: 'Current Medications', key: 'current_medications' },
    { label: 'Clinical Notes', key: 'notes' },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Medical Records</h1>
        <p className="text-sm text-slate-500 mt-1">Your health records are VPD-scoped — only you can see them.</p>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="font-medium">Fetching records...</span>
        </div>
      ) : !record || Object.keys(record).length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No medical records on file.</p>
          <p className="text-sm text-slate-400 mt-1">Records are added by your attending doctor after consultations.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {record.last_updated && (
            <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold text-emerald-700">
              Last updated: {new Date(record.last_updated).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {fields.map(({ label, key, icon }) => {
              const val = record[key];
              if (!val) return null;
              return (
                <div key={key} className="px-6 py-4">
                  <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    {icon}{label}
                  </dt>
                  <dd className="text-sm text-slate-700 font-medium leading-relaxed">{String(val)}</dd>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
