import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Users, Activity, User } from 'lucide-react';

interface Patient {
  patient_id: number;
  full_name: string;
  dob: string;
  gender: string;
  blood_group: string;
  phone_number: string;
}

export default function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/doctor/patients')
      .then((res) => setPatients(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Patients</h1>
          <p className="text-sm text-slate-500 mt-1">Patients scoped via VPD — only those with appointments under your care.</p>
        </div>
        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
          {patients.length} patients
        </span>
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-blue-500" />
          <span className="font-medium">Loading patients...</span>
        </div>
      ) : patients.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No patients assigned yet.</p>
          <p className="text-sm text-slate-400 mt-1">Patients appear here once appointments are scheduled with you.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Patient</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Blood Group</th>
                <th className="px-5 py-3.5">Gender</th>
                <th className="px-5 py-3.5">Date of Birth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.patient_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200 flex-shrink-0">
                        {p.full_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.full_name}</p>
                        <p className="text-xs text-slate-400">ID: {p.patient_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 font-medium">{p.phone_number || '—'}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 uppercase">
                      {p.blood_group || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{p.gender || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {p.dob ? new Date(p.dob).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
