import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Calendar, Clock, Plus, Trash2, Save, RefreshCw,
  ChevronLeft, ChevronRight, X, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const DoctorScheduleManager = ({ doctorToken, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [activeDay, setActiveDay] = useState('monday');
  const [blockedDates, setBlockedDates] = useState([]);
  const [blockedSessions, setBlockedSessions] = useState([]);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('Leave');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('11:00');
  const [newSessionEnd, setNewSessionEnd] = useState('14:00');
  const [newSessionReason, setNewSessionReason] = useState('Break');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${doctorToken}` }
  });

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/doctor-schedule/my-schedule`, getAuthHeaders());
      setSchedule(res.data);
      setBlockedDates(res.data.blocked_dates || []);
      setBlockedSessions(res.data.blocked_sessions || []);
    } catch (error) {
      toast.error('Failed to load schedule');
    }
    setLoading(false);
  };

  const updateDaySchedule = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      weekly_schedule: prev.weekly_schedule.map(d =>
        d.day === day ? { ...d, [field]: value } : d
      )
    }));
  };

  const addSlot = (day) => {
    setSchedule(prev => ({
      ...prev,
      weekly_schedule: prev.weekly_schedule.map(d =>
        d.day === day
          ? { ...d, slots: [...d.slots, { start_time: '09:00', end_time: '13:00' }] }
          : d
      )
    }));
  };

  const removeSlot = (day, index) => {
    setSchedule(prev => ({
      ...prev,
      weekly_schedule: prev.weekly_schedule.map(d =>
        d.day === day
          ? { ...d, slots: d.slots.filter((_, i) => i !== index) }
          : d
      )
    }));
  };

  const updateSlot = (day, index, field, value) => {
    setSchedule(prev => ({
      ...prev,
      weekly_schedule: prev.weekly_schedule.map(d =>
        d.day === day
          ? {
              ...d,
              slots: d.slots.map((slot, i) =>
                i === index ? { ...slot, [field]: value } : slot
              )
            }
          : d
      )
    }));
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/doctor-schedule/my-schedule`, {
        weekly_schedule: schedule.weekly_schedule,
        slot_duration: schedule.slot_duration,
        max_patients_per_slot: schedule.max_patients_per_slot,
        buffer_between_slots: schedule.buffer_between_slots
      }, getAuthHeaders());
      toast.success('Schedule saved!');
    } catch (error) {
      toast.error('Failed to save schedule');
    }
    setSaving(false);
  };

  const blockDate = async () => {
    if (!newBlockDate) {
      toast.error('Select a date');
      return;
    }
    try {
      await axios.post(`${API}/api/doctor-schedule/block-date`, {
        date: newBlockDate,
        reason: newBlockReason
      }, getAuthHeaders());
      setBlockedDates([...blockedDates, { date: newBlockDate, reason: newBlockReason }]);
      setNewBlockDate('');
      toast.success('Date blocked');
    } catch (error) {
      toast.error('Failed to block date');
    }
  };

  const unblockDate = async (date) => {
    try {
      await axios.delete(`${API}/api/doctor-schedule/block-date/${date}`, getAuthHeaders());
      setBlockedDates(blockedDates.filter(b => b.date !== date));
      toast.success('Date unblocked');
    } catch (error) {
      toast.error('Failed to unblock date');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <Card className="p-8">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="mt-2 text-slate-600">Loading schedule...</p>
        </Card>
      </div>
    );
  }

  const currentDaySchedule = schedule?.weekly_schedule?.find(d => d.day === activeDay);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h2 className="font-bold">Manage My Schedule</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-teal-700">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Settings */}
          <Card className="p-4 bg-slate-50">
            <h3 className="font-semibold text-slate-700 mb-3">Appointment Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500">Slot Duration (mins)</label>
                <Input
                  type="number"
                  value={schedule?.slot_duration || 15}
                  onChange={(e) => setSchedule({ ...schedule, slot_duration: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Max Patients/Slot</label>
                <Input
                  type="number"
                  value={schedule?.max_patients_per_slot || 1}
                  onChange={(e) => setSchedule({ ...schedule, max_patients_per_slot: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Buffer (mins)</label>
                <Input
                  type="number"
                  value={schedule?.buffer_between_slots || 0}
                  onChange={(e) => setSchedule({ ...schedule, buffer_between_slots: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Day Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {days.map(day => {
              const dayData = schedule?.weekly_schedule?.find(d => d.day === day);
              return (
                <Button
                  key={day}
                  variant={activeDay === day ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDay(day)}
                  className={`flex-shrink-0 ${activeDay === day ? 'bg-teal-600' : ''} ${!dayData?.is_working ? 'opacity-50' : ''}`}
                >
                  {day.slice(0, 3).toUpperCase()}
                </Button>
              );
            })}
          </div>

          {/* Day Schedule */}
          {currentDaySchedule && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold capitalize">{activeDay}</h3>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentDaySchedule.is_working}
                      onCheckedChange={(checked) => updateDaySchedule(activeDay, 'is_working', checked)}
                    />
                    <span className="text-sm text-slate-500">
                      {currentDaySchedule.is_working ? 'Working' : 'Off'}
                    </span>
                  </div>
                </div>
                {currentDaySchedule.is_working && (
                  <Button size="sm" variant="outline" onClick={() => addSlot(activeDay)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Slot
                  </Button>
                )}
              </div>

              {currentDaySchedule.is_working && (
                <div className="space-y-3">
                  {currentDaySchedule.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <Input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot(activeDay, idx, 'start_time', e.target.value)}
                        className="w-28"
                      />
                      <span className="text-slate-400">to</span>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot(activeDay, idx, 'end_time', e.target.value)}
                        className="w-28"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(activeDay, idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {currentDaySchedule.slots.length === 0 && (
                    <p className="text-center text-slate-400 py-4">No slots. Click "Add Slot" to create.</p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Blocked Dates */}
          <Card className="p-4">
            <h3 className="font-semibold text-slate-700 mb-3">Blocked Dates (Holidays/Leave)</h3>
            
            <div className="flex gap-2 mb-3">
              <Input
                type="date"
                value={newBlockDate}
                onChange={(e) => setNewBlockDate(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Reason"
                value={newBlockReason}
                onChange={(e) => setNewBlockReason(e.target.value)}
                className="w-32"
              />
              <Button onClick={blockDate} className="bg-red-500 hover:bg-red-600">
                Block
              </Button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {blockedDates.map((blocked, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div>
                    <span className="font-medium text-red-700">{blocked.date}</span>
                    <span className="text-sm text-red-500 ml-2">({blocked.reason})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unblockDate(blocked.date)}
                    className="text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {blockedDates.length === 0 && (
                <p className="text-center text-slate-400 py-2">No blocked dates</p>
              )}
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={saveSchedule} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save Schedule
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DoctorScheduleManager;
