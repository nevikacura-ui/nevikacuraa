import React, { useState } from 'react';
import { Search, AlertCircle, ThumbsUp, ChevronRight, Activity, Thermometer, HeadacheIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Symptom Checker (#19)
const SymptomChecker = ({ onBookAppointment }) => {
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const commonSymptoms = [
    { id: 'fever', name: 'Fever', icon: '🌡️', category: 'general' },
    { id: 'headache', name: 'Headache', icon: '🤕', category: 'head' },
    { id: 'cough', name: 'Cough', icon: '😷', category: 'respiratory' },
    { id: 'fatigue', name: 'Fatigue', icon: '😴', category: 'general' },
    { id: 'nausea', name: 'Nausea', icon: '🤢', category: 'digestive' },
    { id: 'body_pain', name: 'Body Pain', icon: '💪', category: 'general' },
    { id: 'sore_throat', name: 'Sore Throat', icon: '🗣️', category: 'respiratory' },
    { id: 'stomach_pain', name: 'Stomach Pain', icon: '🤰', category: 'digestive' },
    { id: 'dizziness', name: 'Dizziness', icon: '😵', category: 'head' },
    { id: 'chest_pain', name: 'Chest Pain', icon: '❤️', category: 'cardiac' },
    { id: 'breathing_difficulty', name: 'Breathing Difficulty', icon: '🫁', category: 'respiratory' },
    { id: 'skin_rash', name: 'Skin Rash', icon: '🔴', category: 'skin' },
  ];

  const toggleSymptom = (symptom) => {
    if (symptoms.find(s => s.id === symptom.id)) {
      setSymptoms(symptoms.filter(s => s.id !== symptom.id));
    } else {
      setSymptoms([...symptoms, symptom]);
    }
  };

  const analyzeSymptoms = async () => {
    setLoading(true);
    // Simulated AI analysis - in production, this would call an API
    setTimeout(() => {
      const hasEmergency = symptoms.some(s => ['chest_pain', 'breathing_difficulty'].includes(s.id));
      const assessment = {
        severity: hasEmergency ? 'high' : symptoms.length > 3 ? 'medium' : 'low',
        possibleConditions: [
          { name: 'Common Cold', probability: 75 },
          { name: 'Viral Infection', probability: 60 },
          { name: 'Seasonal Flu', probability: 45 },
        ],
        recommendedSpecialist: hasEmergency ? 'Emergency' : 'General Physician',
        urgency: hasEmergency ? 'Seek immediate medical attention' : 'Schedule an appointment within 24-48 hours',
        selfCare: [
          'Rest and stay hydrated',
          'Monitor temperature regularly',
          'Take OTC pain relievers if needed',
        ]
      };
      setAssessment(assessment);
      setStep(3);
      setLoading(false);
    }, 2000);
  };

  const filteredSymptoms = commonSymptoms.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  return (
    <div className="space-y-4" data-testid="symptom-checker">
      {/* Step 1: Select Symptoms */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-teal-600" />
              What symptoms are you experiencing?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {filteredSymptoms.map((symptom) => (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    symptoms.find(s => s.id === symptom.id)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{symptom.icon}</span>
                  <p className="text-xs mt-1">{symptom.name}</p>
                </button>
              ))}
            </div>

            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">Selected:</span>
                {symptoms.map(s => (
                  <Badge key={s.id} variant="secondary" className="cursor-pointer" onClick={() => toggleSymptom(s)}>
                    {s.icon} {s.name} ×
                  </Badge>
                ))}
              </div>
            )}

            <Button 
              className="w-full bg-teal-600 hover:bg-teal-700" 
              disabled={symptoms.length === 0}
              onClick={() => setStep(2)}
            >
              Continue ({symptoms.length} selected)
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Duration & Severity */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>How long have you had these symptoms?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {['Today', '1-2 days', '3-7 days', 'More than a week'].map((duration) => (
                <Button key={duration} variant="outline" className="h-16" onClick={analyzeSymptoms}>
                  {duration}
                </Button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Back to symptoms
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Assessment Results */}
      {step === 3 && assessment && (
        <div className="space-y-4">
          {/* Severity Alert */}
          <div className={`p-4 rounded-xl border-2 ${getSeverityColor(assessment.severity)}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">
                  {assessment.severity === 'high' ? 'Urgent Attention Needed' : 
                   assessment.severity === 'medium' ? 'Medical Attention Recommended' : 
                   'Low Urgency'}
                </p>
                <p className="text-sm">{assessment.urgency}</p>
              </div>
            </div>
          </div>

          {/* Possible Conditions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Possible Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assessment.possibleConditions.map((condition, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>{condition.name}</span>
                  <Badge variant="outline">{condition.probability}% match</Badge>
                </div>
              ))}
              <p className="text-xs text-gray-500 italic">
                *This is not a diagnosis. Please consult a doctor for accurate assessment.
              </p>
            </CardContent>
          </Card>

          {/* Self Care Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                Self-Care Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {assessment.selfCare.map((tip, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Book Appointment CTA */}
          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700" 
            size="lg"
            onClick={() => onBookAppointment?.(assessment.recommendedSpecialist)}
          >
            Book {assessment.recommendedSpecialist} Appointment
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>

          <Button variant="outline" className="w-full" onClick={() => { setStep(1); setSymptoms([]); setAssessment(null); }}>
            Start Over
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing your symptoms...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SymptomChecker;
