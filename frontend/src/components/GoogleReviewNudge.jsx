import React, { useState, useEffect } from 'react';
import { Star, X, ExternalLink } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const GOOGLE_REVIEW_URL = "https://g.page/r/CZBa3QPJ_1lXEAE/review";

export const GoogleReviewNudge = ({ show, onDismiss, source = 'appointment' }) => {
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const trackAction = async (action) => {
    try {
      await axios.post(`${API}/review/google-nudge`, {
        action,
        source,
        user_id: localStorage.getItem('token') ? 'authenticated' : 'guest'
      });
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    if (visible) trackAction('shown');
  }, [visible]);

  const handleReview = () => {
    trackAction('clicked');
    window.open(GOOGLE_REVIEW_URL, '_blank');
    handleDismiss();
  };

  const handleDismiss = () => {
    setAnimateOut(true);
    trackAction('dismissed');
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 300);
  };

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl transition-transform duration-300 ${animateOut ? 'translate-y-8' : 'translate-y-0'}`}
        data-testid="google-review-nudge">
        <button onClick={handleDismiss} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          data-testid="review-nudge-dismiss">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-8 h-8 text-amber-400 fill-amber-400" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            How was your experience?
          </h3>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Your feedback helps others find quality healthcare. Share your experience on Google!
          </p>

          <button
            onClick={handleReview}
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98]"
            data-testid="review-nudge-cta">
            <div className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Rate us on Google
              <ExternalLink className="w-4 h-4" />
            </div>
          </button>

          <button onClick={handleDismiss}
            className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="review-nudge-later">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleReviewNudge;
