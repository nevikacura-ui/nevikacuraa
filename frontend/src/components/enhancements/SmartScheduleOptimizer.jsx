import React, { useState } from 'react';
import { Calendar, Clock, Sparkles, RefreshCw, Check, MapPin, User, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Smart Schedule Optimizer (#7)
const SmartScheduleOptimizer = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [preferences, setPreferences] = useState({
    clinic: '',
    preferredDate: '',
    appointmentType: 'consultation'
  });

  const clinics = [
    { id: 'pushpa', name: 'Pushpa Clinic', address: 'Main Road, City Center' },
    { id: 'amnion', name: 'Amnion Clinic', address: 'Healthcare Complex, Sector 5' }
  ];

  const appointmentTypes = [
    { id: 'consultation', name: 'General Consultation' },
    { id: 'follow-up', name: 'Follow-up Visit' },
    { id: 'check-up', name: 'Health Check-up' },
    { id: 'vaccination', name: 'Vaccination' }
  ];

  const getOptimalSlots = async () => {
    setLoading(true);
    setRecommendations([]);
    
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/ai/schedule-optimizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clinic: preferences.clinic,
          preferred_date: preferences.preferredDate,
          appointment_type: preferences.appointmentType
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setRecommendations(data.recommendations || []);
        if (data.ai_powered) {
          toast.success('AI has analyzed your preferences!');
        }
      }
    } catch (error) {
      // Fallback recommendations
      const baseDate = preferences.preferredDate || new Date().toISOString().split('T')[0];
      setRecommendations([
        { date: baseDate, time: '10:00 AM', reason: 'Low wait time expected' },
        { date: baseDate, time: '2:30 PM', reason: 'Post-lunch, less crowded' },
        { date: baseDate, time: '4:00 PM', reason: 'Good for working professionals' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
    toast.success(`Selected: ${slot.date} at ${slot.time}`);
  };

  return (
    <div className="space-y-4" data-testid="smart-schedule-optimizer">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Smart Schedule Optimizer</h2>
              <p className="text-indigo-100 text-sm">AI finds your perfect appointment time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Preferred Clinic</Label>
            <Select 
              value={preferences.clinic} 
              onValueChange={(v) => setPreferences(prev => ({ ...prev, clinic: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select clinic" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map(clinic => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Preferred Date</Label>
            <Input
              type="date"
              value={preferences.preferredDate}
              onChange={(e) => setPreferences(prev => ({ ...prev, preferredDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Appointment Type</Label>
            <Select 
              value={preferences.appointmentType} 
              onValueChange={(v) => setPreferences(prev => ({ ...prev, appointmentType: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={getOptimalSlots}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                AI Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Optimal Slots
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">AI Recommended Slots</h3>
            <Badge className="bg-indigo-100 text-indigo-700">AI Powered</Badge>
          </div>

          {recommendations.map((slot, idx) => (
            <Card 
              key={idx}
              className={`cursor-pointer transition-all ${
                selectedSlot === slot 
                  ? 'border-2 border-indigo-500 bg-indigo-50' 
                  : 'hover:border-indigo-200'
              }`}
              onClick={() => selectSlot(slot)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{slot.date}</p>
                      <p className="text-indigo-600 font-medium">{slot.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {selectedSlot === slot ? (
                      <Badge className="bg-green-500">Selected</Badge>
                    ) : (
                      <Badge variant="outline">#{idx + 1}</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {slot.reason}
                </p>
              </CardContent>
            </Card>
          ))}

          {selectedSlot && (
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Book {selectedSlot.date} at {selectedSlot.time}
            </Button>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 text-center">
        AI suggestions are based on historical patterns. Actual availability may vary.
      </p>
    </div>
  );
};

export default SmartScheduleOptimizer;
