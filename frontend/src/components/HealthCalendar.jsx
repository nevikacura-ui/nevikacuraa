import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Pill, FlaskConical, Stethoscope, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/* Unified Health Calendar — shows appointments, medicine schedules, lab bookings across all platforms */
const HealthCalendar = ({ phone }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await fetch(`${API}/api/health-calendar/events?phone=${phone}&year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Calendar fetch error:', e);
    }
    setLoading(false);
  }, [phone, currentMonth]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const days = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const today = new Date();
  const isToday = (day) => today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();

  const getEventsForDay = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const eventIcons = {
    appointment: { icon: Stethoscope, color: '#06B6D4' },
    medicine: { icon: Pill, color: '#F97316' },
    lab: { icon: FlaskConical, color: '#10B981' },
    reminder: { icon: Clock, color: '#8B5CF6' },
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="mx-4 my-3 rounded-2xl overflow-hidden" data-testid="health-calendar"
      style={{ background: '#FFF8F0', border: '1px solid rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 active:scale-95">
          <ChevronLeft className="w-4 h-4 text-stone-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-stone-800">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</p>
          <p className="text-[9px] text-stone-400">Health Calendar</p>
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 active:scale-95">
          <ChevronRight className="w-4 h-4 text-stone-500" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 px-3">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[9px] font-semibold text-stone-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-3 pb-2 gap-y-0.5">
        {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map(day => {
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all
                ${isToday(day) ? 'font-bold' : ''}
                ${isSelected ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-stone-50'}
              `}
            >
              <span className={isToday(day) ? 'text-emerald-600' : 'text-stone-700'}>{day}</span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <div key={j} className="w-1 h-1 rounded-full"
                      style={{ background: eventIcons[e.type]?.color || '#8B5CF6' }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-2">
          {selectedDayEvents.length === 0 ? (
            <p className="text-[10px] text-stone-400 text-center py-2">No events on this day</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDayEvents.map((evt, i) => {
                const config = eventIcons[evt.type] || eventIcons.reminder;
                const Icon = config.icon;
                return (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `${config.color}15` }}>
                      <Icon className="w-3 h-3" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-stone-700 truncate">{evt.title}</p>
                      {evt.time && <p className="text-[9px] text-stone-400">{evt.time}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 px-3 pb-3">
        {Object.entries(eventIcons).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: val.color }} />
            <span className="text-[8px] text-stone-400 capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthCalendar;
