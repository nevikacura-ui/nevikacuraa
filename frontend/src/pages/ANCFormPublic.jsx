import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Baby, Heart, CheckCircle2, Loader2, FileText, Calendar, User, Phone, Mail } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ANCFormPublic = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
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
    blood_group: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    
    // Obstetric History
    gravida: '', // Total pregnancies
    para: '', // Total deliveries
    abortions: '',
    living_children: '',
    lmp_date: '', // Last Menstrual Period
    edd_date: '', // Expected Delivery Date
    
    // Medical History
    medical_conditions: [],
    allergies: '',
    current_medications: '',
    previous_surgeries: '',
    
    // Family History
    family_diabetes: false,
    family_hypertension: false,
    family_twins: false,
    family_genetic: '',
    
    // Current Pregnancy
    pregnancy_symptoms: '',
    concerns: '',
    preferred_hospital: '',
    
    // Consent
    consent_given: false
  });

  useEffect(() => {
    fetchFormData();
  }, [formId]);

  const fetchFormData = async () => {
    try {
      const res = await fetch(`${API}/api/anc/form/${formId}`);
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
        // Pre-fill from patient info
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

  const calculateEDD = (lmpDate) => {
    if (!lmpDate) return '';
    const lmp = new Date(lmpDate);
    const edd = new Date(lmp);
    edd.setDate(edd.getDate() + 280); // 40 weeks
    return edd.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.full_name || !form.phone || !form.lmp_date) {
      toast.error('Please fill required fields: Name, Phone, and LMP Date');
      return;
    }
    
    if (!form.consent_given) {
      toast.error('Please provide consent to proceed');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/anc/form/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSubmitted(true);
        toast.success('ANC Form submitted successfully!');
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
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
            Thank you for submitting your ANC form. Our team will review it and contact you soon.
          </p>
          <p className="text-sm text-gray-500">
            Reference: <span className="font-mono">{formId.slice(0, 8).toUpperCase()}</span>
          </p>
        </Card>
      </div>
    );
  }

  const medicalConditions = [
    'Diabetes', 'Hypertension', 'Thyroid', 'Asthma', 'Heart Disease',
    'Kidney Disease', 'Epilepsy', 'Anemia', 'HIV/AIDS', 'Hepatitis B/C'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Baby className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ANC Registration Form</h1>
              <p className="opacity-90">Nevika Cura Healthcare - Antenatal Care</p>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-pink-500" />
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

          {/* Obstetric History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Obstetric History
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label>Gravida (G)</Label>
                <Input 
                  type="number" 
                  value={form.gravida} 
                  onChange={(e) => handleChange('gravida', e.target.value)}
                  placeholder="Total pregnancies"
                />
              </div>
              <div>
                <Label>Para (P)</Label>
                <Input 
                  type="number" 
                  value={form.para} 
                  onChange={(e) => handleChange('para', e.target.value)}
                  placeholder="Total deliveries"
                />
              </div>
              <div>
                <Label>Abortions (A)</Label>
                <Input 
                  type="number" 
                  value={form.abortions} 
                  onChange={(e) => handleChange('abortions', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Living (L)</Label>
                <Input 
                  type="number" 
                  value={form.living_children} 
                  onChange={(e) => handleChange('living_children', e.target.value)}
                  placeholder="Living children"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Last Menstrual Period (LMP) *</Label>
                <Input 
                  type="date" 
                  value={form.lmp_date} 
                  onChange={(e) => {
                    handleChange('lmp_date', e.target.value);
                    handleChange('edd_date', calculateEDD(e.target.value));
                  }}
                  required
                />
              </div>
              <div>
                <Label>Expected Delivery Date (EDD)</Label>
                <Input 
                  type="date" 
                  value={form.edd_date} 
                  onChange={(e) => handleChange('edd_date', e.target.value)}
                  className="bg-pink-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from LMP</p>
              </div>
            </div>
          </Card>

          {/* Medical History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Medical History</h2>
            <div className="mb-4">
              <Label className="mb-2 block">Any existing medical conditions?</Label>
              <div className="flex flex-wrap gap-2">
                {medicalConditions.map(condition => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => toggleMedicalCondition(condition)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      form.medical_conditions.includes(condition)
                        ? 'bg-pink-500 text-white'
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
                <Label>Current Medications</Label>
                <Input 
                  value={form.current_medications} 
                  onChange={(e) => handleChange('current_medications', e.target.value)}
                  placeholder="List current medications"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Previous Surgeries</Label>
                <Textarea 
                  value={form.previous_surgeries} 
                  onChange={(e) => handleChange('previous_surgeries', e.target.value)}
                  placeholder="List any previous surgeries with dates"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          {/* Family History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Family History</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={form.family_diabetes}
                  onChange={(e) => handleChange('family_diabetes', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span>Family history of Diabetes</span>
              </label>
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={form.family_hypertension}
                  onChange={(e) => handleChange('family_hypertension', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span>Family history of Hypertension</span>
              </label>
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={form.family_twins}
                  onChange={(e) => handleChange('family_twins', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span>Family history of Twins/Multiple pregnancies</span>
              </label>
              <div>
                <Label>Any genetic conditions in family?</Label>
                <Input 
                  value={form.family_genetic} 
                  onChange={(e) => handleChange('family_genetic', e.target.value)}
                  placeholder="Specify if any"
                />
              </div>
            </div>
          </Card>

          {/* Current Pregnancy */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Current Pregnancy</h2>
            <div className="space-y-4">
              <div>
                <Label>Current Symptoms</Label>
                <Textarea 
                  value={form.pregnancy_symptoms} 
                  onChange={(e) => handleChange('pregnancy_symptoms', e.target.value)}
                  placeholder="Describe any symptoms you're experiencing (nausea, fatigue, etc.)"
                  rows={2}
                />
              </div>
              <div>
                <Label>Any concerns or questions?</Label>
                <Textarea 
                  value={form.concerns} 
                  onChange={(e) => handleChange('concerns', e.target.value)}
                  placeholder="Share any concerns you'd like to discuss"
                  rows={2}
                />
              </div>
              <div>
                <Label>Preferred Hospital for Delivery</Label>
                <Input 
                  value={form.preferred_hospital} 
                  onChange={(e) => handleChange('preferred_hospital', e.target.value)}
                  placeholder="Hospital name (if decided)"
                />
              </div>
            </div>
          </Card>

          {/* Consent */}
          <Card className="p-6 bg-gradient-to-r from-pink-50 to-purple-50">
            <label className="flex items-start gap-3">
              <input 
                type="checkbox" 
                checked={form.consent_given}
                onChange={(e) => handleChange('consent_given', e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300"
                required
              />
              <span className="text-sm text-gray-700">
                I hereby consent to share my medical information with Nevika Cura Healthcare for the purpose of antenatal care. 
                I understand that this information will be kept confidential and used only for my medical care.
              </span>
            </label>
          </Card>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 py-6 text-lg"
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
                Submit ANC Form
              </>
            )}
          </Button>

          <p className="text-center text-sm text-gray-500">
            After submission, our team will contact you for your first ANC visit.
            <br />
            For queries: <a href="mailto:nevikacura@gmail.com" className="text-pink-600">nevikacura@gmail.com</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ANCFormPublic;
