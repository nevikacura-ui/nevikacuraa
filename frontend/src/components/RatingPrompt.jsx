import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, X, Send, MessageSquare, UserCheck, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const StarInput = ({ value, onChange }) => (
  <div className="flex gap-1.5">
    {[1, 2, 3, 4, 5].map(s => (
      <button key={s} onClick={() => onChange(s)} className="p-0.5 transition-transform active:scale-90">
        <Star className={`w-8 h-8 transition-all ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      </button>
    ))}
  </div>
);

export default function RatingPrompt() {
  const [pending, setPending] = useState(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState('prompt'); // prompt -> rate -> done
  const [billingRating, setBillingRating] = useState(0);
  const [behaviourRating, setBehaviourRating] = useState(0);
  const [clinicExp, setClinicExp] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const phone = localStorage.getItem('guestMobile') || '';

  useEffect(() => {
    if (!phone) return;
    const dismissed = sessionStorage.getItem('rating_dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => {
      checkPending();
    }, 3000); // Delay 3s after page load
    return () => clearTimeout(timer);
  }, []);

  const checkPending = async () => {
    try {
      const res = await axios.get(`${API}/api/ratings/pending/${phone}`);
      const list = res.data?.pending || [];
      if (list.length > 0) {
        setPending(list[0]); // Show first unrated appointment
        setVisible(true);
      }
    } catch { }
  };

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem('rating_dismissed', '1');
  };

  const handleSubmit = async () => {
    if (billingRating === 0 || behaviourRating === 0 || !clinicExp) {
      toast.error('Please complete all ratings');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/ratings/submit`, {
        appointment_id: pending.appointment_id,
        phone,
        billing_experience: billingRating,
        staff_behaviour: behaviourRating,
        clinic_experience: clinicExp,
        feedback_text: feedback || null,
        doctor_name: pending.doctor,
        clinic_name: pending.clinic,
      });
      setStep('done');
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Failed to submit');
    }
    setSubmitting(false);
  };

  if (!visible || !pending) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" data-testid="rating-prompt-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Bottom Sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-slide-up"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}>

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Close button */}
        <button onClick={dismiss} className="absolute top-3 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"
          data-testid="rating-prompt-close">
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Step: Initial Prompt */}
        {step === 'prompt' && (
          <div className="px-5 pb-6 pt-2 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}>
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-[#1A2B28]">How was your visit?</h3>
            <p className="text-sm text-[#8A9E99] mt-1 mb-1">
              {pending.doctor && `With ${pending.doctor}`}{pending.doctor && pending.clinic && ' at '}{pending.clinic}
            </p>
            {pending.date && (
              <p className="text-xs text-[#B0BDB9]">{pending.date}{pending.time ? ` - ${pending.time}` : ''}</p>
            )}

            <div className="flex gap-3 mt-5">
              <Button onClick={dismiss} variant="outline"
                className="flex-1 h-11 rounded-xl font-semibold text-gray-500 border-gray-200"
                data-testid="rating-prompt-later">
                Maybe Later
              </Button>
              <Button onClick={() => setStep('rate')}
                className="flex-1 h-11 rounded-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
                data-testid="rating-prompt-rate">
                Rate Now
              </Button>
            </div>
          </div>
        )}

        {/* Step: Rating Form */}
        {step === 'rate' && (
          <div className="px-5 pb-6 pt-2">
            {/* Staff Rating */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-[#1F4F46]" />
                <h4 className="font-bold text-[#1A2B28] text-sm">Staff Rating</h4>
              </div>
              <div className="space-y-4">
                <div data-testid="star-billing">
                  <p className="text-xs font-semibold text-[#4A6B64] mb-1.5">Billing Timing & Experience</p>
                  <StarInput value={billingRating} onChange={setBillingRating} />
                </div>
                <div data-testid="star-behaviour">
                  <p className="text-xs font-semibold text-[#4A6B64] mb-1.5">Staff Behaviour</p>
                  <StarInput value={behaviourRating} onChange={setBehaviourRating} />
                </div>
              </div>
            </div>

            {/* Clinic Experience - Good/Bad */}
            <div className="mb-5">
              <h4 className="font-bold text-[#1A2B28] text-sm mb-3">Overall Clinic Experience</h4>
              <div className="flex gap-3">
                <button onClick={() => setClinicExp('good')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all font-semibold text-sm ${
                    clinicExp === 'good' ? 'text-white shadow-lg scale-[1.02]' : 'text-gray-400 bg-gray-50'
                  }`}
                  style={clinicExp === 'good' ? { background: 'linear-gradient(135deg, #10B981, #059669)', border: '2px solid #059669' } : { border: '2px solid #E5E7EB' }}
                  data-testid="exp-good">
                  <ThumbsUp className="w-5 h-5" /> Good
                </button>
                <button onClick={() => setClinicExp('bad')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all font-semibold text-sm ${
                    clinicExp === 'bad' ? 'text-white shadow-lg scale-[1.02]' : 'text-gray-400 bg-gray-50'
                  }`}
                  style={clinicExp === 'bad' ? { background: 'linear-gradient(135deg, #EF4444, #DC2626)', border: '2px solid #DC2626' } : { border: '2px solid #E5E7EB' }}
                  data-testid="exp-bad">
                  <ThumbsDown className="w-5 h-5" /> Bad
                </button>
              </div>
            </div>

            {/* Optional Feedback */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#8A9E99]" />
                <p className="text-xs font-medium text-[#8A9E99]">Additional feedback (optional)</p>
              </div>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="Tell us more..."
                rows={2}
                className="w-full p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-[#1F4F46] bg-gray-50"
                data-testid="rating-feedback"
              />
            </div>

            {/* Submit */}
            <Button onClick={handleSubmit}
              disabled={submitting || billingRating === 0 || behaviourRating === 0 || !clinicExp}
              className="w-full h-12 rounded-xl font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
              data-testid="rating-submit">
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send className="w-4 h-4 mr-2" /> Submit Rating</>}
            </Button>
          </div>
        )}

        {/* Step: Thank You */}
        {step === 'done' && (
          <div className="px-5 pb-6 pt-2 text-center">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
            <h3 className="text-lg font-bold text-[#1A2B28]">Thank You!</h3>
            <p className="text-sm text-[#8A9E99] mt-1 mb-4">Your feedback helps us improve care</p>

            {/* Google Review Nudge — only for 4-5 star ratings */}
            {(billingRating >= 4 || behaviourRating >= 4) && (
              <div className="mb-4 p-3.5 rounded-xl bg-blue-50 border border-blue-100" data-testid="google-review-nudge">
                <p className="text-xs font-semibold text-blue-800 mb-2">Glad you had a great experience!</p>
                <button
                  onClick={() => {
                    window.open('https://g.page/r/CZBa3QPJ_1lXEAE/review', '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-all text-sm font-bold text-blue-700"
                  data-testid="google-review-btn"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Rate us on Google
                </button>
              </div>
            )}

            <Button onClick={dismiss}
              className="w-full h-11 rounded-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
              data-testid="rating-done">
              Done
            </Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
