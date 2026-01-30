import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { 
  User, Phone, Mail, Calendar, UserCircle, Heart, Pill, AlertCircle,
  Loader2, CheckCircle, Sparkles, Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Portal-Specific Membership Form
 * 
 * Collects:
 * - Basic: Name, Phone, Email, Age, Gender
 * - Health-specific: Conditions, Medications, Emergency Contact
 * - Portal-specific questions based on planType
 * 
 * Supported portals: evara, glydex, corvia, serena, thrive360, etc.
 */

// Portal-specific questions configuration
const portalSpecificFields = {
  evara: {
    title: 'Evara - Women\'s Health',
    color: 'rose',
    gradient: 'from-rose-500 to-pink-500',
    questions: [
      { id: 'last_period_date', label: 'Last Period Date', type: 'date', required: false },
      { id: 'cycle_length', label: 'Average Cycle Length (days)', type: 'number', placeholder: '28', required: false },
      { id: 'pregnancy_status', label: 'Pregnancy Status', type: 'select', options: ['Not Pregnant', 'Trying to Conceive', 'Currently Pregnant', 'Postpartum'], required: false },
      { id: 'pcos_diagnosed', label: 'Have you been diagnosed with PCOS?', type: 'checkbox', required: false },
      { id: 'menopause_status', label: 'Menopause Status', type: 'select', options: ['Pre-menopausal', 'Perimenopausal', 'Post-menopausal', 'Not Sure'], required: false },
    ]
  },
  glydex: {
    title: 'Glydex - Diabetes Care',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    questions: [
      { id: 'diabetes_type', label: 'Diabetes Type', type: 'select', options: ['Type 1', 'Type 2', 'Pre-diabetic', 'Gestational', 'Not Diagnosed'], required: true },
      { id: 'diagnosis_year', label: 'Year of Diagnosis', type: 'number', placeholder: '2020', required: false },
      { id: 'hba1c_last', label: 'Last HbA1c Value (%)', type: 'number', placeholder: '6.5', required: false },
      { id: 'insulin_user', label: 'Do you use Insulin?', type: 'checkbox', required: false },
      { id: 'glucose_monitor', label: 'Glucose Monitoring Method', type: 'select', options: ['Manual (Glucometer)', 'CGM (Continuous)', 'Both', 'None'], required: false },
    ]
  },
  corvia: {
    title: 'Corvia - Heart Health',
    color: 'red',
    gradient: 'from-red-500 to-rose-500',
    questions: [
      { id: 'heart_condition', label: 'Known Heart Condition', type: 'select', options: ['None', 'Hypertension', 'Heart Disease', 'Arrhythmia', 'Heart Failure', 'Other'], required: false },
      { id: 'bp_last', label: 'Last Blood Pressure Reading', type: 'text', placeholder: '120/80', required: false },
      { id: 'cholesterol_issues', label: 'Cholesterol Issues?', type: 'checkbox', required: false },
      { id: 'family_heart_history', label: 'Family History of Heart Disease?', type: 'checkbox', required: false },
      { id: 'exercise_frequency', label: 'Exercise Frequency', type: 'select', options: ['Daily', '3-5 times/week', '1-2 times/week', 'Rarely', 'Never'], required: false },
    ]
  },
  serena: {
    title: 'Serena - Mental Wellness',
    color: 'indigo',
    gradient: 'from-indigo-500 to-purple-500',
    questions: [
      { id: 'mental_health_concerns', label: 'Primary Concerns', type: 'select', options: ['Stress/Anxiety', 'Depression', 'Sleep Issues', 'Work-Life Balance', 'Relationship Issues', 'Other'], required: false },
      { id: 'therapy_history', label: 'Previous Therapy/Counseling?', type: 'checkbox', required: false },
      { id: 'stress_level', label: 'Current Stress Level (1-10)', type: 'number', placeholder: '5', required: false },
      { id: 'sleep_hours', label: 'Average Sleep Hours/Night', type: 'number', placeholder: '7', required: false },
      { id: 'meditation_practice', label: 'Do you practice meditation?', type: 'checkbox', required: false },
    ]
  },
  default: {
    title: 'Health Portal',
    color: 'teal',
    gradient: 'from-teal-500 to-cyan-500',
    questions: [
      { id: 'health_goals', label: 'Primary Health Goals', type: 'text', placeholder: 'e.g., Weight management, Better sleep', required: false },
      { id: 'activity_level', label: 'Activity Level', type: 'select', options: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'], required: false },
    ]
  }
};

const PortalMembershipForm = ({ 
  open, 
  onOpenChange, 
  planType = 'default',
  onSuccess,
  existingData = null
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Basic info state
  const [formData, setFormData] = useState({
    // Basic info
    name: existingData?.name || '',
    phone: existingData?.phone || '',
    email: existingData?.email || '',
    age: existingData?.age || '',
    gender: existingData?.gender || '',
    
    // Health info
    existing_conditions: existingData?.existing_conditions || '',
    current_medications: existingData?.current_medications || '',
    allergies: existingData?.allergies || '',
    
    // Emergency contact
    emergency_contact_name: existingData?.emergency_contact_name || '',
    emergency_contact_phone: existingData?.emergency_contact_phone || '',
    emergency_contact_relation: existingData?.emergency_contact_relation || '',
    
    // Portal-specific fields will be added dynamically
    ...existingData?.portal_specific || {}
  });

  const config = portalSpecificFields[planType] || portalSpecificFields.default;
  const colorClasses = {
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', button: 'bg-rose-500 hover:bg-rose-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', button: 'bg-emerald-500 hover:bg-emerald-600' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', button: 'bg-red-500 hover:bg-red-600' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', button: 'bg-indigo-500 hover:bg-indigo-600' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', button: 'bg-teal-500 hover:bg-teal-600' },
  };
  const colors = colorClasses[config.color] || colorClasses.teal;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.phone.trim() || formData.phone.length < 10) return 'Valid phone number is required';
    if (!formData.email.trim() || !formData.email.includes('@')) return 'Valid email is required';
    if (!formData.age || formData.age < 1 || formData.age > 120) return 'Valid age is required';
    if (!formData.gender) return 'Please select gender';
    return null;
  };

  const handleNext = () => {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        ...formData,
        plan_type: planType,
        portal_specific: config.questions.reduce((acc, q) => {
          if (formData[q.id] !== undefined) {
            acc[q.id] = formData[q.id];
          }
          return acc;
        }, {})
      };

      const response = await fetch(`${API_URL}/api/memberships/portal-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to submit form');
      }

      const result = await response.json();
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Reset after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setStep(1);
        onOpenChange(false);
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name" className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Full Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="phone" className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> Phone *
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="9876543210"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="email" className="flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="age" className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Age *
          </Label>
          <Input
            id="age"
            type="number"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            placeholder="25"
            min="1"
            max="120"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="gender" className="flex items-center gap-1">
            <UserCircle className="w-3.5 h-3.5" /> Gender *
          </Label>
          <Select value={formData.gender} onValueChange={(v) => handleInputChange('gender', v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Health Info */}
      <div className="pt-4 border-t">
        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          Health Information
        </h4>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="conditions">Existing Health Conditions</Label>
            <Textarea
              id="conditions"
              value={formData.existing_conditions}
              onChange={(e) => handleInputChange('existing_conditions', e.target.value)}
              placeholder="e.g., Diabetes, Hypertension, Thyroid..."
              className="mt-1 h-20"
            />
          </div>
          
          <div>
            <Label htmlFor="medications" className="flex items-center gap-1">
              <Pill className="w-3.5 h-3.5" /> Current Medications
            </Label>
            <Textarea
              id="medications"
              value={formData.current_medications}
              onChange={(e) => handleInputChange('current_medications', e.target.value)}
              placeholder="List any medicines you're currently taking..."
              className="mt-1 h-20"
            />
          </div>
          
          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Input
              id="allergies"
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              placeholder="e.g., Penicillin, Peanuts, None..."
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="pt-4 border-t">
        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-500" />
          Emergency Contact
        </h4>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="ec_name">Name</Label>
            <Input
              id="ec_name"
              value={formData.emergency_contact_name}
              onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
              placeholder="Contact name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ec_phone">Phone</Label>
            <Input
              id="ec_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
              placeholder="Phone"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ec_relation">Relation</Label>
            <Select value={formData.emergency_contact_relation} onValueChange={(v) => handleInputChange('emergency_contact_relation', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <Card className={`${colors.bg} ${colors.border} border`}>
        <CardContent className="p-4">
          <h4 className={`font-semibold ${colors.text} mb-1`}>{config.title}</h4>
          <p className="text-xs text-gray-500">Please answer these questions for personalized care</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {config.questions.map((question) => (
          <div key={question.id}>
            <Label htmlFor={question.id} className="text-sm">
              {question.label} {question.required && '*'}
            </Label>
            
            {question.type === 'text' && (
              <Input
                id={question.id}
                value={formData[question.id] || ''}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                className="mt-1"
              />
            )}
            
            {question.type === 'number' && (
              <Input
                id={question.id}
                type="number"
                value={formData[question.id] || ''}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                className="mt-1"
              />
            )}
            
            {question.type === 'date' && (
              <Input
                id={question.id}
                type="date"
                value={formData[question.id] || ''}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                className="mt-1"
              />
            )}
            
            {question.type === 'select' && (
              <Select 
                value={formData[question.id] || ''} 
                onValueChange={(v) => handleInputChange(question.id, v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {question.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {question.type === 'checkbox' && (
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id={question.id}
                  checked={formData[question.id] || false}
                  onCheckedChange={(checked) => handleInputChange(question.id, checked)}
                />
                <label htmlFor={question.id} className="text-sm text-gray-600 cursor-pointer">
                  Yes
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="py-12 text-center">
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.gradient} mx-auto flex items-center justify-center mb-4`}>
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Form Submitted!</h3>
      <p className="text-gray-500">Your health profile has been saved. We'll personalize your experience.</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Membership Form</h2>
              <p className="text-xs text-gray-500 font-normal">Step {step} of 2</p>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Complete this form to personalize your {config.title} experience
          </DialogDescription>
        </DialogHeader>

        {success ? renderSuccess() : (
          <>
            {/* Progress indicator */}
            <div className="flex gap-2 my-4">
              <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? `bg-gradient-to-r ${config.gradient}` : 'bg-gray-200'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? `bg-gradient-to-r ${config.gradient}` : 'bg-gray-200'}`} />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Form content */}
            {step === 1 ? renderStep1() : renderStep2()}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              {step === 2 && (
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              
              {step === 1 ? (
                <Button 
                  onClick={handleNext}
                  className={`flex-1 ${colors.button} text-white`}
                >
                  Next: Health Questions
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`flex-1 ${colors.button} text-white`}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    <><Shield className="w-4 h-4 mr-2" /> Submit Form</>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PortalMembershipForm;
