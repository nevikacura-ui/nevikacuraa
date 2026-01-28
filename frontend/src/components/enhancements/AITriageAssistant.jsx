import React, { useState } from 'react';
import { Brain, ArrowRight, AlertTriangle, CheckCircle, Clock, Stethoscope, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const AITriageAssistant = () => {
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState({
    fever: false,
    pain: false,
    breathing: false,
    chronic: false
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const severityLevels = [
    { id: 'mild', label: 'Mild', color: 'bg-green-100 text-green-700', description: 'Minor discomfort' },
    { id: 'moderate', label: 'Moderate', color: 'bg-yellow-100 text-yellow-700', description: 'Noticeable but manageable' },
    { id: 'severe', label: 'Severe', color: 'bg-orange-100 text-orange-700', description: 'Significant discomfort' },
    { id: 'emergency', label: 'Emergency', color: 'bg-red-100 text-red-700', description: 'Needs immediate attention' }
  ];

  const durationOptions = [
    'Just started today',
    '1-3 days',
    '4-7 days',
    '1-2 weeks',
    'More than 2 weeks'
  ];

  const handleSubmit = async () => {
    if (!symptoms || !duration || !severity) {
      toast.error('Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('patientToken') || localStorage.getItem('token');
      const res = await fetch(`${API}/api/ai-triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symptoms,
          duration,
          severity,
          additional_info: additionalInfo
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.assessment);
      } else {
        // Fallback mock result
        setResult({
          priority: severity === 'emergency' ? 'HIGH' : severity === 'severe' ? 'MEDIUM' : 'LOW',
          recommendation: severity === 'emergency' 
            ? 'Please seek immediate medical attention. Visit the nearest emergency room or call emergency services.'
            : 'Based on your symptoms, we recommend scheduling an appointment with a general physician within the next few days.',
          suggested_specialist: severity === 'emergency' ? 'Emergency Medicine' : 'General Physician',
          estimated_wait: severity === 'emergency' ? 'Immediate' : '24-48 hours',
          self_care_tips: [
            'Stay hydrated and get plenty of rest',
            'Monitor your symptoms and note any changes',
            'Avoid self-medication without consulting a doctor',
            'Keep a record of your temperature if you have fever'
          ],
          questions_for_doctor: [
            'When did the symptoms first appear?',
            'Have you taken any medication?',
            'Do you have any known allergies?',
            'Any recent travel or exposure to sick individuals?'
          ]
        });
      }
      setStep(4);
    } catch (error) {
      // Fallback
      setResult({
        priority: 'MEDIUM',
        recommendation: 'We recommend consulting with a healthcare professional for proper evaluation.',
        suggested_specialist: 'General Physician',
        estimated_wait: '24-48 hours',
        self_care_tips: ['Rest well', 'Stay hydrated', 'Monitor symptoms'],
        questions_for_doctor: ['Duration of symptoms', 'Any medications taken']
      });
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-orange-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4" data-testid="ai-triage-assistant">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">AI Triage Assistant</h2>
              <p className="text-blue-100 text-sm">Get preliminary health assessment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="px-2">
        <Progress value={(step / 4) * 100} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>Symptoms</span>
          <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>Details</span>
          <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>Review</span>
          <span className={step >= 4 ? 'text-blue-600 font-medium' : ''}>Results</span>
        </div>
      </div>

      {/* Step 1: Describe Symptoms */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What symptoms are you experiencing?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Describe your symptoms in detail... (e.g., headache, fever, cough, body pain)"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={4}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">How long have you had these symptoms?</label>
              <div className="grid grid-cols-2 gap-2">
                {durationOptions.map(option => (
                  <Button
                    key={option}
                    variant={duration === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDuration(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(2)} disabled={!symptoms || !duration} className="w-full">
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Severity & Additional Info */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How severe are your symptoms?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {severityLevels.map(level => (
                <Card
                  key={level.id}
                  className={`cursor-pointer transition-all ${
                    severity === level.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSeverity(level.id)}
                >
                  <CardContent className="p-3 text-center">
                    <Badge className={level.color}>{level.label}</Badge>
                    <p className="text-xs text-gray-500 mt-1">{level.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional symptoms (check all that apply)</label>
              {[
                { key: 'fever', label: 'Fever or chills' },
                { key: 'pain', label: 'Severe pain' },
                { key: 'breathing', label: 'Difficulty breathing' },
                { key: 'chronic', label: 'Have chronic conditions' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={additionalInfo[item.key]}
                    onChange={(e) => setAdditionalInfo({...additionalInfo, [item.key]: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(3)} disabled={!severity} className="flex-1">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <span className="text-sm text-gray-500">Symptoms</span>
                <p className="font-medium">{symptoms}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Duration</span>
                <p className="font-medium">{duration}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Severity</span>
                <Badge className={severityLevels.find(l => l.id === severity)?.color}>
                  {severityLevels.find(l => l.id === severity)?.label}
                </Badge>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                This is not a medical diagnosis. Always consult a healthcare professional for proper evaluation.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                Get Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <div className="space-y-4">
          <Card className={`border-l-4 ${
            result.priority === 'HIGH' ? 'border-l-red-500' :
            result.priority === 'MEDIUM' ? 'border-l-orange-500' : 'border-l-green-500'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Assessment Result</h3>
                <Badge className={getPriorityColor(result.priority)}>
                  {result.priority} Priority
                </Badge>
              </div>
              <p className="text-gray-700 mb-4">{result.recommendation}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-500" />
                  <span>{result.suggested_specialist}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>{result.estimated_wait}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Self-Care Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.self_care_tips?.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Button onClick={() => { setStep(1); setResult(null); setSymptoms(''); setDuration(''); setSeverity(null); }} variant="outline" className="w-full">
            Start New Assessment
          </Button>
        </div>
      )}
    </div>
  );
};

export default AITriageAssistant;
