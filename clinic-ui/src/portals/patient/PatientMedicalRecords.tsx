import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { FileText, Activity, Heart, Droplets, Stethoscope, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

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

interface Consultation {
  consultation_id: number;
  appointment_id: number;
  chief_complaint: string;
  diagnosis: string;
  treatment_notes: string;
  created_at: string;
  appt_date: string;
  doctor_name: string;
  specialty: string;
  department_name: string;
}

function formatDate(ts: string | undefined) {
  if (!ts) return '—';
  return new Date(ts.split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ConsultationCard({ c }: { c: Consultation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-3 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />{formatDate(c.appt_date)}
              </span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs font-semibold text-emerald-700">Dr. {c.doctor_name}</span>
              <span className="text-xs text-slate-400">{c.specialty}</span>
            </div>
            <p className="font-bold text-slate-800 text-sm">{c.diagnosis}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.chief_complaint}</p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {expanded && c.treatment_notes && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Treatment Notes</p>
            <p className="text-sm text-slate-700 leading-relaxed">{c.treatment_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientMedicalRecords() {
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/patient/medical-records'),
      apiClient.get('/api/patient/consultations'),
    ])
      .then(([recRes, conRes]) => {
        setRecord(recRes.data.data || null);
        setConsultations(conRes.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const staticFields: { label: string; key: keyof MedicalRecord; icon?: React.ReactNode }[] = [
    { label: 'Primary Diagnosis', key: 'diagnosis', icon: <Heart className="w-3.5 h-3.5 text-red-400" /> },
    { label: 'Known Allergies', key: 'allergies', icon: <Droplets className="w-3.5 h-3.5 text-orange-400" /> },
    { label: 'Chronic Conditions', key: 'chronic_conditions' },
    { label: 'Surgical History', key: 'surgical_history' },
    { label: 'Current Medications', key: 'current_medications' },
    { label: 'Clinical Notes', key: 'notes' },
  ];

  const hasRecord = record && Object.values(record).some(Boolean);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Medical Records</h1>
        <p className="text-sm text-slate-500 mt-1">VPD-scoped — only you can see your records.</p>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="font-medium">Fetching records...</span>
        </div>
      ) : (
        <>
          {/* ── Static Medical Record ── */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Health Summary
            </h2>
            {!hasRecord ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="font-semibold text-sm">No health summary on file.</p>
                <p className="text-xs text-slate-400 mt-1">Added by admin after your first consultation.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {record?.last_updated && (
                  <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold text-emerald-700">
                    Last updated: {formatDate(record.last_updated)}
                  </div>
                )}
                <div className="divide-y divide-slate-100">
                  {staticFields.map(({ label, key, icon }) => {
                    const val = record?.[key];
                    if (!val) return null;
                    return (
                      <div key={key} className="px-5 py-3.5">
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
          </section>

          {/* ── Consultation Timeline ── */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> Consultation History
              {consultations.length > 0 && (
                <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {consultations.length}
                </span>
              )}
            </h2>

            {consultations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="font-semibold text-sm">No consultations recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Your doctor's notes will appear here after a completed visit.</p>
              </div>
            ) : (
              <div className="relative space-y-3">
                {/* Vertical timeline line */}
                <div className="absolute left-1.5 top-3 bottom-3 w-px bg-slate-200" />
                {consultations.map((c) => (
                  <ConsultationCard key={c.consultation_id} c={c} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
