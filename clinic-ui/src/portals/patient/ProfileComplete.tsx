import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { CheckCircle, AlertCircle, User } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const GENDERS = ['Male', 'Female', 'Other'];

function PhoneInput({ label, value, onChange, required = true }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const invalid = touched && value.length > 0 && value.length !== 10;
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type="tel"
        required={required}
        inputMode="numeric"
        maxLength={10}
        pattern="[0-9]{10}"
        className={`input-field ${invalid ? 'border-red-400 focus:border-red-500' : ''}`}
        placeholder="9876543210"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        onBlur={() => setTouched(true)}
      />
      {invalid && (
        <p className="mt-1 text-xs text-red-500 font-medium">Enter a 10-digit phone number ({value.length}/10)</p>
      )}
    </div>
  );
}

export default function ProfileComplete() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    gender: 'Other',
    blood_group: 'Unknown',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await apiClient.put('/api/patient/profile/complete', form);
      navigate('/patient');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl shadow-lg mb-4">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Fill in your details to activate your patient account.</p>
        </div>

        <div className="glass-panel p-8">
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2 font-medium mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text" required className="input-field"
                  value={form.full_name} onChange={(e) => set('full_name', e.target.value)}
                  placeholder="Priya Sharma"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date" required className="input-field"
                  value={form.dob} onChange={(e) => set('dob', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Gender</label>
                <select className="input-field" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Blood Group</label>
                <select className="input-field" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                  {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email" className="input-field"
                  value={form.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="priya@example.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text" required className="input-field"
                  value={form.address} onChange={(e) => set('address', e.target.value)}
                  placeholder="123, MG Road, Bangalore"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Emergency Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                    <input
                      type="text" required className="input-field"
                      value={form.emergency_contact_name}
                      onChange={(e) => set('emergency_contact_name', e.target.value)}
                      placeholder="Raj Sharma"
                    />
                  </div>
                  <PhoneInput
                    label="Phone"
                    value={form.emergency_contact_phone}
                    onChange={(v) => set('emergency_contact_phone', v)}
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Relation</label>
                    <input
                      type="text" required className="input-field"
                      value={form.emergency_contact_relation}
                      onChange={(e) => set('emergency_contact_relation', e.target.value)}
                      placeholder="Father"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || form.emergency_contact_phone.length !== 10}
                className="w-full py-3 flex justify-center items-center gap-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Activate My Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
