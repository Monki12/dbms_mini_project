import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import apiClient from '../../api/client';
import { Activity, Phone, AlertCircle, ShieldCheck } from 'lucide-react';

export default function PatientLogin() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await apiClient.post('/api/patient/auth/login', { phone_number: phone });
      const { access_token, refresh_token, is_new_patient, patient_id } = res.data;
      setAuth(
        access_token,
        { user_id: patient_id, role: 'PATIENT', linked_entity_id: patient_id, display_name: phone },
        refresh_token
      );
      if (is_new_patient) navigate('/patient/complete-profile');
      else navigate('/patient');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Login failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-100 rounded-full blur-[120px] opacity-50 mix-blend-multiply" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-100 rounded-full blur-[100px] opacity-50 mix-blend-multiply" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-emerald-600 p-3.5 rounded-2xl shadow-xl ring-4 ring-emerald-50">
            <Activity className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Patient Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Enter your registered mobile number to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-8 px-4 sm:rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2 font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <div className="relative rounded-lg shadow-sm group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="tel"
                  required
                  minLength={10}
                  maxLength={15}
                  pattern="\d+"
                  className="input-field pl-11 block w-full py-2.5 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Enter the phone number linked to your patient record.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || phone.length < 10}
              className="w-full py-3 flex justify-center items-center gap-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Continue to Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link to="/login" className="text-sm text-slate-500 hover:text-primary-600 font-medium">
              Staff / Doctor login &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
