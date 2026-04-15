import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Plus, Search, Edit3, UserCircle, Activity } from 'lucide-react';

interface Patient {
  patient_id: number;
  full_name: string;
  contact_number: string;
  blood_group: string;
  gender: string;
  created_at: string;
}

export default function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Basic debounce mock mapping
    const delay = setTimeout(() => {
        fetchPatients();
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const fetchPatients = async () => {
    try {
      const res = await apiClient.get('/patients', { params: { name: search } });
      setPatients(res.data.data);
    } catch (error) {
      console.error("Failed schema sync", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patient Directory</h1>
            <p className="text-sm text-slate-500 font-medium">Manage clinical records natively synced to DB bounds.</p>
          </div>
          <button className="btn-primary flex items-center justify-center gap-2 shadow-primary-500/30 w-full sm:w-auto">
            <Plus className="w-5 h-5" /> Enlist New Patient
          </button>
       </div>

       <div className="bg-white rounded-xl shadow-glass border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex gap-4 bg-slate-50/50">
             <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Query bounds dynamically by precise name..." 
                  className="input-field pl-10 w-full py-2 shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Demographics identity</th>
                    <th className="px-6 py-4">Contact Gateway</th>
                    <th className="px-6 py-4">Biometrics</th>
                    <th className="px-6 py-4">Registration Matrix</th>
                    <th className="px-6 py-4 text-right">Mutations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {loading ? (
                     <tr>
                        <td colSpan={5} className="p-12 text-center">
                           <div className="flex flex-col items-center gap-3 text-slate-400">
                              <Activity className="w-6 h-6 animate-spin text-primary-500" />
                              <p className="font-medium">Intercepting schema schemas...</p>
                           </div>
                        </td>
                     </tr>
                   ) : patients.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-500">
                           <div className="flex flex-col items-center gap-2">
                             <UserCircle className="w-10 h-10 text-slate-300" />
                             <p className="font-medium text-slate-600">No specific mapped identities conform to logical query filters.</p>
                           </div>
                        </td>
                     </tr>
                   ) : (
                     patients.map(p => (
                       <tr key={p.patient_id} className="hover:bg-slate-50/70 transition-colors group">
                         <td className="px-6 py-4 flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold border border-primary-100 shadow-sm transition-transform group-hover:scale-110">
                             {p.full_name.charAt(0)}
                           </div>
                           <div className="flex flex-col">
                             <span className="font-bold text-slate-800">{p.full_name}</span>
                             <span className="text-xs text-slate-400 font-medium tracking-wide">ID: UID-{p.patient_id}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-slate-600 text-sm font-medium bg-slate-100 px-2.5 py-1 rounded-md">
                              {p.contact_number}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-slate-600 text-sm">
                           <div className="flex flex-col gap-1">
                             <span className="font-medium text-slate-700">{p.gender}</span>
                             <span className="text-red-500 font-bold bg-red-50 px-2 rounded w-fit text-xs border border-red-100 uppercase">{p.blood_group}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                           {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button className="text-slate-400 hover:text-primary-600 transition-colors p-2 rounded hover:bg-primary-50">
                             <Edit3 className="w-5 h-5" />
                           </button>
                         </td>
                       </tr>
                     ))
                   )}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}
