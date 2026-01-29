import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Clock, Users, Bell, Calendar, ChevronRight, Check, 
  AlertCircle, RefreshCw, Zap, Phone, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const AppointmentWaitlist = ({ 
  doctorId, 
  doctorName, 
  clinic = 'diagyn',
  patientId,
  patientName,
  patientPhone,
  onSlotAvailable
}) => {
  const [waitlistStatus, setWaitlistStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [preferredDates, setPreferredDates] = useState([]);
  const [notifyMethod, setNotifyMethod] = useState('both'); // 'sms', 'whatsapp', 'both'
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    if (patientId && doctorId) {
      checkWaitlistStatus();
    }
  }, [patientId, doctorId]);

  const checkWaitlistStatus = async () => {
    try {
      const res = await fetch(`${API}/api/appointments/waitlist/status?patient_id=${patientId}&doctor_id=${doctorId}`);
      const data = await res.json();
      if (data.success) {
        setWaitlistStatus(data);
      }
    } catch (error) {
      console.error('Failed to check waitlist status:', error);
    }
  };

  const joinWaitlist = async () => {
    if (!patientPhone) {
      toast.error('Phone number required to join waitlist');
      return;
    }

    setJoiningWaitlist(true);
    try {
      const res = await fetch(`${API}/api/appointments/waitlist/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          patient_name: patientName,
          patient_phone: patientPhone,
          doctor_id: doctorId,
          doctor_name: doctorName,
          clinic,
          preferred_dates: preferredDates,
          notify_via: notifyMethod,
          priority: 'normal'
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Added to waitlist! We\'ll notify you when a slot opens.');
        setWaitlistStatus({
          on_waitlist: true,
          position: data.position,
          estimated_wait: data.estimated_wait
        });
        setShowJoinForm(false);
      } else {
        toast.error(data.message || 'Failed to join waitlist');
      }
    } catch (error) {
      toast.error('Failed to join waitlist');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const leaveWaitlist = async () => {
    try {
      const res = await fetch(`${API}/api/appointments/waitlist/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Removed from waitlist');
        setWaitlistStatus(null);
      }
    } catch (error) {
      toast.error('Failed to leave waitlist');
    }
  };

  // Generate next 7 days for date selection
  const getNextDays = () => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
      });
    }
    return days;
  };

  const toggleDate = (date) => {
    if (preferredDates.includes(date)) {
      setPreferredDates(preferredDates.filter(d => d !== date));
    } else {
      setPreferredDates([...preferredDates, date]);
    }
  };

  // If already on waitlist, show status
  if (waitlistStatus?.on_waitlist) {
    return (
      <Card className="border-amber-200 bg-amber-50" data-testid="waitlist-status-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-800">You're on the Waitlist!</h4>
              <p className="text-sm text-amber-700 mt-1">
                Position: <span className="font-bold">#{waitlistStatus.position || 'N/A'}</span>
                {waitlistStatus.estimated_wait && (
                  <span className="ml-2">• Est. wait: {waitlistStatus.estimated_wait}</span>
                )}
              </p>
              <p className="text-xs text-amber-600 mt-2">
                We'll notify you via {notifyMethod === 'both' ? 'SMS & WhatsApp' : notifyMethod} when a slot opens
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={leaveWaitlist}
                className="mt-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
              >
                Leave Waitlist
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" data-testid="waitlist-join-card">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            No Slots Available?
          </CardTitle>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            <Bell className="w-3 h-3 mr-1" />
            Get Notified
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {!showJoinForm ? (
          <div className="text-center py-2">
            <p className="text-slate-600 text-sm mb-3">
              Join the waitlist and we'll notify you when a slot opens for <strong>{doctorName}</strong>
            </p>
            <Button
              onClick={() => setShowJoinForm(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl"
              data-testid="join-waitlist-btn"
            >
              <Bell className="w-4 h-4 mr-2" />
              Join Waitlist
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preferred Dates */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Preferred Dates (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {getNextDays().map((day) => (
                  <button
                    key={day.date}
                    onClick={() => toggleDate(day.date)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      preferredDates.includes(day.date)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.display}
                    {preferredDates.includes(day.date) && <Check className="w-3 h-3 ml-1 inline" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Method */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Notify me via
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'sms', label: 'SMS', icon: Phone },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                  { id: 'both', label: 'Both', icon: Bell }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setNotifyMethod(method.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      notifyMethod === method.id
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    }`}
                  >
                    <method.icon className="w-4 h-4" />
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowJoinForm(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={joinWaitlist}
                disabled={joiningWaitlist}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl"
              >
                {joiningWaitlist ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Confirm
              </Button>
            </div>

            {/* Info */}
            <p className="text-xs text-slate-500 text-center">
              You'll be notified at {patientPhone} when a slot becomes available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentWaitlist;
