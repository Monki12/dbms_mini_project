import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { FlaskConical, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface LabOrder {
  lab_order_id: number;
  status: string;
  priority: string;
  ordered_at: string;
  expected_at: string;
  test_name: string;
  test_code: string;
  category: string;
  price: number;
  result_summary: string | null;
  is_abnormal: number | null;
  result_text: string | null;
  doctor_name: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  SAMPLE_COLLECTED: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-violet-100 text-violet-700 border-violet-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const priorityColors: Record<string, string> = {
  ROUTINE: 'bg-slate-100 text-slate-600',
  URGENT: 'bg-orange-100 text-orange-600',
  STAT: 'bg-red-100 text-red-600',
};

export default function PatientLabResults() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    apiClient.get('/api/my-orders')
      .then((res) => setOrders(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lab Results</h1>
        <p className="text-sm text-slate-500 mt-1">Your lab orders and test results, ordered by your doctors.</p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="font-medium">Loading lab results...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <FlaskConical className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No lab orders found.</p>
          <p className="text-sm text-slate-400 mt-1">Lab tests ordered during consultations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.lab_order_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === order.lab_order_id ? null : order.lab_order_id)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                      order.is_abnormal ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'
                    }`}>
                      <FlaskConical className={`w-5 h-5 ${order.is_abnormal ? 'text-red-500' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{order.test_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{order.category} · {order.test_code} · Dr. {order.doctor_name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[order.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityColors[order.priority] || 'bg-slate-100 text-slate-500'}`}>
                          {order.priority}
                        </span>
                        {order.is_abnormal === 1 && (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Abnormal
                          </span>
                        )}
                        {order.status === 'COMPLETED' && order.is_abnormal === 0 && (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Normal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">
                      {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">₹{Number(order.price).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </button>

              {expanded === order.lab_order_id && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ordered</p>
                      <p className="text-slate-800">{order.ordered_at ? new Date(order.ordered_at).toLocaleString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Expected By</p>
                      <p className="text-slate-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {order.expected_at ? new Date(order.expected_at).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                  {order.result_summary ? (
                    <div className={`rounded-lg border p-4 ${order.is_abnormal ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2 ${order.is_abnormal ? 'text-red-600' : 'text-green-600'}">
                        {order.is_abnormal ? '⚠ Abnormal Result' : '✓ Normal Result'}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">{order.result_summary}</p>
                      {order.result_text && (
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{order.result_text}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
                      Results not yet available. Current status: <strong>{order.status.replace('_', ' ')}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}