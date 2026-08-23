import React from 'react';
import { Clock, Loader2, Wifi, WifiOff, Ban } from 'lucide-react';
import AppointmentWaitlist from '@/components/AppointmentWaitlist';

const TimeSlotPicker = ({ 
  slots, 
  bookedSlots, 
  selectedSlot, 
  onSelect, 
  selectedDate, 
  currentTime, 
  loading, 
  wsConnected, 
  doctor, 
  clinic, 
  patientData 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading available slots...</p>
        </div>
      </div>
    );
  }

  // Safety check for slots array
  const safeSlots = Array.isArray(slots) ? slots : [];
  const safeBookedSlots = Array.isArray(bookedSlots) ? bookedSlots : [];
  
  const unbookedSlots = safeSlots.filter(slot => !safeBookedSlots.includes(slot));

  if (unbookedSlots.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#262626] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm">No slots available for this day</p>
          <p className="text-gray-600 text-xs mt-1">Try selecting another date or join the waitlist below</p>
        </div>
        
        {/* Waitlist Component */}
        <AppointmentWaitlist
          doctorId={doctor?.id}
          doctorName={doctor?.name}
          clinic={clinic}
          patientId={patientData?.id}
          patientName={patientData?.name}
          patientPhone={patientData?.phone}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Connection Status */}
      <div className="flex items-center justify-end mb-4">
        <span className={`flex items-center gap-1.5 text-xs font-medium ${wsConnected ? 'text-green-400' : 'text-gray-600'}`}>
          {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {wsConnected ? 'Live Updates' : 'Offline'}
        </span>
      </div>

      {/* Booked Slots Display */}
      {bookedSlots.length > 0 && (
        <div className="mb-4 p-3 bg-red-500/10 rounded-xl border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Booked Slots</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bookedSlots.map(slot => (
              <span key={slot} className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-md font-medium">
                {slot}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Time Slots Grid - Dark with Blue when Selected */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
        {slots.map(slot => {
          const isBooked = bookedSlots.includes(slot);
          const hour = parseInt(slot.split(':')[0]);
          const minute = parseInt(slot.split(':')[1]) || 0;
          
          // Get current time in IST (UTC+5:30) for accurate comparison
          const now = new Date();
          const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
          const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
          
          // Check if selected date is today in IST
          const istDateStr = istTime.toISOString().split('T')[0];
          const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
          const isToday = selectedDateStr === istDateStr;
          
          const slotTimeInMinutes = hour * 60 + minute;
          const currentTimeInMinutes = istTime.getHours() * 60 + istTime.getMinutes() + 15;
          const isPastSlot = isToday && slotTimeInMinutes <= currentTimeInMinutes;
          const isDisabled = isBooked || isPastSlot;
          
          return (
            <button
              key={slot}
              onClick={() => !isDisabled && onSelect(slot)}
              disabled={isDisabled}
              data-testid={`slot-${slot}`}
              title={isPastSlot ? 'Time has passed' : isBooked ? `${slot} - Already booked` : `${slot} - Available`}
              className={`
                py-3 px-2 text-sm rounded-xl border-2 transition-all font-semibold relative
                ${isBooked
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 cursor-not-allowed'
                  : isPastSlot
                    ? 'bg-[#262626] text-gray-600 border-[#333333] cursor-not-allowed line-through'
                    : selectedSlot === slot 
                      ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-400/50' 
                      : 'bg-[#262626] text-white border-[#333333] hover:bg-[#333333] hover:border-blue-500/50 shadow-sm hover:shadow-md'
                }
              `}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {isBooked && <Ban className="w-3 h-3 inline mr-1 text-red-400" />}
              {isPastSlot && !isBooked && <Ban className="w-3 h-3 inline mr-1" />}
              {slot}
              {isBooked && <span className="block text-[9px] text-red-400 mt-0.5">BOOKED</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
