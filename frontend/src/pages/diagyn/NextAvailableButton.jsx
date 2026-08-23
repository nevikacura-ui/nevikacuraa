import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const NextAvailableButton = ({ doctors, clinics, onBookNow }) => {
  const [nextSlots, setNextSlots] = useState([]);

  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const results = [];

    doctors.forEach(doc => {
      ['pushpa', 'amnion'].forEach(clinicId => {
        const sched = doc.schedule?.[clinicId];
        if (!sched) return;
        const clinicObj = clinics.find(c => c.id === clinicId);

        sched.forEach(s => {
          const todayName = format(now, 'EEEE');
          if (!s.days.includes(todayName)) return;
          const [startT, endT] = s.time.split('-');
          const [endH, endM] = endT.split(':').map(Number);
          const [startH] = startT.split(':').map(Number);
          let slotH = startH;
          let slotM = 0;
          while (slotH < endH || (slotH === endH && slotM < (endM || 0))) {
            if (slotH > currentHour || (slotH === currentHour && slotM > currentMin)) {
              const ampm = slotH >= 12 ? 'PM' : 'AM';
              const h12 = slotH > 12 ? slotH - 12 : slotH === 0 ? 12 : slotH;
              results.push({
                doctor: doc,
                clinic: clinicObj,
                time: `${h12}:${String(slotM).padStart(2, '0')} ${ampm}`,
                rawH: slotH,
                rawM: slotM,
              });
              return;
            }
            slotM += 15;
            if (slotM >= 60) { slotM = 0; slotH++; }
          }
        });
      });
    });

    results.sort((a, b) => a.rawH * 60 + a.rawM - (b.rawH * 60 + b.rawM));
    const seen = new Set();
    const unique = results.filter(r => {
      if (seen.has(r.doctor.id)) return false;
      seen.add(r.doctor.id);
      return true;
    });
    setNextSlots(unique.slice(0, 2));
  }, [doctors, clinics]);

  const now = new Date();
  const hour = now.getHours();
  const showWalkIn = (hour < 13 || hour >= 21);

  if (nextSlots.length === 0 && !showWalkIn) return null;

  return (
    <div className="mb-4" data-testid="next-available-btn">
      <style>{`
        @keyframes festivalShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .festival-btn {
          background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #06b6d4, #22c55e, #f97316);
          background-size: 300% 300%;
          animation: festivalShimmer 4s ease-in-out infinite;
        }
        .festival-btn:active { transform: scale(0.97); }
      `}</style>
      <div className="festival-btn rounded-2xl p-[1.5px]">
        <div className="bg-[#0a0a14]/90 backdrop-blur-xl rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Next Available</span>
          </div>
          <div className="space-y-2.5">
            {nextSlots.map((slot, i) => (
              <button
                key={i}
                onClick={() => onBookNow(slot.doctor)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                data-testid={`quick-book-${slot.doctor.id}`}
              >
                <img src={slot.doctor.image} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10" loading="lazy" decoding="async" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white font-bold text-sm truncate">{slot.doctor.name}</p>
                  <p className="text-white/40 text-xs">{slot.clinic?.name} &middot; {slot.time}</p>
                </div>
                <div className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  Book
                </div>
              </button>
            ))}
            {nextSlots.length === 0 && (
              <p className="text-white/40 text-sm text-center py-2">No appointments available right now</p>
            )}
          </div>
          {showWalkIn && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <p className="text-amber-400/80 text-xs font-medium">Walk-in appointments available at the clinic</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NextAvailableButton;
