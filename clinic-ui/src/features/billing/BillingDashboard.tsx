import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { CreditCard, DollarSign, TrendingUp, CheckCircle, Activity } from 'lucide-react';

interface Bill {
  billing_id: number;
  appointment_id: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  payment_mode: string | null;
  created_at: string;
}

interface ReportRow {
  dept_name: string;
  revenue_month: string;
  total_billed: number;
  total_collected: number;
  collection_rate_pct: number;
}

export default function BillingDashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     fetchBilling();
  }, []);

  const fetchBilling = async () => {
     try {
         const res = await apiClient.get('/billing');
         setBills(res.data.data);
         
         const rpt = await apiClient.get('/billing/report');
         setReport(rpt.data.data);
     } catch(e) {
         console.error("Binding failure securely syncing schemas", e);
     } finally {
         setLoading(false);
     }
  }

  const payBill = async (id: number, remaining: number) => {
     if(remaining <= 0) return;
     try {
         // Mock paying structurally bypassing raw UI limits to show Oracle bounds capturing
         const payment = Math.max(1, remaining / 2);
         await apiClient.post(`/billing/${id}/pay`, { amount_paid: payment, payment_mode: 'CARD' });
         fetchBilling();
     } catch(e) {
         alert("Transaction failed validation bound securely in Backend.");
     }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Revenue Tracking</h1>
            <p className="text-sm text-slate-500 font-medium">Materialized bounds directly computed natively via Trigger invariants.</p>
          </div>
       </div>

       {loading ? (
             <div className="glass-panel p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                 <Activity className="w-6 h-6 animate-spin text-primary-500" />
                 <span className="font-medium">Aggregating transactional schemas...</span>
             </div>
       ) : (
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               
               {/* Invoices List */}
               <div className="bg-white rounded-xl shadow-glass border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                      <CreditCard className="w-5 h-5 text-primary-600" />
                      <h2 className="font-bold text-slate-800">Pending & Collected Overlays</h2>
                  </div>
                  <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                     {bills.map(b => (
                         <div key={b.billing_id} className="bg-slate-50/50 border border-slate-100 rounded-lg p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary-100 transition-colors group">
                             <div>
                                 <h3 className="font-bold text-slate-800 flex items-center gap-3">
                                     Invoice HD-{b.billing_id}
                                     <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded shadow-sm border ${
                                         b.payment_status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' :
                                         b.payment_status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                         'bg-slate-200 text-slate-600 border-slate-300'
                                     }`}>{b.payment_status}</span>
                                 </h3>
                                 <p className="text-xs text-slate-500 mt-1.5 font-medium">Sequenced to Appointment bounds #{b.appointment_id}</p>
                                 <div className="mt-3 text-sm font-bold bg-white w-fit px-3 py-1.5 rounded-md border border-slate-200 flex shadow-sm">
                                     <span className="text-slate-700 flex items-center gap-1"><DollarSign className="w-4 h-4 text-slate-400" /> Total {b.total_amount}</span>
                                     <span className="mx-3 text-slate-300 font-light">|</span>
                                     <span className="text-green-600 flex items-center gap-1"><DollarSign className="w-4 h-4" /> Cleared {b.amount_paid || 0}</span>
                                 </div>
                             </div>
                             <div className="flex-shrink-0 mt-2 sm:mt-0">
                                 {b.payment_status !== 'PAID' ? (
                                     <button 
                                        onClick={() => payBill(b.billing_id, b.total_amount - b.amount_paid)}
                                        className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-4 shadow-sm w-full sm:w-auto hover:bg-primary-700 transition-colors"
                                     >
                                         <DollarSign className="w-4 h-4" /> Trigger Mock Partial
                                     </button>
                                 ) : (
                                     <div className="flex items-center justify-center gap-1.5 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg border border-green-100 w-full sm:w-auto">
                                         <CheckCircle className="w-5 h-5" /> Secured Base
                                     </div>
                                 )}
                             </div>
                         </div>
                     ))}
                  </div>
               </div>

               {/* Materialized Report */}
               <div className="bg-white rounded-xl shadow-glass border border-slate-200 overflow-hidden h-fit">
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-primary-50">
                      <TrendingUp className="w-5 h-5 text-primary-600" />
                      <h2 className="font-bold text-primary-900 flex-1">Database Real-time Metrics</h2>
                      <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2 py-1 rounded shadow-sm border border-primary-200">V_DEPT_REVENUE</span>
                  </div>
                  <div className="p-5 space-y-4">
                     {report.length === 0 ? (
                         <div className="text-sm text-slate-500 font-medium text-center py-4">No Materialized Views are overlapping properly.</div>
                     ) : (
                         report.map((r, i) => (
                             <div key={i} className="flex flex-col gap-3 p-5 bg-slate-50 rounded-lg border border-slate-200 group hover:border-primary-300 transition-colors shadow-sm relative overflow-hidden">
                                 <div className="absolute right-0 top-0 w-2 h-full bg-slate-200 group-hover:bg-primary-400 transition-colors"></div>
                                 
                                 <div className="flex items-center justify-between pr-4">
                                     <span className="font-bold text-slate-800 text-lg">{r.dept_name}</span>
                                     <span className="text-xs tracking-wider bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold uppercase shadow-sm">
                                         {new Date(r.revenue_month).toLocaleDateString(undefined, {month: 'short', year: 'numeric'})}
                                     </span>
                                 </div>
                                 
                                 <div className="flex items-center justify-between text-sm mt-1 pr-4 bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                                     <span className="text-slate-500 font-medium flex flex-col">Gross Validated: <span className="text-slate-800 font-bold text-base">${r.total_billed}</span></span>
                                     <span className="text-green-600 font-medium flex flex-col text-right">Liquidity: <span className="font-bold text-base">${r.total_collected}</span></span>
                                 </div>
                                 
                                 <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3 overflow-hidden shadow-inner pr-4">
                                     <div className="bg-primary-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${r.collection_rate_pct || 0}%` }}></div>
                                 </div>
                                 <div className="text-right text-xs text-primary-600 font-bold tracking-wider pt-1 pr-4">
                                     {r.collection_rate_pct ? r.collection_rate_pct.toFixed(1) : 0}% OVERALL RECOVERY
                                 </div>
                             </div>
                         ))
                     )}
                  </div>
               </div>

           </div>
       )}
    </div>
  );
}
