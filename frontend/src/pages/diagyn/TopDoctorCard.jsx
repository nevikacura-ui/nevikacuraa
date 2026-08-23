import React, { useState, useEffect } from 'react';
import { Star, Award, User, Clock, MapPin, ChevronRight } from 'lucide-react';
import { format, addDays, isSunday, isToday } from 'date-fns';
import { DOCTOR_BOOKING_THEMES } from './data';

const TopDoctorCard = ({ doctor, onSelect, index = 0 }) => {
  const [weekDates, setWeekDates] = useState([]);
  const [slotsPerDay, setSlotsPerDay] = useState({});
  const theme = DOCTOR_BOOKING_THEMES[doctor.id] || DOCTOR_BOOKING_THEMES.vikas;

  useEffect(() => {
    const today = new Date();
    const dates = [];
    let daysAdded = 0;
    let offset = 0;
    while (daysAdded < 6 && offset < 14) {
      const date = addDays(today, offset);
      if (!isSunday(date)) { dates.push(date); daysAdded++; }
      offset++;
    }
    setWeekDates(dates);
  }, []);

  useEffect(() => {
    if (weekDates.length === 0) return;
    const counts = {};
    weekDates.forEach(date => {
      const dayName = format(date, 'EEEE');
      let totalSlots = 0;
      ['pushpa', 'amnion'].forEach(clinicId => {
        const clinicSchedule = doctor.schedule[clinicId];
        if (clinicSchedule) {
          clinicSchedule.forEach(schedule => {
            if (schedule.days.includes(dayName)) {
              const [startTime, endTime] = schedule.time.split('-');
              const [startHour] = startTime.split(':').map(Number);
              const [endHour] = endTime.split(':').map(Number);
              totalSlots += (endHour - startHour) * 4;
            }
          });
        }
      });
      counts[format(date, 'yyyy-MM-dd')] = totalSlots;
    });
    setSlotsPerDay(counts);
  }, [weekDates, doctor]);

  const totalSlots = Object.values(slotsPerDay).reduce((a, b) => a + b, 0);

  return (
    <div
      className="rounded-[28px] overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        boxShadow: `0 12px 40px ${theme.accent}20, 0 4px 16px rgba(0,0,0,0.06)`,
        animation: `doctorCardIn 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 150}ms both`,
      }}
      onClick={() => onSelect(doctor)}
      data-testid={`doctor-card-${doctor.id}`}
    >
      <style>{`@keyframes doctorCardIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>

      {/* Hero section — themed color */}
      <div className="relative px-5 pt-5 pb-4" style={{ background: theme.headerCardBg || theme.accent }}>
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full p-[2.5px]" style={{ background: 'rgba(255,255,255,0.5)' }}>
              <img loading="lazy" decoding="async" src={doctor.image} alt={doctor.name} className="w-full h-full rounded-full object-cover border-[2px] border-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-[2.5px] border-white flex items-center justify-center" style={{ background: totalSlots > 0 ? '#22c55e' : '#ef4444' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black truncate" style={{ color: theme.heroText || '#0F2A28', fontFamily: 'Outfit, sans-serif' }}>{doctor.name}</h3>
            <p className="text-sm font-medium" style={{ color: theme.heroTextMuted || '#2D5C58' }}>{doctor.specialty}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }}>
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold" style={{ color: theme.heroText || '#0F2A28' }}>{doctor.rating}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: theme.heroTextMuted || '#2D5C58' }}>{doctor.experience}+ yrs</span>
            </div>
          </div>
          {/* Arrow */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: theme.navBtnBg || 'rgba(0,0,0,0.2)' }}>
            <ChevronRight className="w-5 h-5" style={{ color: theme.navBtnIcon || '#fff' }} />
          </div>
        </div>
      </div>

      {/* Bottom section — dark themed card */}
      <div className="px-5 py-4" style={{ background: theme.cardBg }}>
        {/* Availability status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${totalSlots > 20 ? 'bg-green-400' : totalSlots > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
            <span className="text-xs font-bold" style={{ color: theme.accent }}>
              {totalSlots > 20 ? 'Available today' : totalSlots > 0 ? `${totalSlots} slots this week` : 'Fully booked'}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {format(weekDates[0] || new Date(), 'MMM yyyy')}
          </span>
        </div>

        {/* Week date pills */}
        <div className="flex gap-1.5">
          {weekDates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const slots = slotsPerDay[dateStr] || 0;
            const hasSlots = slots > 0;
            const isTd = isToday(date);
            return (
              <div key={dateStr}
                className="flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all"
                style={isTd
                  ? { background: theme.accent, boxShadow: `0 4px 12px ${theme.accent}40` }
                  : hasSlots
                    ? { background: 'rgba(255,255,255,0.08)' }
                    : { background: 'rgba(255,255,255,0.03)', opacity: 0.4 }}
                data-testid={`day-display-${format(date, 'EEE').toLowerCase()}-${doctor.id}`}
              >
                <span className="text-[9px] font-bold uppercase" style={{ color: isTd ? (theme.selectedText === '#FFFFFF' ? '#fff' : '#0D1F1E') : 'rgba(255,255,255,0.5)' }}>
                  {format(date, 'EEE')}
                </span>
                <span className="text-sm font-black mt-0.5" style={{ color: isTd ? (theme.selectedText === '#FFFFFF' ? '#fff' : '#0D1F1E') : '#FFFFFF' }}>
                  {format(date, 'd')}
                </span>
                {hasSlots && !isTd && <div className="w-1 h-1 rounded-full mt-1" style={{ background: theme.accent }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TopDoctorCard;
