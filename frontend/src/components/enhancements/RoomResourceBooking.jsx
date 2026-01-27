import React, { useState, useEffect } from 'react';
import { DoorOpen, Calendar, Clock, Users, Plus, Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

const RoomResourceBooking = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [newBooking, setNewBooking] = useState({ purpose: '', duration: '30' });

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, [selectedDate]);

  const fetchRooms = () => {
    setRooms([
      { id: 'room1', name: 'Consultation Room 1', capacity: 3, equipment: ['Computer', 'Printer'] },
      { id: 'room2', name: 'Consultation Room 2', capacity: 3, equipment: ['Computer'] },
      { id: 'ultrasound', name: 'Ultrasound Room', capacity: 4, equipment: ['Ultrasound Machine', 'Monitor'] },
      { id: 'procedure', name: 'Procedure Room', capacity: 5, equipment: ['OT Table', 'Monitors'] },
      { id: 'lab', name: 'Lab Collection', capacity: 2, equipment: ['Collection Station'] }
    ]);
  };

  const fetchBookings = () => {
    setBookings([
      { id: '1', room: 'room1', time: '09:00', duration: 30, purpose: 'Dr. Vikas - Patient Consultation', bookedBy: 'Dr. Vikas' },
      { id: '2', room: 'room1', time: '10:00', duration: 60, purpose: 'Staff Meeting', bookedBy: 'Admin' },
      { id: '3', room: 'ultrasound', time: '09:30', duration: 30, purpose: 'Prenatal Scan', bookedBy: 'Dr. Neha' },
      { id: '4', room: 'procedure', time: '14:00', duration: 60, purpose: 'Minor Procedure', bookedBy: 'Dr. Vikas' }
    ]);
  };

  const isSlotBooked = (roomId, time) => {
    return bookings.some(b => b.room === roomId && b.time === time);
  };

  const getBookingForSlot = (roomId, time) => {
    return bookings.find(b => b.room === roomId && b.time === time);
  };

  const handleSlotClick = (roomId, time) => {
    if (isSlotBooked(roomId, time)) {
      const booking = getBookingForSlot(roomId, time);
      toast.info(`Booked: ${booking.purpose}`);
      return;
    }
    setSelectedSlot({ roomId, time });
    setShowNewBooking(true);
  };

  const handleBooking = () => {
    if (!newBooking.purpose) {
      toast.error('Please enter booking purpose');
      return;
    }
    
    setBookings([...bookings, {
      id: Date.now().toString(),
      room: selectedSlot.roomId,
      time: selectedSlot.time,
      duration: parseInt(newBooking.duration),
      purpose: newBooking.purpose,
      bookedBy: 'You'
    }]);
    
    toast.success('Room booked successfully!');
    setShowNewBooking(false);
    setSelectedSlot(null);
    setNewBooking({ purpose: '', duration: '30' });
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-4" data-testid="room-resource-booking">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Room Booking</h2>
                <p className="text-blue-100 text-sm">Reserve consultation rooms & equipment</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="font-semibold">{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</p>
              <p className="text-sm text-gray-500">{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Room Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-sm font-medium text-gray-500 sticky left-0 bg-gray-50">Room</th>
                {timeSlots.map(time => (
                  <th key={time} className="p-2 text-center text-xs font-medium text-gray-500">{time}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room.id} className="border-t">
                  <td className="p-3 sticky left-0 bg-white">
                    <p className="font-medium text-sm">{room.name}</p>
                    <p className="text-xs text-gray-500">
                      <Users className="w-3 h-3 inline mr-1" />{room.capacity}
                    </p>
                  </td>
                  {timeSlots.map(time => {
                    const booked = isSlotBooked(room.id, time);
                    const booking = getBookingForSlot(room.id, time);
                    return (
                      <td key={time} className="p-1">
                        <button
                          onClick={() => handleSlotClick(room.id, time)}
                          className={`w-full h-8 rounded text-xs transition-colors ${
                            booked 
                              ? 'bg-blue-500 text-white cursor-default' 
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                          title={booked ? booking.purpose : 'Available'}
                        >
                          {booked ? '●' : ''}
                        </button>
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
      <div className="flex gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded" />
          <span className="text-sm text-gray-500">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span className="text-sm text-gray-500">Booked</span>
        </div>
      </div>

      {/* Today's Bookings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today's Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookings.map(booking => (
            <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{booking.purpose}</p>
                  <p className="text-xs text-gray-500">
                    {rooms.find(r => r.id === booking.room)?.name} • {booking.time} ({booking.duration}min)
                  </p>
                </div>
              </div>
              <Badge variant="outline">{booking.bookedBy}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* New Booking Dialog */}
      <Dialog open={showNewBooking} onOpenChange={setShowNewBooking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Room</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium">{rooms.find(r => r.id === selectedSlot.roomId)?.name}</p>
                <p className="text-sm text-gray-500">{selectedSlot.time}</p>
              </div>
              <div>
                <Label>Purpose</Label>
                <Input
                  placeholder="e.g., Patient consultation, Meeting"
                  value={newBooking.purpose}
                  onChange={(e) => setNewBooking({...newBooking, purpose: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Duration</Label>
                <select
                  value={newBooking.duration}
                  onChange={(e) => setNewBooking({...newBooking, duration: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <Button onClick={handleBooking} className="w-full">
                <Check className="w-4 h-4 mr-2" /> Confirm Booking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomResourceBooking;
