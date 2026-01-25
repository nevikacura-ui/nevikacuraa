import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Stethoscope, Users, CheckCircle2, Loader2 } from 'lucide-react';

// Star rating component - defined outside main component
const StarRating = ({ value, onChange, label, icon: Icon, iconColor }) => (
  <div>
    <Label className="text-sm font-medium flex items-center gap-2">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      {label}
    </Label>
    <div className="flex gap-2 mt-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            value >= star 
              ? 'bg-yellow-400 text-white' 
              : 'bg-gray-200 text-gray-400'
          }`}
          data-testid={`star-${star}`}
        >
          <Star className="w-5 h-5" fill={value >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  </div>
);

const FeedbackTab = ({
  feedbackForm,
  setFeedbackForm,
  submitFeedback,
  submittingFeedback
}) => {
  // Calculate overall rating
  const overallRating = feedbackForm.doctorRating || feedbackForm.staffRating || feedbackForm.cleanlinessRating
    ? ((feedbackForm.doctorRating + feedbackForm.staffRating + feedbackForm.cleanlinessRating) / 3).toFixed(1)
    : null;

  return (
    <Card data-testid="feedback-tab-content">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-cyan-500" />
          Patient Feedback
        </h3>
        <p className="text-sm text-gray-500">Collect feedback after consultation</p>
        
        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl space-y-4">
          {/* Patient Name */}
          <div>
            <Label className="text-sm font-medium">Patient Name</Label>
            <Input 
              placeholder="Enter patient name"
              value={feedbackForm.patientName}
              onChange={(e) => setFeedbackForm({...feedbackForm, patientName: e.target.value})}
              className="mt-1"
              data-testid="feedback-patient-name"
            />
          </div>
          
          {/* Rating Categories */}
          <div className="space-y-4">
            <StarRating
              value={feedbackForm.doctorRating}
              onChange={(star) => setFeedbackForm({...feedbackForm, doctorRating: star})}
              label="Doctor's Care & Attention"
              icon={Stethoscope}
              iconColor="text-pink-500"
            />
            
            <StarRating
              value={feedbackForm.staffRating}
              onChange={(star) => setFeedbackForm({...feedbackForm, staffRating: star})}
              label="Staff Behavior & Helpfulness"
              icon={Users}
              iconColor="text-blue-500"
            />
            
            <StarRating
              value={feedbackForm.cleanlinessRating}
              onChange={(star) => setFeedbackForm({...feedbackForm, cleanlinessRating: star})}
              label="Clinic Cleanliness & Hygiene"
              icon={CheckCircle2}
              iconColor="text-green-500"
            />
          </div>
          
          {/* Overall Rating Display */}
          {overallRating && (
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-sm text-gray-500">Overall Rating</p>
              <p className="text-3xl font-bold text-cyan-600">{overallRating}</p>
              <p className="text-xs text-gray-400">out of 5</p>
            </div>
          )}
          
          {/* Submit Button */}
          <Button 
            className="w-full bg-cyan-500 hover:bg-cyan-600"
            onClick={submitFeedback}
            disabled={submittingFeedback || !feedbackForm.patientName}
            data-testid="submit-feedback-btn"
          >
            {submittingFeedback ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Submit Feedback
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackTab;
