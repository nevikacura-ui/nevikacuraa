import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Activity, Heart, CheckCircle2, Loader2, FileText, User, Phone, Mail, Pill, Droplet } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const DiabetesFormPublic = () => {
  const { formId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  
  const [form, setForm] = useState({
    // Personal Information
    full_name: '',
    age: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    // Diabetes Information
    diabetes_type: '',
    date_of_diagnosis: '',
    family_history: false,
    // Current Medications
    current_medications: '',
    insulin_user: false,
    insulin_type: '',
    insulin_dosage: '',
    // Medical History
    medical_conditions: [],
    allergies: '',
    previous_surgeries: '',
    // Lifestyle
    diet_type: '',
    exercise_frequency: '',
    smoking: false,
    alcohol: false,
    // Recent Tests
    recent_fbs: '',
    recent_ppbs: '',
    recent_hba1c: '',
    last_test_date: '',
    // Concerns
    symptoms: '',
    concerns: '',
    // Consent
    consent_given: false
  });

  const loadFormData = async () => {
    try {
      const res = await fetch(`${API}/api/glydex/form/${formId}`);
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      
      setFormData(data);
      setPatientInfo(data.patient);
      
      if (data.status === 'filled') {
        setSubmitted(true);
        setForm(data.form_data || {});
      } else if (data.patient) {
        setForm(prev => ({
          ...prev,
          full_name: data.patient.name || '',
          phone: data.patient.phone || '',
          email: data.patient.email || ''
        }));
      }
    } catch (err) {
      toast.error('Failed to load form');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleMedicalCondition = (condition) => {
    setForm(prev => ({
      ...prev,
      medical_conditions: prev.medical_conditions.includes(condition)
        ? prev.medical_conditions.filter(c => c !== condition)
        : [...prev.medical_conditions, condition]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.full_name || !form.phone || !form.diabetes_type) {
      toast.error('Please fill required fields: Name, Phone, and Diabetes Type');
      return;
    }
    
    if (!form.consent_given) {
      toast.error('Please provide consent to proceed');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/glydex/form/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSubmitted(true);
        toast.success('Diabetes Registration Form submitted successfully!');
      } else {
        toast.error(data.error || 'Submission failed');
      }
    } catch (err) {
      toast.error('Failed to submit form');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Form Not Found</h2>
          <p className="text-gray-500">This form link is invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Form Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for submitting your Diabetes Registration form. Our team will review it and contact you soon.
          </p>
          <p className="text-sm text-gray-500">
            Reference: <span className="font-mono">{formId.slice(0, 8).toUpperCase()}</span>
          </p>
        </Card>
      </div>
    );
  }

  const medicalConditions = [
    'Hypertension', 'Heart Disease', 'Kidney Disease', 'Eye Problems (Retinopathy)', 
    'Nerve Damage (Neuropathy)', 'Thyroid', 'PCOD/PCOS', 'Obesity', 'Stroke History'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Diabetes Registration Form</h1>
              <p className="opacity-90">Nevika Cura Healthcare - Glydex</p>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Full Name *</Label>
                <Input 
                  value={form.full_name} 
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label>Age *</Label>
                <Input 
                  type="number" 
                  value={form.age} 
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="Age in years"
                />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input 
                  type="date" 
                  value={form.date_of_birth} 
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select value={form.blood_group} onValueChange={(v) => handleChange('blood_group', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone *</Label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={form.email} 
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Textarea 
                  value={form.address} 
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
              <div>
                <Label>Emergency Contact Name</Label>
                <Input 
                  value={form.emergency_contact} 
                  onChange={(e) => handleChange('emergency_contact', e.target.value)}
                  placeholder="Name of emergency contact"
                />
              </div>
              <div>
                <Label>Emergency Contact Phone</Label>
                <Input 
                  value={form.emergency_phone} 
                  onChange={(e) => handleChange('emergency_phone', e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
            </div>
          </Card>

          {/* Diabetes Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-emerald-500" />
              Diabetes Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Diabetes Type *</Label>
                <Select value={form.diabetes_type} onValueChange={(v) => handleChange('diabetes_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type1">Type 1 Diabetes</SelectItem>
                    <SelectItem value="type2">Type 2 Diabetes</SelectItem>
                    <SelectItem value="gestational">Gestational Diabetes</SelectItem>
                    <SelectItem value="prediabetic">Pre-diabetic</SelectItem>
                    <SelectItem value="unknown">Not Sure / Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Diagnosis</Label>
                <Input 
                  type="date" 
                  value={form.date_of_diagnosis} 
                  onChange={(e) => handleChange('date_of_diagnosis', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={form.family_history}
                    onChange={(e) => handleChange('family_history', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span>Family history of Diabetes (parents, siblings)</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Current Medications */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-500" />
              Current Medications
            </h2>
            <div className="space-y-4">
              <div>
                <Label>Current Diabetes Medications</Label>
                <Textarea 
                  value={form.current_medications} 
                  onChange={(e) => handleChange('current_medications', e.target.value)}
                  placeholder="List all diabetes medications with dosage (e.g., Metformin 500mg twice daily)"
                  rows={2}
                />
              </div>
              <div>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={form.insulin_user}
                    onChange={(e) => handleChange('insulin_user', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span>Currently using Insulin</span>
                </label>
              </div>
              {form.insulin_user && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8 border-l-2 border-emerald-200">
                  <div>
                    <Label>Insulin Type</Label>
                    <Input 
                      value={form.insulin_type} 
                      onChange={(e) => handleChange('insulin_type', e.target.value)}
                      placeholder="e.g., Lantus, Humalog"
                    />
                  </div>
                  <div>
                    <Label>Insulin Dosage</Label>
                    <Input 
                      value={form.insulin_dosage} 
                      onChange={(e) => handleChange('insulin_dosage', e.target.value)}
                      placeholder="e.g., 20 units morning"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Medical History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-500" />
              Medical History
            </h2>
            <div className="mb-4">
              <Label className="mb-2 block">Do you have any of these conditions?</Label>
              <div className="flex flex-wrap gap-2">
                {medicalConditions.map(condition => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => toggleMedicalCondition(condition)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      form.medical_conditions.includes(condition)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Allergies</Label>
                <Input 
                  value={form.allergies} 
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  placeholder="Any known allergies"
                />
              </div>
              <div>
                <Label>Previous Surgeries</Label>
                <Input 
                  value={form.previous_surgeries} 
                  onChange={(e) => handleChange('previous_surgeries', e.target.value)}
                  placeholder="List any surgeries"
                />
              </div>
            </div>
          </Card>

          {/* Lifestyle */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Lifestyle</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Diet Type</Label>
                <Select value={form.diet_type} onValueChange={(v) => handleChange('diet_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exercise Frequency</Label>
                <Select value={form.exercise_frequency} onValueChange={(v) => handleChange('exercise_frequency', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="3-4_week">3-4 times/week</SelectItem>
                    <SelectItem value="1-2_week">1-2 times/week</SelectItem>
                    <SelectItem value="rarely">Rarely</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={form.smoking}
                    onChange={(e) => handleChange('smoking', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span>Smoking</span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={form.alcohol}
                    onChange={(e) => handleChange('alcohol', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span>Alcohol Consumption</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Recent Tests */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Recent Test Results (if available)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Recent Fasting Blood Sugar (FBS)</Label>
                <Input 
                  type="number"
                  value={form.recent_fbs} 
                  onChange={(e) => handleChange('recent_fbs', e.target.value)}
                  placeholder="mg/dL"
                />
              </div>
              <div>
                <Label>Recent Post-Meal Sugar (PPBS)</Label>
                <Input 
                  type="number"
                  value={form.recent_ppbs} 
                  onChange={(e) => handleChange('recent_ppbs', e.target.value)}
                  placeholder="mg/dL"
                />
              </div>
              <div>
                <Label>Recent HbA1c</Label>
                <Input 
                  type="number"
                  step="0.1"
                  value={form.recent_hba1c} 
                  onChange={(e) => handleChange('recent_hba1c', e.target.value)}
                  placeholder="%"
                />
              </div>
              <div>
                <Label>Last Test Date</Label>
                <Input 
                  type="date" 
                  value={form.last_test_date} 
                  onChange={(e) => handleChange('last_test_date', e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Symptoms & Concerns */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Current Symptoms & Concerns</h2>
            <div className="space-y-4">
              <div>
                <Label>Current Symptoms</Label>
                <Textarea 
                  value={form.symptoms} 
                  onChange={(e) => handleChange('symptoms', e.target.value)}
                  placeholder="Describe any symptoms you're experiencing (frequent urination, excessive thirst, fatigue, blurred vision, etc.)"
                  rows={2}
                />
              </div>
              <div>
                <Label>Any concerns or questions?</Label>
                <Textarea 
                  value={form.concerns} 
                  onChange={(e) => handleChange('concerns', e.target.value)}
                  placeholder="Share any concerns you'd like to discuss with the doctor"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          {/* Consent */}
          <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50">
            <label className="flex items-start gap-3">
              <input 
                type="checkbox" 
                checked={form.consent_given}
                onChange={(e) => handleChange('consent_given', e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300"
                required
              />
              <span className="text-sm text-gray-700">
                I hereby consent to share my medical information with Nevika Cura Healthcare for the purpose of diabetes care management. 
                I understand that this information will be kept confidential and used only for my medical care.
              </span>
            </label>
          </Card>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-6 text-lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit Registration Form
              </>
            )}
          </Button>

          <p className="text-center text-sm text-gray-500">
            After submission, our team will review your information and contact you.
            <br />
            For queries: <a href="mailto:nevikacura@gmail.com" className="text-emerald-600">nevikacura@gmail.com</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default DiabetesFormPublic;
