import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { Star, CheckCircle2, Loader2, Heart } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Feedback() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [rating, setRating] = useState(parseInt(searchParams.get('rating')) || 0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/feedback/${token}`, {
        rating,
        comment: comment.trim() || null
      });
      
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit feedback';
      toast.error(message);
      
      if (message.includes('already submitted')) {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">Your feedback helps us improve our services.</p>
          
          <div className="flex justify-center mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          
          <Button onClick={() => navigate('/')} className="bg-teal-500 hover:bg-teal-600">
            <Heart className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/icons/icon-192x192.png" 
            alt="Nevika Cura" 
            className="w-16 h-16 mx-auto mb-4 rounded-xl"
          />
          <h1 className="text-2xl font-bold text-gray-800">Rate Your Visit</h1>
          <p className="text-gray-500 mt-2">How was your experience at Nevika Cura?</p>
        </div>
        
        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
              data-testid={`star-${star}`}
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 hover:text-amber-200'
                }`}
              />
            </button>
          ))}
        </div>
        
        {/* Rating Labels */}
        <div className="text-center mb-6">
          {rating === 0 && <p className="text-gray-400 text-sm">Tap to rate</p>}
          {rating === 1 && <p className="text-red-500 font-medium">Poor</p>}
          {rating === 2 && <p className="text-orange-500 font-medium">Fair</p>}
          {rating === 3 && <p className="text-amber-500 font-medium">Good</p>}
          {rating === 4 && <p className="text-lime-500 font-medium">Very Good</p>}
          {rating === 5 && <p className="text-green-500 font-medium">Excellent!</p>}
        </div>
        
        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more about your experience..."
            className="h-24 resize-none"
            data-testid="feedback-comment"
          />
        </div>
        
        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full h-12 bg-teal-500 hover:bg-teal-600"
          data-testid="submit-feedback"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </Button>
        
        <p className="text-xs text-center text-gray-400 mt-4">
          Your feedback is private and helps us improve our services.
        </p>
      </Card>
    </div>
  );
}
