import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Calendar, Sun, Moon, X, Loader2, CalendarOff, Clock, Trash2, AlertTriangle
} from 'lucide-react';
import { lightTap, mediumTap, heavyTap, successPattern, errorPattern } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL;

// Session definitions
const SESSIONS = {
  morning: {
    label: 'Morning',
    icon: Sun,
    time: '11:30 AM - 2:00 PM',
    start: '11:00',
    end: '14:00',
    color: 'amber'
  },
  evening: {
    label: 'Evening',
    icon: Moon,
    time: '6:00 PM - 10:00 PM',
    start: '18:00',
    end: '22:00',
    color: 'indigo'
  }
};

const DoctorLeaveManager = ({ doctorToken, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockedSessions, setBlockedSessions] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  
  // New leave form
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSession, setSelectedSession] = useState(null); // 'morning', 'evening', or 'fullday'
  
  // Override confirmation
  const [conflictData, setConflictData] = useState(null); // { patients, appointment_count, session }
  
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${doctorToken}` }
  });

  // Get min date (today)
  const getMinDate = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/doctor-schedule/my-schedule`, getAuthHeaders());
      setBlockedDates(res.data.blocked_dates || []);
      setBlockedSessions(res.data.blocked_sessions || []);
    } catch (error) {
      console.error('Failed to load schedule:', error);
      toast.error('Failed to load schedule');
    }
    setLoading(false);
  };

  const blockSession = async (forceOverride = false) => {
    if (!selectedDate) {
      errorPattern();
      toast.error('Please select a date');
      return;
    }
    if (!selectedSession) {
      errorPattern();
      toast.error('Please select a session');
      return;
    }

    setSaving(true);
    heavyTap();

    try {
      let response;
      if (selectedSession === 'fullday') {
        response = await axios.post(`${API}/api/doctor-schedule/block-date`, {
          date: selectedDate,
          reason: 'Leave',
          force_override: forceOverride
        }, getAuthHeaders());
      } else {
        const session = SESSIONS[selectedSession];
        response = await axios.post(`${API}/api/doctor-schedule/block-session`, {
          date: selectedDate,
          start_time: session.start,
          end_time: session.end,
          reason: `${session.label} Leave`,
          force_override: forceOverride
        }, getAuthHeaders());
      }
      
      const result = response.data;
      
      // If conflict detected and no force override - show confirmation
      if (result.conflict && !forceOverride) {
        setConflictData({
          patients: result.patients || [],
          appointment_count: result.appointment_count,
          message: result.message
        });
        setSaving(false);
        return;
      }
      
      // Success - update local state
      if (selectedSession === 'fullday') {
        setBlockedDates([...blockedDates, { date: selectedDate, reason: 'Leave' }]);
      } else {
        const session = SESSIONS[selectedSession];
        setBlockedSessions([...blockedSessions, {
          date: selectedDate,
          start_time: session.start,
          end_time: session.end,
          reason: `${session.label} Leave`
        }]);
      }
      
      successPattern();
      const cancelled = result.cancelled_count || 0;
      const notified = result.notified_patients || [];
      if (cancelled > 0) {
        toast.success(`Session blocked. ${cancelled} appointment(s) cancelled. ${notified.length} patient(s) notified via WhatsApp.`);
      } else {
        const label = selectedSession === 'fullday' ? 'Full day' : SESSIONS[selectedSession]?.label;
        toast.success(`${label} leave added for ${formatDate(selectedDate)}`);
      }
      
      // Reset
      setSelectedDate('');
      setSelectedSession(null);
      setConflictData(null);
    } catch (error) {
      errorPattern();
      toast.error('Failed to block session');
      console.error(error);
    }
    setSaving(false);
  };

  const confirmOverride = () => {
    blockSession(true);
  };

  const cancelOverride = () => {
    setConflictData(null);
  };

  const removeBlockedDate = async (date) => {
    mediumTap();
    try {
      await axios.delete(`${API}/api/doctor-schedule/block-date/${date}`, getAuthHeaders());
      setBlockedDates(blockedDates.filter(b => b.date !== date));
      successPattern();
      toast.success('Leave removed');
    } catch (error) {
      errorPattern();
      toast.error('Failed to remove');
    }
  };

  const removeBlockedSession = async (date, startTime) => {
    mediumTap();
    try {
      await axios.delete(`${API}/api/doctor-schedule/block-session/${date}/${startTime}`, getAuthHeaders());
      setBlockedSessions(blockedSessions.filter(s => !(s.date === date && s.start_time === startTime)));
      successPattern();
      toast.success('Session unblocked');
    } catch (error) {
      errorPattern();
      toast.error('Failed to unblock');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getSessionLabel = (startTime) => {
    if (startTime === '11:00') return { ...SESSIONS.morning, type: 'morning' };
    if (startTime === '18:00') return { ...SESSIONS.evening, type: 'evening' };
    return { label: `${startTime}`, icon: Clock, color: 'slate', type: 'custom' };
  };

  // Combine and sort all blocked items by date
  const getAllBlockedItems = () => {
    const items = [];
    
    // Add full day blocks
    blockedDates.forEach(bd => {
      items.push({
        type: 'fullday',
        date: bd.date,
        reason: bd.reason,
        label: 'Full Day'
      });
    });
    
    // Add session blocks
    blockedSessions.forEach(bs => {
      const sessionInfo = getSessionLabel(bs.start_time);
      items.push({
        type: 'session',
        date: bs.date,
        start_time: bs.start_time,
        end_time: bs.end_time,
        reason: bs.reason,
        label: sessionInfo.label,
        icon: sessionInfo.icon,
        color: sessionInfo.color
      });
    });
    
    // Sort by date
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const upcomingBlocks = getAllBlockedItems().filter(item => item.date >= getMinDate());

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <Card className="p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-slate-600">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="leave-manager-modal">
      <Card className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
        {/* Header */}
        <div className="p-4 border-b bg-blue-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5" />
            <h2 className="font-bold">Leave Management</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-600" data-testid="close-leave-manager">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add New Leave */}
          <Card className="p-4 border-2 border-dashed border-blue-200 bg-blue-50/50">
            <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Block Session / Leave
            </h3>
            
            {/* Date Selection */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-1 block">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                min={getMinDate()}
                onChange={(e) => { lightTap(); setSelectedDate(e.target.value); }}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-base"
                data-testid="leave-date-input"
              />
            </div>
            
            {/* Session Selection */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-2 block">Select Session</label>
              <div className="grid grid-cols-3 gap-2">
                {/* Morning Button */}
                <button
                  onClick={() => { selectionTap(); setSelectedSession('morning'); }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    selectedSession === 'morning' 
                      ? 'border-amber-500 bg-amber-50 shadow-sm' 
                      : 'border-slate-200 hover:border-amber-200'
                  }`}
                  data-testid="select-morning-session"
                >
                  <Sun className={`w-5 h-5 mx-auto mb-1 ${selectedSession === 'morning' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div className="font-bold text-sm text-amber-600">Morning</div>
                  <div className="text-[10px] text-slate-500">11AM - 2PM</div>
                </button>
                
                {/* Evening Button */}
                <button
                  onClick={() => { selectionTap(); setSelectedSession('evening'); }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    selectedSession === 'evening' 
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                  data-testid="select-evening-session"
                >
                  <Moon className={`w-5 h-5 mx-auto mb-1 ${selectedSession === 'evening' ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <div className="font-bold text-sm text-indigo-600">Evening</div>
                  <div className="text-[10px] text-slate-500">6PM - 10PM</div>
                </button>
                
                {/* Full Day Button */}
                <button
                  onClick={() => { selectionTap(); setSelectedSession('fullday'); }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    selectedSession === 'fullday' 
                      ? 'border-red-500 bg-red-50 shadow-sm' 
                      : 'border-slate-200 hover:border-red-200'
                  }`}
                  data-testid="select-fullday"
                >
                  <CalendarOff className={`w-5 h-5 mx-auto mb-1 ${selectedSession === 'fullday' ? 'text-red-500' : 'text-slate-400'}`} />
                  <div className="font-bold text-sm text-red-600">Full Day</div>
                  <div className="text-[10px] text-slate-500">All Sessions</div>
                </button>
              </div>
            </div>
            
            {/* Override Confirmation */}
            {conflictData && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl" data-testid="override-confirm-dialog">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-bold text-red-700 text-sm">{conflictData.appointment_count} Existing Booking(s)</span>
                </div>
                <p className="text-xs text-red-600 mb-2">These patients have appointments that will be cancelled:</p>
                <div className="space-y-1 mb-3 max-h-24 overflow-y-auto">
                  {conflictData.patients.map((p, i) => (
                    <div key={i} className="text-xs bg-white rounded-lg px-2 py-1.5 flex justify-between items-center border border-red-100">
                      <span className="font-medium text-slate-700">{p.name}</span>
                      <span className="text-slate-400">{p.time}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-red-500 mb-3">Patients will be notified via WhatsApp about the cancellation.</p>
                <div className="flex gap-2">
                  <Button 
                    onClick={cancelOverride}
                    variant="outline"
                    className="flex-1 h-9 rounded-lg text-xs"
                    data-testid="cancel-override-btn"
                  >
                    Keep Bookings
                  </Button>
                  <Button 
                    onClick={confirmOverride}
                    disabled={saving}
                    className="flex-1 h-9 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-bold"
                    data-testid="confirm-override-btn"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel & Block'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Block Button */}
            <Button 
              onClick={() => blockSession(false)} 
              disabled={saving || !selectedDate || !selectedSession || !!conflictData}
              className="w-full h-11 rounded-xl bg-blue-500 hover:bg-blue-600 font-bold"
              data-testid="confirm-block-btn"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CalendarOff className="w-4 h-4 mr-2" />
                  Block {selectedSession === 'fullday' ? 'Full Day' : selectedSession === 'morning' ? 'Morning' : selectedSession === 'evening' ? 'Evening' : 'Session'}
                </>
              )}
            </Button>
          </Card>

          {/* Upcoming Blocked Sessions */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming Blocked Sessions ({upcomingBlocks.length})
            </h3>
            
            {upcomingBlocks.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No upcoming blocked sessions</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {upcomingBlocks.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      item.type === 'fullday' 
                        ? 'bg-red-50 border border-red-100' 
                        : item.color === 'amber' 
                          ? 'bg-amber-50 border border-amber-100'
                          : 'bg-indigo-50 border border-indigo-100'
                    }`}
                    data-testid={`blocked-item-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      {item.type === 'fullday' ? (
                        <CalendarOff className="w-5 h-5 text-red-500" />
                      ) : item.icon ? (
                        <item.icon className={`w-5 h-5 ${item.color === 'amber' ? 'text-amber-500' : 'text-indigo-500'}`} />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-500" />
                      )}
                      <div>
                        <div className={`font-bold text-sm ${
                          item.type === 'fullday' ? 'text-red-700' : item.color === 'amber' ? 'text-amber-700' : 'text-indigo-700'
                        }`}>
                          {formatDate(item.date)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.type === 'fullday' ? 'Full Day Leave' : `${item.label} (${item.start_time} - ${item.end_time})`}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => item.type === 'fullday' 
                        ? removeBlockedDate(item.date)
                        : removeBlockedSession(item.date, item.start_time)
                      }
                      className="text-red-500 hover:bg-red-100 h-8 w-8 p-0"
                      data-testid={`remove-block-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50">
          <Button variant="outline" onClick={onClose} className="w-full h-11 rounded-xl">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Helper - missing import
const selectionTap = () => {
  if (navigator.vibrate) {
    navigator.vibrate(15);
  }
};

export default DoctorLeaveManager;
