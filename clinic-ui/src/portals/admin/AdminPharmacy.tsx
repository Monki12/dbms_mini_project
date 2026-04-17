import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Pill, Activity, AlertTriangle, X, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';

interface PharmacyItem {
  item_id: number;
  medicine_name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  expiry_date: string;
  batch_number: string;
  low_stock: boolean;
}

interface LowStockItem {
  item_id: number;
  medicine_name: string;
  category: string;
  stock_quantity: number;
  reorder_level: number;
  expiry_date: string;
}

interface DispenseRow {
  item_id: number | '';
  quantity_dispensed: number;
  notes: string;
}

export default function AdminPharmacy() {
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stock' | 'dispense' | 'alerts'>('stock');
  const [search, setSearch] = useState('');

  // Dispense modal
  const [prescriptionId, setPrescriptionId] = useState('');
  const [dispenseRows, setDispenseRows] = useState<DispenseRow[]>([
    { item_id: '', quantity_dispensed: 1, notes: '' }
  ]);
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [dispenseError, setDispenseError] = useState('');
  const [dispenseSuccess, setDispenseSuccess] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/pharmacy/items'),
      apiClient.get('/api/pharmacy/low-stock'),
    ])
      .then(([itemsRes, lowRes]) => {
        setItems(itemsRes.data.data);
        setLowStock(lowRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter((i) =>
    !search || i.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
    i.generic_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDispenseRowChange = (idx: number, field: keyof DispenseRow, value: any) => {
    setDispenseRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispenseError('');
    setDispenseLoading(true);
    try {
      const items_payload = dispenseRows
        .filter((r) => r.item_id !== '')
        .map((r) => ({ item_id: r.item_id, quantity_dispensed: r.quantity_dispensed, notes: r.notes || null }));
      const res = await apiClient.post('/api/pharmacy/dispense', {
        prescription_id: Number(prescriptionId),
        items: items_payload,
      });
      setDispenseSuccess(res.data.data);
      setPrescriptionId('');
      setDispenseRows([{ item_id: '', quantity_dispensed: 1, notes: '' }]);
      // Refresh stock
      const newItems = await apiClient.get('/api/pharmacy/items');
      setItems(newItems.data.data);
      const newLow = await apiClient.get('/api/pharmacy/low-stock');
      setLowStock(newLow.data.data);
    } catch (err: any) {
      setDispenseError(err.response?.data?.detail || err.response?.data?.error || 'Failed to dispense medicines.');
    } finally {
      setDispenseLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Management</h1>
          <p className="text-sm text-slate-500 mt-1">Browse stock, dispense medicines, and monitor low-stock alerts.</p>
        </div>
        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-bold">
            <AlertTriangle className="w-4 h-4" />
            {lowStock.length} low-stock alert{lowStock.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {(['stock', 'dispense', 'alerts'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors ${
              tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t === 'alerts' ? `Alerts${lowStock.length > 0 ? ` (${lowStock.length})` : ''}` : t === 'stock' ? 'Stock' : 'Dispense'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-6 h-6 animate-spin text-primary-500" />
          <span className="font-medium">Loading pharmacy data...</span>
        </div>
      ) : (
        <>
          {/* ── Stock Tab ── */}
          {tab === 'stock' && (
            <div className="space-y-3">
              <input type="text" className="input-field" placeholder="Search medicines..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Medicine</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <tr key={item.item_id} className={`hover:bg-slate-50 transition-colors ${item.low_stock ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{item.medicine_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.generic_name} · {item.manufacturer}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.category}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">₹{Number(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${item.low_stock ? 'text-red-600' : 'text-slate-700'}`}>
                            {item.stock_quantity}
                          </span>
                          {item.low_stock && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1" />}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Dispense Tab ── */}
          {tab === 'dispense' && (
            <div className="max-w-2xl space-y-4">
              {dispenseSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Dispensed successfully!</p>
                    <p className="text-sm mt-0.5">
                      {dispenseSuccess.dispensed_count} item{dispenseSuccess.dispensed_count > 1 ? 's' : ''} dispensed for Prescription #{dispenseSuccess.prescription_id}.
                    </p>
                    <button onClick={() => setDispenseSuccess(null)} className="text-xs underline mt-1">Dispense another</button>
                  </div>
                </div>
              )}
              {!dispenseSuccess && (
                <form onSubmit={handleDispenseSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary-600" /> Dispense Medicines
                  </h2>
                  {dispenseError && (
                    <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{dispenseError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Prescription ID <span className="text-red-500">*</span></label>
                    <input required type="number" min={1} className="input-field" placeholder="e.g. 42"
                      value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Items to Dispense</p>
                    {dispenseRows.map((row, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item {idx + 1}</span>
                          {dispenseRows.length > 1 && (
                            <button type="button" onClick={() => setDispenseRows((p) => p.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 p-1 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Medicine</label>
                            <select required className="input-field text-sm py-2"
                              value={row.item_id}
                              onChange={(e) => handleDispenseRowChange(idx, 'item_id', e.target.value ? Number(e.target.value) : '')}>
                              <option value="">— Select medicine —</option>
                              {items.map((i) => (
                                <option key={i.item_id} value={i.item_id}>
                                  {i.medicine_name} (Stock: {i.stock_quantity}) — ₹{Number(i.unit_price).toFixed(2)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity</label>
                            <input required type="number" min={1} className="input-field text-sm py-2"
                              value={row.quantity_dispensed}
                              onChange={(e) => handleDispenseRowChange(idx, 'quantity_dispensed', parseInt(e.target.value))} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes (optional)</label>
                            <input type="text" className="input-field text-sm py-2" placeholder="Take after meals"
                              value={row.notes}
                              onChange={(e) => handleDispenseRowChange(idx, 'notes', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setDispenseRows((p) => [...p, { item_id: '', quantity_dispensed: 1, notes: '' }])}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-primary-300 hover:text-primary-600 transition-colors">
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  </div>
                  <button type="submit" disabled={dispenseLoading} className="w-full btn-primary flex items-center justify-center gap-2">
                    {dispenseLoading ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Dispensing...</> : <><Pill className="w-4 h-4" /> Dispense Medicines</>}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── Alerts Tab ── */}
          {tab === 'alerts' && (
            <div className="space-y-3">
              {lowStock.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                  <p className="font-semibold">All stock levels are adequate.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-red-600 font-semibold">
                    {lowStock.length} item{lowStock.length > 1 ? 's are' : ' is'} at or below reorder level.
                  </p>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 border-b border-red-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase tracking-wider">Medicine</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-red-600 uppercase tracking-wider">Stock</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-red-600 uppercase tracking-wider">Reorder Level</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-red-600 uppercase tracking-wider">Expiry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lowStock.map((item) => (
                          <tr key={item.item_id} className="hover:bg-red-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                {item.medicine_name}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.category}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">{item.stock_quantity}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-600">{item.reorder_level}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}