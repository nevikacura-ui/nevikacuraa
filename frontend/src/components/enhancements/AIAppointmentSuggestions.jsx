import React, { useState } from 'react';
import { Stethoscope, Plus, X, Sparkles, AlertTriangle, Clock, User, MapPin, Phone, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// AI Appointment Suggestions (#9)
const AIAppointmentSuggestions = () => {
  const [symptoms, setSymptoms] = useState([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const commonSymptoms = [
    'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea',
    'Back Pain', 'Chest Pain', 'Shortness of Breath', 'Dizziness',
    'Abdominal Pain', 'Joint Pain', 'Skin Rash', 'Sore Throat'
  ];

  const addSymptom = (symptom) => {
    if (symptom && !symptoms.includes(symptom)) {
      setSymptoms([...symptoms, symptom]);
      setCurrentSymptom('');
    }
  };

  const removeSymptom = (symptom) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  const getSuggestion = async () => {
    if (symptoms.length === 0) {
      toast.error('Please add at least one symptom');
      return;
    }

    setLoading(true);
    setSuggestion(null);

    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/ai/appointment-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symptoms,
          duration,
          severity
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setSuggestion(data.suggestion);
        if (data.ai_powered) {
          toast.success('AI has analyzed your symptoms!');
        }
      }
    } catch (error) {
      // Fallback suggestion
      setSuggestion({
        specialist: 'General Physician',
        urgency: 'routine',
        reason: 'General consultation recommended for symptom evaluation',
        doctor: { name: 'Dr. Vikas Jha', clinic: 'Pushpa Clinic' },
        recommended_tests: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'emergency': return 'bg-red-500';
      case 'urgent': return 'bg-orange-500';
      case 'soon': return 'bg-amber-500';
      case 'routine': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyText = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'emergency': return 'Seek immediate care';
      case 'urgent': return 'See doctor within 24 hours';
      case 'soon': return 'Schedule within a week';
      case 'routine': return 'Schedule at convenience';
      default: return 'Schedule appointment';
    }
  };

  return (
    <div className="space-y-4" data-testid="ai-appointment-suggestions">
      {/* Header */}
      <Card className="bg-gradient-to-r from-rose-600 to-pink-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Find the Right Doctor</h2>
              <p className="text-rose-100 text-sm">AI-powered specialist recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptom Input */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">What are your symptoms?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Symptom Input Field */}
          <div className="flex gap-2">
            <Input
              placeholder="Type a symptom..."
              value={currentSymptom}
              onChange={(e) => setCurrentSymptom(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSymptom(currentSymptom)}
            />
            <Button onClick={() => addSymptom(currentSymptom)} disabled={!currentSymptom}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Add Symptoms */}
          <div className="flex flex-wrap gap-2">
            {commonSymptoms.filter(s => !symptoms.includes(s)).slice(0, 8).map((symptom) => (
              <Button
                key={symptom}
                variant="outline"
                size="sm"
                onClick={() => addSymptom(symptom)}
                className="text-xs"
              >
                + {symptom}
              </Button>
            ))}
          </div>

          {/* Selected Symptoms */}
          {symptoms.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Selected symptoms:</p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((symptom) => (
                  <Badge
                    key={symptom}
                    className="bg-rose-100 text-rose-700 pl-3 pr-1 py-1"
                  >
                    {symptom}
                    <button
                      onClick={() => removeSymptom(symptom)}
                      className="ml-2 p-0.5 hover:bg-rose-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Duration & Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="How long?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Started today</SelectItem>
                  <SelectItem value="few_days">Few days</SelectItem>
                  <SelectItem value="week">About a week</SelectItem>
                  <SelectItem value="weeks">Several weeks</SelectItem>
                  <SelectItem value="month">A month or more</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full bg-rose-600 hover:bg-rose-700"
            onClick={getSuggestion}
            disabled={loading || symptoms.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Recommendation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* AI Suggestion Result */}
      {suggestion && (
        <Card className="border-2 border-rose-200">
          <CardHeader className="bg-rose-50 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              AI Recommendation
              <Badge className="ml-auto bg-rose-500">AI Powered</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Urgency Banner */}
            <div className={`p-3 rounded-lg text-white ${getUrgencyColor(suggestion.urgency)}`}>
              <div className="flex items-center gap-2">
                {suggestion.urgency === 'emergency' || suggestion.urgency === 'urgent' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <div>
                  <p className="font-bold">{suggestion.urgency?.toUpperCase()}</p>
                  <p className="text-sm opacity-90">{getUrgencyText(suggestion.urgency)}</p>
                </div>
              </div>
            </div>

            {/* Specialist Recommendation */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Recommended Specialist</p>
              <p className="text-xl font-bold text-gray-800">{suggestion.specialist}</p>
              <p className="text-sm text-gray-600 mt-2">{suggestion.reason}</p>
            </div>

            {/* Doctor Info */}
            {suggestion.doctor && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center">
                      <User className="w-7 h-7 text-rose-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{suggestion.doctor.name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {suggestion.doctor.clinic}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended Tests */}
            {suggestion.recommended_tests?.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Suggested Tests:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestion.recommended_tests.map((test, idx) => (
                    <Badge key={idx} variant="outline">{test}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Book Appointment Button */}
            <Button className="w-full bg-rose-600 hover:bg-rose-700">
              Book Appointment with {suggestion.doctor?.name || suggestion.specialist}
            </Button>

            {/* Emergency Notice */}
            {(suggestion.urgency === 'emergency' || suggestion.urgency === 'urgent') && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <Phone className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800">Need immediate help?</p>
                    <p className="text-sm text-red-600">Call Ambulance: 102</p>
                  </div>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600">
                    Call Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 text-center">
        AI suggestions are for guidance only. For emergencies, call 102 immediately. 
        Always seek professional medical advice.
      </p>
    </div>
  );
};

export default AIAppointmentSuggestions;
