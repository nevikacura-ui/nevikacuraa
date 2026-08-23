import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * App Rating Modal - Shows after key actions (booking, order)
 * 
 * Usage:
 *   <RatingModal 
 *     isOpen={showRating} 
 *     onClose={() => setShowRating(false)} 
 *     service="diagyn" 
 *     orderId="abc123" 
 *   />
 */
export const RatingModal = ({ isOpen, onClose, service = 'app', orderId = '' }) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const serviceLabels = {
    diagyn: 'your consultation',
    orange: 'your order',
    mango: 'your test booking',
    app: 'Nevika Cura'
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
      await axios.post(`${API}/api/ratings/submit`, {
        rating,
        service,
        comment,
        order_id: orderId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      // Mark as rated in localStorage
      localStorage.setItem('appRated', 'true');
      localStorage.setItem('lastRatedAt', new Date().toISOString());
      
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e) {
      toast.error('Could not submit rating');
    }
    setSubmitting(false);
  };

  const handleSkip = () => {
    // Don't mark as rated, but delay next prompt
    localStorage.setItem('ratingSkippedAt', new Date().toISOString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-testid="rating-modal">
      <div className="bg-[#1A1A1A] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {submitted ? (
          /* Thank You State */
          <div className="text-center py-4" data-testid="rating-thankyou">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Star className="w-8 h-8 text-green-400 fill-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
            <p className="text-gray-400 text-sm">Your feedback helps us improve</p>
            <div className="flex items-center justify-center gap-1 mt-3">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-5 h-5 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
              ))}
            </div>
          </div>
        ) : (
          /* Rating Input State */
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Rate {serviceLabels[service] || 'your experience'}</h3>
              <button onClick={handleSkip} className="p-1.5 rounded-full hover:bg-white/10" data-testid="rating-close-btn">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-5">How was your experience?</p>
            
            {/* Stars */}
            <div className="flex items-center justify-center gap-2 mb-6" data-testid="rating-stars">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  data-testid={`rating-star-${star}`}
                  className="transition-transform hover:scale-125 active:scale-95"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredStar || rating) 
                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]' 
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            {/* Rating Label */}
            <div className="text-center mb-4 h-6">
              {rating > 0 && (
                <span className={`text-sm font-medium ${
                  rating >= 4 ? 'text-green-400' : rating >= 3 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                </span>
              )}
            </div>
            
            {/* Comment */}
            <textarea
              placeholder="Tell us more (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded-xl p-3 text-white text-sm placeholder-gray-500 resize-none h-20 mb-4 focus:outline-none focus:border-teal-500/50"
              data-testid="rating-comment"
            />
            
            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              data-testid="rating-submit-btn"
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
            
            <button 
              onClick={handleSkip}
              className="w-full text-center text-gray-500 text-sm mt-3 hover:text-gray-400"
              data-testid="rating-skip-btn"
            >
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Hook to manage rating prompt logic
 * Returns: { shouldShowRating, triggerRating, dismissRating, service, orderId }
 */
export const useRatingPrompt = () => {
  const [showRating, setShowRating] = useState(false);
  const [ratingService, setRatingService] = useState('app');
  const [ratingOrderId, setRatingOrderId] = useState('');

  const hasAlreadyRated = () => {
    return localStorage.getItem('appRated') === 'true';
  };

  const wasRecentlySkipped = () => {
    const skippedAt = localStorage.getItem('ratingSkippedAt');
    if (!skippedAt) return false;
    // Don't prompt again for 7 days after skip
    const diff = Date.now() - new Date(skippedAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  const triggerRating = (service = 'app', orderId = '') => {
    if (hasAlreadyRated() || wasRecentlySkipped()) return;
    setRatingService(service);
    setRatingOrderId(orderId);
    // Small delay so the user sees the success state first
    setTimeout(() => setShowRating(true), 1500);
  };

  const dismissRating = () => {
    setShowRating(false);
  };

  return {
    showRating,
    ratingService,
    ratingOrderId,
    triggerRating,
    dismissRating
  };
};

export default RatingModal;
