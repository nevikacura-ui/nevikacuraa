import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const emojis = [
  { value: 1, emoji: '\u{1F621}', label: 'Terrible' },
  { value: 2, emoji: '\u{1F641}', label: 'Bad' },
  { value: 3, emoji: '\u{1F610}', label: 'Okay' },
  { value: 4, emoji: '\u{1F60A}', label: 'Good' },
  { value: 5, emoji: '\u{1F929}', label: 'Excellent' },
];

const PostVisitFeedback = () => {
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phone = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';

  const checkPendingFeedback = useCallback(async () => {
    if (!phone) return;
    try {
      const res = await fetch(`${API}/post-visit-feedback/pending?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.appointment) {
        setPendingFeedback(data.appointment);
      }
    } catch { /* ignore */ }
  }, [phone]);

  useEffect(() => {
    const timer = setTimeout(checkPendingFeedback, 2000);
    return () => clearTimeout(timer);
  }, [checkPendingFeedback]);

  const handleSubmit = async () => {
    if (!selectedRating || !pendingFeedback) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/post-visit-feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: pendingFeedback.id || pendingFeedback.booking_id,
          phone,
          rating: selectedRating,
          comment: comment.trim(),
          doctor: pendingFeedback.doctor,
          clinic: pendingFeedback.clinic,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setPendingFeedback(null);
        setSubmitted(false);
        setSelectedRating(null);
        setComment('');
      }, 2000);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const dismiss = () => {
    // Mark as dismissed so we don't ask again
    if (pendingFeedback) {
      fetch(`${API}/post-visit-feedback/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: pendingFeedback.id || pendingFeedback.booking_id, phone }),
      }).catch(() => {});
    }
    setPendingFeedback(null);
  };

  return (
    <AnimatePresence>
      {pendingFeedback && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[9999]"
            onClick={dismiss}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[10000] rounded-t-[28px] overflow-hidden"
            style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
            data-testid="post-visit-feedback"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Close button */}
            <button onClick={dismiss} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center" data-testid="feedback-close">
              <X className="w-4 h-4 text-white/40" />
            </button>

            <div className="px-6 pb-8 pt-2">
              {submitted ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="text-5xl mb-3">{'\u{2728}'}</div>
                  <p className="text-white font-bold text-lg">Thank you!</p>
                  <p className="text-white/40 text-sm mt-1">Your feedback helps us improve</p>
                </motion.div>
              ) : (
                <>
                  <div className="text-center mb-5">
                    <p className="text-white font-bold text-lg">How was your visit?</p>
                    <p className="text-white/40 text-sm mt-1">
                      With {pendingFeedback.doctor} at {pendingFeedback.clinic}
                    </p>
                  </div>

                  {/* Emoji Rating */}
                  <div className="flex justify-center gap-3 mb-5" data-testid="emoji-rating">
                    {emojis.map((e) => (
                      <button
                        key={e.value}
                        onClick={() => setSelectedRating(e.value)}
                        className="flex flex-col items-center gap-1 transition-all"
                        style={{
                          transform: selectedRating === e.value ? 'scale(1.25)' : 'scale(1)',
                          opacity: selectedRating && selectedRating !== e.value ? 0.35 : 1,
                        }}
                        data-testid={`emoji-${e.value}`}
                      >
                        <span className="text-3xl">{e.emoji}</span>
                        <span className={`text-[10px] font-medium ${selectedRating === e.value ? 'text-white' : 'text-white/30'}`}>{e.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Comment input */}
                  {selectedRating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-4"
                    >
                      <input
                        type="text"
                        placeholder="Any comments? (optional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        data-testid="feedback-comment"
                      />
                    </motion.div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedRating || submitting}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all disabled:opacity-30"
                    style={{ background: selectedRating ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'rgba(255,255,255,0.05)' }}
                    data-testid="feedback-submit"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4" /> Submit Feedback</>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PostVisitFeedback;
