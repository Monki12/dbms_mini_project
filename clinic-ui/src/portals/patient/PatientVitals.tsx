import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Heart, Activity, Thermometer, Weight, Ruler } from 'lucide-react';

interface VitalRecord {
  vital_id: number;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  recorded_at: string;
  appt_date: string;
  doctor_name: string;
}

function VitalBadge({ label, value, unit, icon: Icon, colorClass }: {
  label: string; value: string | number | null; unit: string; icon: React.ElementType; colorClass: string;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${colorClass}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div>
        <p className="text-xs font-semibold opacity-70 leading-none">{label}</p>
        <p className="font-bold leading-tight mt-0.5">{value} <span className="font-normal text-xs">{unit}</span></p>
      </div>
    </div>
  );
}

function getBPStatus(systolic: number | null, diastolic: number | null) {
  if (!systolic || !diastolic) return null;
  if (systolic >= 180 || diastolic >= 120) return { label: 'Crisis', color: 'text-red-700 bg-red-100 border-red-200' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'High', color: 'text-red-600 bg-red-50 border-red-100' };
  if (systolic >= 130 || diastolic >= 80) return { label: 'Elevated', color: 'text-orange-600 bg-orange-50 border-orange-100' };
  if (systolic < 90 || diastolic < 60) return { label: 'Low', color: 'text-blue-600 bg-blue-50 border-blue-100' };
  return { label: 'Normal', color: 'text-green-700 bg-green-50 border-green-100' };
}

export default function PatientVitals() {
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/vitals/patient/history')
      .then((res) => setVitals(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vitals History</h1>
        <p className="text-sm text-slate-500 mt-1">Your vital signs recorded across all clinic visits.</p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="font-medium">Loading vitals...</span>
        </div>
      ) : vitals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <Heart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No vitals recorded yet.</p>
          <p className="text-sm text-slate-400 mt-1">Your doctor records vitals during consultations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vitals.map((v) => {
            const bpStatus = getBPStatus(v.bp_systolic, v.bp_diastolic);
            const bmi = v.weight_kg && v.height_cm
              ? (v.weight_kg / Math.pow(v.height_cm / 100, 2)).toFixed(1)
              : null;

            return (
              <div key={v.vital_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {v.recorded_at
                        ? new Date(v.recorded_at).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Dr. {v.doctor_name}</p>
                  </div>
                  {bpStatus && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${bpStatus.color}`}>
                      BP: {bpStatus.label}
                    </span>
                  )}
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {v.bp_systolic && v.bp_diastolic && (
                    <VitalBadge
                      label="Blood Pressure" value={`${v.bp_systolic}/${v.bp_diastolic}`} unit="mmHg"
                      icon={Activity}
                      colorClass="bg-red-50 border-red-100 text-red-800"
                    />
                  )}
                  <VitalBadge label="Heart Rate" value={v.heart_rate} unit="bpm" icon={Heart} colorClass="bg-pink-50 border-pink-100 text-pink-800" />
                  <VitalBadge label="Temperature" value={v.temperature} unit="°C" icon={Thermometer} colorClass="bg-orange-50 border-orange-100 text-orange-800" />
                  <VitalBadge label="SpO₂" value={v.spo2} unit="%" icon={Activity} colorClass="bg-blue-50 border-blue-100 text-blue-800" />
                  <VitalBadge label="Weight" value={v.weight_kg} unit="kg" icon={Weight} colorClass="bg-violet-50 border-violet-100 text-violet-800" />
                  <VitalBadge label="Height" value={v.height_cm} unit="cm" icon={Ruler} colorClass="bg-teal-50 border-teal-100 text-teal-800" />
                  <VitalBadge label="Resp. Rate" value={v.respiratory_rate} unit="/min" icon={Activity} colorClass="bg-sky-50 border-sky-100 text-sky-800" />
                  {bmi && (
                    <VitalBadge label="BMI" value={bmi} unit="" icon={Activity} colorClass="bg-emerald-50 border-emerald-100 text-emerald-800" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}