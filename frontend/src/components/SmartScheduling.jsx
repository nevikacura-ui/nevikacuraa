import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Calendar, Clock, Users, Sparkles, Bell, ChevronRight, 
  Loader2, CheckCircle2, AlertCircle, Star, Sun, Moon,
  TrendingDown, X
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SmartScheduling = ({ doctorId, clinicId, onSlotSelect, onClose }) => {
  const { user, token } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (doctorId && clinicId && token) {
      fetchSuggestions();
      fetchWaitlist();
    }
  }, [doctorId, clinicId, token]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API}/features/scheduling/suggestions?doctor_id=${doctorId}&clinic_id=${clinicId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitlist = async () => {
    try {
      const response = await axios.get(`${API}/features/scheduling/waitlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWaitlistEntries(response.data.waitlist_entries || []);
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    }
  };

  const joinWaitlist = async (date) => {
    setJoiningWaitlist(true);
    try {
      const response = await axios.post(
        `${API}/features/scheduling/waitlist`,
        null,
        {
          params: { doctor_id: doctorId, clinic_id: clinicId, preferred_date: date },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(`You're #${response.data.position} on the waitlist!`);
      fetchWaitlist();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const leaveWaitlist = async (waitlistId) => {
    try {
      await axios.delete(`${API}/features/scheduling/waitlist/${waitlistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Removed from waitlist');
      fetchWaitlist();
    } catch (error) {
      toast.error('Failed to leave waitlist');
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (onSlotSelect) {
      onSlotSelect(date);
    }
  };

  const isOnWaitlist = (date) => {
    return waitlistEntries.some(e => e.preferred_date === date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Smart Scheduling
          </h2>
          <p className="text-sm text-slate-500">AI-powered appointment suggestions</p>
        </div>
      </div>

      {/* Tip Card */}
      <Card className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Sun className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Pro Tip</p>
            <p className="text-sm text-amber-700">
              Morning slots (10-12 PM) typically have shorter wait times. Mondays and Fridays are usually less crowded.
            </p>
          </div>
        </div>
      </Card>

      {/* Suggested Dates */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-500" />
          Recommended Dates
        </h3>
        
        <div className="space-y-2">
          {suggestions.map((suggestion, idx) => (
            <Card 
              key={suggestion.date}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                selectedDate === suggestion.date
                  ? 'ring-2 ring-teal-500 bg-teal-50'
                  : 'hover:bg-slate-50'
              }`}
              onClick={() => handleDateSelect(suggestion.date)}
              data-testid={`suggestion-${idx}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                    suggestion.recommended 
                      ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span className="text-xs font-medium">
                      {new Date(suggestion.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-lg font-bold">
                      {new Date(suggestion.date).getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{suggestion.day}</p>
                    <p className="text-sm text-slate-500">{suggestion.date}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {suggestion.recommended && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Best Choice
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {suggestion.slots_available} slots
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    suggestion.slots_available > 15 ? 'text-emerald-600' :
                    suggestion.slots_available > 5 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {suggestion.message}
                  </p>
                  {suggestion.slots_available <= 5 && !isOnWaitlist(suggestion.date) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); joinWaitlist(suggestion.date); }}
                      disabled={joiningWaitlist}
                      className="mt-2 text-xs rounded-lg"
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      Join Waitlist
                    </Button>
                  )}
                  {isOnWaitlist(suggestion.date) && (
                    <Badge className="bg-violet-100 text-violet-700 text-xs mt-2">
                      On Waitlist
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Waitlist Entries */}
      {waitlistEntries.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Bell className="w-4 h-4 text-violet-500" />
            Your Waitlist
          </h3>
          
          <div className="space-y-2">
            {waitlistEntries.map((entry) => (
              <Card key={entry.id} className="p-3 rounded-xl bg-violet-50 border-violet-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500 text-white flex items-center justify-center font-bold">
                      #{entry.position}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{entry.preferred_date}</p>
                      <p className="text-xs text-slate-500">
                        We'll notify you when a slot opens
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => leaveWaitlist(entry.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Select Button */}
      {selectedDate && (
        <Button
          onClick={() => onSlotSelect?.(selectedDate)}
          className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Continue with {selectedDate}
        </Button>
      )}
    </div>
  );
};

export default SmartScheduling;
