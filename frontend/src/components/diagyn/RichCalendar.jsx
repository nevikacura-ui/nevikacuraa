import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSunday, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

const RichCalendar = ({ selectedDate, onSelect, doctorSchedule, clinicId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // 3-month booking window limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxBookingDate = new Date(today);
  maxBookingDate.setMonth(maxBookingDate.getMonth() + 3);
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const isDoctorAvailable = (date) => {
    if (!doctorSchedule || !clinicId) return true;
    const dayName = fullDayNames[date.getDay()];
    const schedule = doctorSchedule[clinicId];
    if (!schedule) return false;
    return schedule.some(s => s.days.includes(dayName));
  };
  
  // Check if date is beyond 3-month window
  const isBeyondBookingWindow = (date) => {
    return date > maxBookingDate;
  };
  
  const isDateDisabled = (date) => {
    return date < today || isSunday(date) || !isDoctorAvailable(date) || isBeyondBookingWindow(date);
  };
  
  // Prevent navigating beyond 3-month window
  const canGoNextMonth = () => {
    const nextMonthStart = addDays(endOfMonth(currentMonth), 1);
    return nextMonthStart <= maxBookingDate;
  };
  
  // Prevent navigating before current month
  const canGoPrevMonth = () => {
    const prevMonthEnd = addDays(startOfMonth(currentMonth), -1);
    return prevMonthEnd >= today;
  };
  
  return (
    <div className="bg-[#1A1A1A] rounded-2xl shadow-lg overflow-hidden border border-[#333333]">
      {/* Month Header - Blue accent */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => canGoPrevMonth() && setCurrentMonth(prev => addDays(startOfMonth(prev), -1))}
            disabled={!canGoPrevMonth()}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              canGoPrevMonth() ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 cursor-not-allowed opacity-50'
            }`}
            data-testid="calendar-prev-month"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <p className="text-xs text-white/80">Book up to 3 months ahead</p>
          </div>
          <button 
            onClick={() => canGoNextMonth() && setCurrentMonth(prev => addDays(endOfMonth(prev), 1))}
            disabled={!canGoNextMonth()}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              canGoNextMonth() ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 cursor-not-allowed opacity-50'
            }`}
            data-testid="calendar-next-month"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Day Names */}
      <div className="grid grid-cols-7 bg-[#0D0D0D] border-b border-[#333333]">
        {dayNames.map(day => (
          <div 
            key={day} 
            className={`py-3 text-center text-xs font-semibold ${day === 'Sun' ? 'text-red-400' : 'text-gray-500'}`}
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 p-3 bg-[#1A1A1A]">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-11" />
        ))}
        {days.map(day => {
          const disabled = isDateDisabled(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isAvailable = isDoctorAvailable(day) && !isSunday(day);
          
          return (
            <button
              key={day.toString()}
              onClick={() => !disabled && onSelect(day)}
              disabled={disabled}
              data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
              className={`
                h-11 w-full rounded-xl text-sm font-medium transition-all relative
                ${disabled 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-blue-500 text-white shadow-md scale-105' 
                    : isTodayDate
                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white font-bold border border-blue-500/30'
                      : isAvailable
                        ? 'hover:bg-[#262626] text-white'
                        : 'text-gray-600'
                }
              `}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {format(day, 'd')}
              {isAvailable && !disabled && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 bg-[#0D0D0D] border-t border-[#333333] flex items-center gap-5 text-xs text-gray-500" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-blue-400 rounded-full" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-gray-600 rounded-full" />
          Unavailable
        </span>
      </div>
    </div>
  );
};

export default RichCalendar;
