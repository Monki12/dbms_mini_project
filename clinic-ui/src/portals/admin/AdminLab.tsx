import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { FlaskConical, Activity, AlertCircle, CheckCircle, X, Upload, ChevronDown } from 'lucide-react';

interface LabOrder {
  lab_order_id: number;
  consultation_id: number;
  patient_id: number;
  status: string;
  priority: string;
  clinical_notes: string | null;
  ordered_at: string;
  expected_at: string;
  test_name: string;
  test_code: string;
  category: string;
  price: number;
  patient_name: string;
}

const STATUS_OPTIONS = ['PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  SAMPLE_COLLECTED: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-violet-100 text-violet-700 border-violet-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function AdminLab() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // Status update
  const [statusModal, setStatusModal] = useState<LabOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Result upload
  const [resultModal, setResultModal] = useState<LabOrder | null>(null);
  const [resultSummary, setResultSummary] = useState('');
  const [resultText, setResultText] = useState('');
  const [isAbnormal, setIsAbnormal] = useState(0);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState('');

  const fetchOrders = (status?: string) => {
    setLoading(true);
    const params = status ? `?status=${status}` : '';
    apiClient.get(`/api/orders${params}`)
      .then((res) => setOrders(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(filterStatus || undefined); }, [filterStatus]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal || !newStatus) return;
    setStatusError('');
    setStatusLoading(true);
    try {
      await apiClient.patch(`/api/orders/${statusModal.lab_order_id}/status?status=${newStatus}`);
      setStatusModal(null);
      fetchOrders(filterStatus || undefined);
    } catch (err: any) {
      setStatusError(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleResultUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultModal) return;
    setResultError('');
    setResultLoading(true);
    try {
      await apiClient.post(`/api/orders/${resultModal.lab_order_id}/result`, {
        result_summary: resultSummary,
        result_text: resultText || null,
        is_abnormal: isAbnormal,
      });
      setResultModal(null);
      fetchOrders(filterStatus || undefined);
    } catch (err: any) {
      setResultError(err.response?.data?.detail || err.response?.data?.error || 'Failed to upload result.');
    } finally {
      setResultLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lab Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track lab orders, update status, and upload results.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input-field py-2 text-sm w-48"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border">
            {orders.length} orders
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-primary-500" />
          <span className="font-medium">Loading lab orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <FlaskConical className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold">No lab orders found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Test</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.lab_order_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">#{order.lab_order_id}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                    </p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded mt-1 inline-block ${
                      order.priority === 'STAT' ? 'bg-red-100 text-red-600' :
                      order.priority === 'URGENT' ? 'bg-orange-100 text-orange-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>{order.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{order.patient_name}</p>
                    <p className="text-xs text-slate-400">ID: {order.patient_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{order.test_name}</p>
                    <p className="text-xs text-slate-400">{order.category} · ₹{Number(order.price).toLocaleString('en-IN')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${statusColors[order.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setStatusModal(order); setNewStatus(order.status); setStatusError(''); }}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-200 transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" /> Status
                      </button>
                      {order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => { setResultModal(order); setResultSummary(''); setResultText(''); setIsAbnormal(0); setResultError(''); }}
                          className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:bg-teal-50 px-2.5 py-1.5 rounded-md border border-teal-200 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" /> Result
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Update Status</h3>
              <button onClick={() => setStatusModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleStatusUpdate} className="p-6 space-y-4">
              {statusError && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{statusError}
                </div>
              )}
              <p className="text-sm text-slate-600">Order #{statusModal.lab_order_id} — {statusModal.test_name}</p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">New Status</label>
                <select required className="input-field" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStatusModal(null)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={statusLoading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {statusLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Result Upload Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-600" /> Upload Result
              </h3>
              <button onClick={() => setResultModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleResultUpload} className="p-6 space-y-4">
              {resultError && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{resultError}
                </div>
              )}
              <p className="text-sm text-slate-600">Order #{resultModal.lab_order_id} — {resultModal.test_name} for {resultModal.patient_name}</p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Result Summary <span className="text-red-500">*</span></label>
                <input required type="text" maxLength={2000} className="input-field" placeholder="All values within normal range"
                  value={resultSummary} onChange={(e) => setResultSummary(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Detailed Notes (optional)</label>
                <textarea rows={3} className="input-field resize-none" placeholder="WBC: 7.2, RBC: 4.8..."
                  value={resultText} onChange={(e) => setResultText(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Mark as Abnormal?</label>
                <button
                  type="button"
                  onClick={() => setIsAbnormal(isAbnormal ? 0 : 1)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAbnormal ? 'bg-red-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isAbnormal ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                {isAbnormal ? <span className="text-xs font-bold text-red-600">Abnormal</span> : <span className="text-xs text-slate-400">Normal</span>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setResultModal(null)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={resultLoading} className="flex-1 btn-primary bg-teal-600 hover:bg-teal-700 flex items-center justify-center gap-2">
                  {resultLoading ? 'Uploading...' : <><CheckCircle className="w-4 h-4" /> Upload Result</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}