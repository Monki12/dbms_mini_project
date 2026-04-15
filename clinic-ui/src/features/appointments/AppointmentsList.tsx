import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Calendar as CalendarIcon, Clock, CheckCircle, Activity, User, Stethoscope } from 'lucide-react';

interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  appt_date: string;
  slot_start: string;
  status: string;
}

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await apiClient.get('/appointments');
      setAppointments(res.data.data);
    } catch (error) {
      console.error("Binding failure natively", error);
    } finally {
      setLoading(false);
    }
  };

  const completeAppointment = async (id: number) => {
    // Quick mock integration utilizing default parameters skipping modal structures explicitly for completion
    try {
        await apiClient.post(`/appointments/${id}/complete`, {
            complaint: "Routine Follow-up",
            diagnosis: "Healthy Parameter Checks",
            treatment_notes: "Track strictly via bounds.",
        });
        fetchAppointments();
    } catch(err) {
        alert("Integrity clash or transition blocked dynamically.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
             <h1 className="text-2xl font-bold text-slate-900">Appointment Sequences</h1>
             <p className="text-sm text-slate-500 font-medium">Verify the PL/SQL driven Double-booking block natively here.</p>
          </div>
          <button className="btn-primary flex items-center justify-center gap-2 shadow-primary-500/30">
            <CalendarIcon className="w-5 h-5" /> Book Consultation Slot
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Live Array timeline */}
         <div className="lg:col-span-8 space-y-4">
           {loading ? (
             <div className="glass-panel p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                 <Activity className="w-6 h-6 animate-spin text-primary-500" />
                 <span className="font-medium">Evaluating Oracle SYS_REFCURSOR constraints...</span>
             </div>
           ) : appointments.length === 0 ? (
             <div className="glass-panel p-12 text-center text-slate-500 font-medium">No valid clinical matrices intercepted.</div>
           ) : (
             appointments.map(a => (
               <div key={a.appointment_id} className="bg-white border text-left border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                  <div className="flex items-start gap-4 w-full">
                     <div className={`p-3 rounded-lg shadow-sm ${a.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-primary-50 text-primary-600 border border-primary-100'}`}>
                       {a.status === 'COMPLETED' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                     </div>
                     <div className="flex-1">
                       <h3 className="font-bold text-slate-800 text-lg leading-tight">Interaction #{a.appointment_id}</h3>
                       
                       <div className="flex items-center gap-4 mt-2">
                           <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                <Stethoscope className="w-3.5 h-3.5 text-slate-400" /> Doc UID: {a.doctor_id}
                           </p>
                           <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5 border-l border-slate-200 pl-4">
                                <User className="w-3.5 h-3.5 text-slate-400" /> Pat UID: {a.patient_id}
                           </p>
                       </div>

                       <div className="mt-3 flex items-center gap-2 text-sm font-bold text-primary-700 bg-primary-50/50 w-fit px-3 py-1.5 rounded-md border border-primary-100">
                         <CalendarIcon className="w-4 h-4 text-primary-500" />
                         {new Date(a.appt_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})} 
                         <span className="text-slate-300 px-1">|</span> 
                         {new Date(a.slot_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                     </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 border-t sm:border-none border-slate-100 pt-4 sm:pt-0">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full tracking-wide shadow-sm ${
                      a.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {a.status}
                    </span>
                    
                    {a.status === 'SCHEDULED' && (
                        <button 
                            onClick={() => completeAppointment(a.appointment_id)}
                            className="text-xs font-bold text-primary-600 hover:text-white hover:bg-primary-600 px-3 py-1.5 rounded-md border border-primary-200 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                        >
                            Finalize Interaction
                        </button>
                    )}
                  </div>
               </div>
             ))
           )}
         </div>
         
         <div className="lg:col-span-4 space-y-6 flex flex-col">
            <div className="glass-panel p-6 border-t-4 border-t-primary-500">
               <h3 className="font-bold text-slate-800 text-lg mb-1">Live Integrations</h3>
               <p className="text-sm text-slate-500 font-medium">Aggregated completely via DB layer boundaries mapping identically over.</p>
               
               <div className="mt-5 space-y-3">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm group hover:border-amber-300 transition-colors">
                    <span className="text-slate-600 text-sm font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" /> Active Queues
                    </span>
                    <span className="font-bold text-slate-800 text-lg group-hover:scale-110 transition-transform">
                      {appointments.filter(a => a.status === 'SCHEDULED').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm group hover:border-green-300 transition-colors">
                    <span className="text-slate-600 text-sm font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" /> Archived Finalized
                    </span>
                    <span className="font-bold text-slate-800 text-lg group-hover:scale-110 transition-transform">
                      {appointments.filter(a => a.status === 'COMPLETED').length}
                    </span>
                  </div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}
