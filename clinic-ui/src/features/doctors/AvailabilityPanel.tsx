import React, { useState } from 'react';
import apiClient from '../../api/client';
import { Calendar, Clock, Activity, Target, User } from 'lucide-react';

export default function AvailabilityPanel() {
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchAvailability = async () => {
    if (!doctorId || !date) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await apiClient.get(`/doctors/${doctorId}/availability?date=${date}`);
      setSlots(res.data.data.available_slots);
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 border-l-4 border-l-emerald-500 relative overflow-hidden group shadow-sm">
      <div className="absolute top-0 right-[-10%] w-32 h-32 bg-emerald-100 rounded-full opacity-60 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
      
      <div className="relative z-10 flex items-center gap-3 mb-4">
          <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600 shadow-sm border border-emerald-100">
             <Target className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg tracking-tight">PL/SQL Native Time Bounds Resolver</h3>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-6 flex items-center gap-2">
          Executes the database 
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 border border-slate-200 text-xs font-bold font-mono">SYS_REFCURSOR</code> 
          dynamically stripping unreserved slots globally.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <div className="flex-1 relative shadow-sm">
             <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input type="number" placeholder="Doctor Node ID (e.g., 2)" className="input-field pl-10" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
          </div>
          <div className="flex-1 relative shadow-sm">
             <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input type="date" className="input-field pl-10 cursor-pointer" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button onClick={fetchAvailability} disabled={loading || !doctorId || !date} className="btn-primary bg-emerald-600 hover:bg-emerald-700 border border-emerald-800 justify-center shadow-emerald-500/30 whitespace-nowrap px-6">
             {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Resolve Bounds"}
          </button>
      </div>

      {searched && !loading && (
          <div className="mt-6 border-t border-slate-100 pt-6 animate-fade-in-up relative z-10">
              {slots.length === 0 ? (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 font-semibold shadow-sm inline-flex">
                      Zero valid blocks returned matching specifications.
                  </p>
              ) : (
                  <div className="flex flex-wrap gap-2.5">
                     {slots.map((s, i) => (
                         <span key={i} className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-default shadow-sm group/slot">
                             <Clock className="w-4 h-4 text-slate-400 group-hover/slot:text-emerald-500 transition-colors" />
                             {s}
                         </span>
                     ))}
                  </div>
              )}
          </div>
      )}
    </div>
  );
}
