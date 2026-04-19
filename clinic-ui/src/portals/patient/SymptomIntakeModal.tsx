import React, { useState } from 'react';
import {
  X, Stethoscope, AlertCircle, Activity, CheckCircle, Siren,
  ChevronRight, Calendar, Clock, Sparkles,
} from 'lucide-react';
import apiClient from '../../api/client';

interface Slot { date: string; time: string; }

interface Recommendation {
  doctor_id: number;
  full_name: string;
  specialisation: string;
  qualification: string;
  department_name: string;
  consultation_fee: number;
  reason: string;
  next_slots: Slot[];
}

interface SuggestResponse {
  emergency: boolean;
  recommendations: Recommendation[];
}

interface Props {
  onClose: () => void;
  onBooked: () => void;
  onFallbackToManual: () => void;
}

function formatSlotLabel(slot: Slot) {
  const d = new Date(slot.date + 'T00:00:00');
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${day} · ${slot.time}`;
}

export default function SymptomIntakeModal({ onClose, onBooked, onFallbackToManual }: Props) {
  const [step, setStep] = useState<'intake' | 'results'>('intake');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState<SuggestResponse | null>(null);

  // Booking state
  const [bookingSlot, setBookingSlot] = useState<{ doctor: Recommendation; slot: Slot } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [reasonText, setReasonText] = useState('');

  const handleGetSuggestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/api/appointments/suggest-doctor', { symptoms });
      setSuggestions(res.data.data);
      setStep('results');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Could not fetch suggestions. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (doctor: Recommendation, slot: Slot) => {
    setBookingSlot({ doctor, slot });
    setBookingError('');
    setBookingLoading(true);
    try {
      await apiClient.post('/api/patient/appointments', {
        doctor_id: doctor.doctor_id,
        appt_date: slot.date,
        slot_start: slot.time,
        reason_for_visit: reasonText || symptoms.slice(0, 200) || null,
      });
      setBookingSuccess(true);
    } catch (err: any) {
      setBookingError(
        err.response?.data?.detail || err.response?.data?.error || 'Booking failed. Please try another slot.'
      );
      setBookingSlot(null);
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────
  if (bookingSuccess && bookingSlot) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-800 text-xl">Appointment Booked!</p>
          <p className="text-sm text-slate-600">
            With <span className="font-semibold">Dr. {bookingSlot.doctor.full_name}</span>
            <br />
            {formatSlotLabel(bookingSlot.slot)}
          </p>
          <button
            onClick={() => { onBooked(); onClose(); }}
            className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {step === 'intake'
              ? <><Sparkles className="w-5 h-5 text-emerald-500" /> AI-Assisted Booking</>
              : <><Stethoscope className="w-5 h-5 text-emerald-600" /> Recommended Doctors</>
            }
          </h3>
          <div className="flex items-center gap-2">
            {step === 'results' && (
              <button onClick={() => setStep('intake')}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-50">
                ← Back
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Symptom intake ── */}
          {step === 'intake' && (
            <form onSubmit={handleGetSuggestions} className="p-6 space-y-5">
              <p className="text-sm text-slate-600">
                Describe your symptoms and we'll suggest the right specialist for you.
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  What's bothering you?
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={500}
                  className="input-field resize-none"
                  placeholder="e.g. Sharp chest pain and shortness of breath since this morning..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">{symptoms.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Additional context for the doctor{' '}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  className="input-field"
                  placeholder="e.g. Diabetic, taking Metformin daily..."
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={onFallbackToManual}
                  className="flex-1 btn-secondary text-sm">
                  I know which doctor I want →
                </button>
                <button type="submit" disabled={loading || !symptoms.trim()}
                  className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading
                    ? <><Activity className="w-4 h-4 animate-spin" /> Analysing...</>
                    : <><Sparkles className="w-4 h-4" /> Get Suggestions</>
                  }
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2: AI results ── */}
          {step === 'results' && suggestions && (
            <div className="p-6 space-y-4">

              {/* Emergency banner */}
              {suggestions.emergency && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <Siren className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700 text-sm">Your symptoms may need urgent care.</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Consider using the <span className="font-semibold">Emergency button</span> in the sidebar instead of a regular booking.
                    </p>
                  </div>
                </div>
              )}

              {bookingError && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{bookingError}
                </div>
              )}

              {suggestions.recommendations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No doctors matched your symptoms.</p>
                  <button onClick={onFallbackToManual} className="btn-secondary text-sm mt-3">
                    Browse all doctors →
                  </button>
                </div>
              ) : (
                suggestions.recommendations.map((doc) => (
                  <div key={doc.doctor_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Doctor info */}
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">Dr. {doc.full_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{doc.specialisation} · {doc.department_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{doc.qualification}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                          ₹{doc.consultation_fee}
                        </span>
                      </div>
                      {doc.reason && (
                        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3 leading-relaxed">
                          <span className="font-bold">Why this doctor:</span> {doc.reason}
                        </p>
                      )}
                    </div>

                    {/* Slot grid */}
                    {doc.next_slots.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400 italic">No available slots in the next 30 days.</p>
                    ) : (
                      <div className="p-3 flex flex-wrap gap-2">
                        {doc.next_slots.map((slot) => (
                          <button
                            key={`${slot.date}-${slot.time}`}
                            disabled={bookingLoading}
                            onClick={() => handleBook(doc, slot)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors disabled:opacity-50"
                          >
                            <Calendar className="w-3 h-3" />
                            {slot.date.slice(5)} {/* MM-DD */}
                            <Clock className="w-3 h-3 ml-0.5" />
                            {slot.time}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              <p className="text-center text-xs text-slate-400 pt-2">
                Don't see what you need?{' '}
                <button onClick={onFallbackToManual} className="text-emerald-600 font-semibold hover:underline">
                  Browse all doctors
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
