import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Plus, RefreshCw, ChevronLeft, ChevronRight, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const StaffShiftManagement = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shiftTypes = {
    morning: { label: 'Morning', time: '8AM-2PM', color: 'bg-amber-100 text-amber-700' },
    evening: { label: 'Evening', time: '2PM-8PM', color: 'bg-blue-100 text-blue-700' },
    night: { label: 'Night', time: '8PM-8AM', color: 'bg-purple-100 text-purple-700' },
    off: { label: 'Off', time: '-', color: 'bg-gray-100 text-gray-500' }
  };

  useEffect(() => {
    fetchStaff();
    fetchShifts();
    fetchSwapRequests();
  }, [currentWeek]);

  const fetchStaff = () => {
    setStaff([
      { id: 's1', name: 'Priya M.', role: 'Receptionist' },
      { id: 's2', name: 'Rahul K.', role: 'Lab Tech' },
      { id: 's3', name: 'Sunita D.', role: 'Nurse' },
      { id: 's4', name: 'Amit S.', role: 'Pharmacist' }
    ]);
  };

  const fetchShifts = () => {
    setShifts([
      { staffId: 's1', day: 0, shift: 'morning' },
      { staffId: 's1', day: 1, shift: 'morning' },
      { staffId: 's1', day: 2, shift: 'evening' },
      { staffId: 's1', day: 3, shift: 'morning' },
      { staffId: 's1', day: 4, shift: 'morning' },
      { staffId: 's1', day: 5, shift: 'off' },
      { staffId: 's2', day: 0, shift: 'evening' },
      { staffId: 's2', day: 1, shift: 'evening' },
      { staffId: 's2', day: 2, shift: 'morning' },
      { staffId: 's2', day: 3, shift: 'evening' },
      { staffId: 's2', day: 4, shift: 'evening' },
      { staffId: 's2', day: 5, shift: 'morning' },
      { staffId: 's3', day: 0, shift: 'morning' },
      { staffId: 's3', day: 1, shift: 'off' },
      { staffId: 's3', day: 2, shift: 'morning' },
      { staffId: 's3', day: 3, shift: 'morning' },
      { staffId: 's3', day: 4, shift: 'evening' },
      { staffId: 's3', day: 5, shift: 'morning' },
      { staffId: 's4', day: 0, shift: 'evening' },
      { staffId: 's4', day: 1, shift: 'morning' },
      { staffId: 's4', day: 2, shift: 'evening' },
      { staffId: 's4', day: 3, shift: 'off' },
      { staffId: 's4', day: 4, shift: 'morning' },
      { staffId: 's4', day: 5, shift: 'evening' }
    ]);
  };

  const fetchSwapRequests = () => {
    setSwapRequests([
      { id: '1', from: 's1', to: 's3', day: 3, reason: 'Personal appointment', status: 'pending' }
    ]);
  };

  const getShiftForStaffDay = (staffId, day) => {
    const shift = shifts.find(s => s.staffId === staffId && s.day === day);
    return shift ? shift.shift : 'off';
  };

  const getWeekDates = () => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay() + 1);
    return days.map((_, idx) => {
      const date = new Date(start);
      date.setDate(date.getDate() + idx);
      return date;
    });
  };

  const changeWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };

  const handleSwapResponse = (requestId, approved) => {
    setSwapRequests(swapRequests.filter(r => r.id !== requestId));
    toast.success(approved ? 'Swap request approved!' : 'Swap request declined');
  };

  const weekDates = getWeekDates();

  return (
    <div className="space-y-4" data-testid="staff-shift-management">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Shift Management</h2>
                <p className="text-indigo-100 text-sm">Staff scheduling & swap requests</p>
              </div>
            </div>
            {swapRequests.length > 0 && (
              <Badge className="bg-amber-500">
                {swapRequests.length} Pending
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeWeek(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="font-semibold">
                {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[5].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeWeek(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Swap Requests */}
      {swapRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
              <RefreshCw className="w-4 h-4" /> Swap Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {swapRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div>
                  <p className="font-medium text-sm">
                    {staff.find(s => s.id === req.from)?.name} ↔ {staff.find(s => s.id === req.to)?.name}
                  </p>
                  <p className="text-xs text-gray-500">{days[req.day]} • {req.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleSwapResponse(req.id, false)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleSwapResponse(req.id, true)}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Schedule Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-sm font-medium text-gray-500 sticky left-0 bg-gray-50">Staff</th>
                {days.map((day, idx) => (
                  <th key={day} className="p-2 text-center text-sm">
                    <div className="font-medium">{day}</div>
                    <div className="text-xs text-gray-400">{weekDates[idx].getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(member => (
                <tr key={member.id} className="border-t">
                  <td className="p-3 sticky left-0 bg-white">
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </td>
                  {days.map((_, dayIdx) => {
                    const shift = getShiftForStaffDay(member.id, dayIdx);
                    const shiftInfo = shiftTypes[shift];
                    return (
                      <td key={dayIdx} className="p-2 text-center">
                        <Badge className={shiftInfo.color}>
                          {shiftInfo.label}
                        </Badge>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(shiftTypes).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <Badge className={value.color}>{value.label}</Badge>
            <span className="text-xs text-gray-500">{value.time}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowSwapDialog(true)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Request Swap
            </Button>
            <Button variant="outline" className="flex-1">
              <Calendar className="w-4 h-4 mr-2" /> Apply Leave
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffShiftManagement;
