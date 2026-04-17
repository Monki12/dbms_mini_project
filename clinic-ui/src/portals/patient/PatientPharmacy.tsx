import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { ShoppingBag, Activity, Pill } from 'lucide-react';

interface DispensingRecord {
  dispensing_id: number;
  dispensed_at: string;
  quantity_dispensed: number;
  unit_price: number;
  total_price: number;
  medicine_name: string;
  generic_name: string;
  category: string;
  prescription_id: number;
}

export default function PatientPharmacy() {
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/pharmacy/my-dispensing')
      .then((res) => setRecords(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = records.reduce((sum, r) => sum + Number(r.total_price || 0), 0);

  // Group by prescription
  const byPrescription = records.reduce<Record<number, DispensingRecord[]>>((acc, r) => {
    (acc[r.prescription_id] = acc[r.prescription_id] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy</h1>
          <p className="text-sm text-slate-500 mt-1">Medicines dispensed to you from the clinic pharmacy.</p>
        </div>
        {records.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-right">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Spent</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="font-medium">Loading pharmacy records...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No medicines dispensed yet.</p>
          <p className="text-sm text-slate-400 mt-1">Medicines dispensed from the pharmacy against your prescriptions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byPrescription).map(([prescId, items]) => {
            const date = items[0]?.dispensed_at;
            const prescTotal = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
            return (
              <div key={prescId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Prescription #{prescId}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {date ? new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{items.length} item{items.length > 1 ? 's' : ''}</p>
                    <p className="font-bold text-slate-700 text-sm mt-0.5">₹{prescTotal.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <div key={item.dispensing_id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{item.medicine_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.generic_name} · {item.category}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-500">{item.quantity_dispensed} × ₹{Number(item.unit_price).toFixed(2)}</p>
                        <p className="font-bold text-slate-700 text-sm mt-0.5">₹{Number(item.total_price).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}