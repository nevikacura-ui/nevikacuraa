import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, ChevronLeft, MessageSquare, Send, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const StarRow = ({ value, onChange, label }) => (
  <div className="mb-5" data-testid={`star-row-${label.replace(/\s/g, '-').toLowerCase()}`}>
    <p className="text-sm font-semibold text-[#1A2B28] mb-2">{label}</p>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} onClick={() => onChange(s)} className="p-1 transition-transform active:scale-90">
          <Star className={`w-9 h-9 transition-all ${s <= value ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
    <p className="text-xs text-[#8A9E99] mt-1">
      {value === 0 ? 'Tap to rate' : value <= 2 ? 'Needs improvement' : value <= 3 ? 'Average' : value <= 4 ? 'Good' : 'Excellent!'}
    </p>
  </div>
);

export default function RatingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointment') || searchParams.get('id') || '';
  const doctorName = decodeURIComponent(searchParams.get('doctor') || '');
  const clinicName = decodeURIComponent(searchParams.get('clinic') || 'Pushpa Clinic');

  const [billingRating, setBillingRating] = useState(0);
  const [behaviourRating, setBehaviourRating] = useState(0);
  const [clinicExperience, setClinicExperience] = useState(null); // 'good' | 'bad'
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phone = localStorage.getItem('guestMobile') || '';

  const handleSubmit = async () => {
    if (billingRating === 0 || behaviourRating === 0 || !clinicExperience) {
      toast.error('Please complete all ratings');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/ratings/submit`, {
        appointment_id: appointmentId,
        phone,
        billing_experience: billingRating,
        staff_behaviour: behaviourRating,
        clinic_experience: clinicExperience,
        feedback_text: feedback || null,
        doctor_name: doctorName,
        clinic_name: clinicName,
      });
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #F0FDF4, #ECFDF5, #F7FAF9)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-[#1A2B28] mb-2">Thank You!</h2>
        <p className="text-sm text-[#4A6B64] text-center mb-8">Your feedback helps us improve</p>
        <Button onClick={() => navigate('/')} className="h-12 px-8 rounded-xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
          data-testid="back-home-btn">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: '#F7FAF9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #1F4F46 0%, #2A6B5E 100%)' }} className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Rate Your Visit</h1>
        </div>

        {/* Clinic info */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-2"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
            {clinicName?.[0] || 'C'}
          </div>
          <p className="text-white font-semibold">{clinicName}</p>
          {doctorName && <p className="text-white/60 text-sm mt-0.5">with {doctorName}</p>}
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Staff Rating Card */}
        <div className="rounded-2xl p-5 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}
          data-testid="staff-rating-card">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-[#1F4F46]" />
            <h3 className="font-bold text-[#1A2B28]">Staff Rating</h3>
          </div>

          <StarRow label="Billing Timing & Experience" value={billingRating} onChange={setBillingRating} />
          <StarRow label="Staff Behaviour" value={behaviourRating} onChange={setBehaviourRating} />
        </div>

        {/* Overall Clinic Experience - Good/Bad like Zomato */}
        <div className="rounded-2xl p-5 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}
          data-testid="clinic-experience-card">
          <h3 className="font-bold text-[#1A2B28] mb-3">Overall Clinic Experience</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setClinicExperience('good')}
              className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl transition-all ${
                clinicExperience === 'good' ? 'scale-105 shadow-lg' : 'shadow-sm'
              }`}
              style={{
                background: clinicExperience === 'good' ? 'linear-gradient(135deg, #10B981, #059669)' : '#F9FAFB',
                border: clinicExperience === 'good' ? '2px solid #059669' : '2px solid #E5E7EB',
              }}
              data-testid="experience-good"
            >
              <ThumbsUp className={`w-10 h-10 ${clinicExperience === 'good' ? 'text-white' : 'text-gray-400'}`} />
              <span className={`text-sm font-bold ${clinicExperience === 'good' ? 'text-white' : 'text-gray-500'}`}>Good</span>
            </button>

            <button
              onClick={() => setClinicExperience('bad')}
              className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl transition-all ${
                clinicExperience === 'bad' ? 'scale-105 shadow-lg' : 'shadow-sm'
              }`}
              style={{
                background: clinicExperience === 'bad' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : '#F9FAFB',
                border: clinicExperience === 'bad' ? '2px solid #DC2626' : '2px solid #E5E7EB',
              }}
              data-testid="experience-bad"
            >
              <ThumbsDown className={`w-10 h-10 ${clinicExperience === 'bad' ? 'text-white' : 'text-gray-400'}`} />
              <span className={`text-sm font-bold ${clinicExperience === 'bad' ? 'text-white' : 'text-gray-500'}`}>Bad</span>
            </button>
          </div>
        </div>

        {/* Feedback text */}
        <div className="rounded-2xl p-5 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#1F4F46]" />
            <h3 className="font-bold text-[#1A2B28] text-sm">Additional Feedback (Optional)</h3>
          </div>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Share your experience in detail..."
            rows={3}
            className="w-full p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-[#1F4F46]"
            style={{ background: '#F9FAFB' }}
            data-testid="feedback-textarea"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || billingRating === 0 || behaviourRating === 0 || !clinicExperience}
          className="w-full h-13 rounded-xl font-bold text-white text-base disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)', height: '52px' }}
          data-testid="submit-rating-btn"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Submit Rating</>
          )}
        </Button>
      </div>
    </div>
  );
}
