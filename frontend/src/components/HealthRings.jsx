import React from 'react';

const CircularRing = ({ value, max, label, sublabel, color, bgColor, size = 100, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center" data-testid={`ring-${label?.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor || '#f3f4f6'} strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black" style={{ color }}>{typeof value === 'number' ? value : value}</span>
          {sublabel && <span className="text-[9px] text-gray-400 font-medium">{sublabel}</span>}
        </div>
      </div>
      {label && <p className="text-[10px] font-semibold text-gray-600 mt-1.5 text-center">{label}</p>}
    </div>
  );
};

// HbA1c Progress Ring for Glydex
export const HbA1cRing = ({ currentHbA1c = 7.2, target = 7.0 }) => {
  const isGood = currentHbA1c <= target;
  const color = isGood ? '#10b981' : currentHbA1c <= 8 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid="hba1c-ring-card">
      <h3 className="text-sm font-bold text-gray-700 mb-3">HbA1c Target Tracker</h3>
      <div className="flex items-center gap-5">
        <CircularRing value={currentHbA1c.toFixed(1)} max={12} label="Current HbA1c" sublabel="%" color={color} bgColor={`${color}20`} size={90} strokeWidth={10} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-xs text-gray-600">{isGood ? 'On Target' : 'Above Target'}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-400">Target</p>
            <p className="text-sm font-bold text-gray-800">&lt; {target}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-400">Next Test</p>
            <p className="text-sm font-bold text-gray-800">In 3 months</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Medication Adherence for Glydex
export const MedicationAdherence = ({ weekData = [true, true, false, true, true, null, null] }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const taken = weekData.filter(d => d === true).length;
  const total = weekData.filter(d => d !== null).length;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid="med-adherence-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">Weekly Med Adherence</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
          background: taken === total ? '#d1fae5' : '#fef3c7',
          color: taken === total ? '#059669' : '#d97706'
        }}>{total > 0 ? Math.round((taken / total) * 100) : 0}%</span>
      </div>
      <div className="flex gap-1.5">
        {days.map((day, i) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
              weekData[i] === true ? 'bg-emerald-500 text-white shadow-sm' :
              weekData[i] === false ? 'bg-red-100 text-red-400 border border-red-200' :
              'bg-gray-100 text-gray-300'
            }`}>
              {weekData[i] === true ? '\u2713' : weekData[i] === false ? '\u2717' : '\u2022'}
            </div>
            <span className="text-[9px] text-gray-400">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Fertility Window for Evara
export const FertilityWindow = ({ cycleDay = 14, cycleLength = 28, lastPeriod = null }) => {
  const ovulationDay = Math.round(cycleLength / 2);
  const fertileStart = ovulationDay - 5;
  const fertileEnd = ovulationDay + 1;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid="fertility-window-card">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Fertility Window</h3>
      <div className="flex items-center gap-4">
        <CircularRing value={`Day ${cycleDay}`} max={cycleLength} label="Cycle Day" color="#ec4899" bgColor="#fce7f3" size={80} strokeWidth={8} />
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            <span className="text-xs text-gray-600">Fertile: Day {fertileStart}-{fertileEnd}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-600">Ovulation: Day ~{ovulationDay}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-xs text-gray-600">Next period: ~Day {cycleLength}</span>
          </div>
        </div>
      </div>
      {/* Mini cycle bar */}
      <div className="flex gap-0.5 mt-3 rounded-full overflow-hidden">
        {Array.from({ length: cycleLength }, (_, i) => {
          const day = i + 1;
          const isFertile = day >= fertileStart && day <= fertileEnd;
          const isOvulation = day === ovulationDay;
          const isCurrent = day === cycleDay;
          const isPeriod = day <= 5;
          return (
            <div key={day} className="flex-1 h-2 transition-all" style={{
              background: isCurrent ? '#1f2937' : isOvulation ? '#a855f7' : isFertile ? '#ec4899' : isPeriod ? '#f87171' : '#e5e7eb',
              borderRadius: day === 1 ? '9999px 0 0 9999px' : day === cycleLength ? '0 9999px 9999px 0' : '0'
            }} />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-gray-400">
        <span>Period</span>
        <span>Fertile</span>
        <span>Luteal</span>
      </div>
    </div>
  );
};

// Water Intake Ring for Reneu
export const WaterIntakeRing = ({ glasses = 5, target = 8 }) => {
  const color = glasses >= target ? '#0ea5e9' : glasses >= target / 2 ? '#38bdf8' : '#93c5fd';

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid="water-intake-card">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Daily Water Intake</h3>
      <div className="flex items-center gap-4">
        <CircularRing value={glasses} max={target} label={`of ${target} glasses`} sublabel="glasses" color={color} bgColor="#e0f2fe" size={90} strokeWidth={10} />
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: target }, (_, i) => (
              <div key={i} className={`h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                i < glasses ? 'bg-sky-500 text-white shadow-sm' : 'bg-sky-50 text-sky-200 border border-sky-100'
              }`}>
                {i < glasses ? '\u2713' : (i + 1)}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">{glasses >= target ? 'Goal reached! Great job!' : `${target - glasses} more to go`}</p>
        </div>
      </div>
    </div>
  );
};

// Growth Percentile for Alyne
export const GrowthPercentile = ({ childAge = '2y', height = 87, weight = 12.5, gender = 'boy' }) => {
  // Simplified WHO percentile approximation
  const heightPercentile = Math.min(95, Math.max(5, Math.round(((height - 75) / 30) * 100)));
  const weightPercentile = Math.min(95, Math.max(5, Math.round(((weight - 8) / 12) * 100)));

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid="growth-chart-card">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Growth Percentile (WHO)</h3>
      <div className="flex gap-4">
        <CircularRing value={`${heightPercentile}th`} max={100} label="Height" sublabel="percentile" color="#8b5cf6" bgColor="#ede9fe" size={75} strokeWidth={7} />
        <CircularRing value={`${weightPercentile}th`} max={100} label="Weight" sublabel="percentile" color="#f59e0b" bgColor="#fef3c7" size={75} strokeWidth={7} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400">Age</p>
          <p className="text-sm font-bold text-gray-800">{childAge}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400">Height</p>
          <p className="text-sm font-bold text-gray-800">{height} cm</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400">Weight</p>
          <p className="text-sm font-bold text-gray-800">{weight} kg</p>
        </div>
      </div>
    </div>
  );
};

// Vaccine Schedule for Alyne
export const VaccineSchedule = ({ vaccines = [] }) => {
  const defaultVaccines = vaccines.length > 0 ? vaccines : [
    { name: 'BCG', age: 'Birth', status: 'done' },
    { name: 'OPV-0', age: 'Birth', status: 'done' },
    { name: 'Hep B-1', age: 'Birth', status: 'done' },
    { name: 'DPT-1', age: '6 weeks', status: 'done' },
    { name: 'IPV-1', age: '6 weeks', status: 'done' },
    { name: 'Rotavirus-1', age: '6 weeks', status: 'done' },
    { name: 'PCV-1', age: '6 weeks', status: 'done' },
    { name: 'DPT-2', age: '10 weeks', status: 'upcoming' },
    { name: 'MMR-1', age: '9 months', status: 'pending' },
    { name: 'Varicella', age: '15 months', status: 'pending' },
  ];

  const done = defaultVaccines.filter(v => v.status === 'done').length;
  const total = defaultVaccines.length;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-testid="vaccine-schedule-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">Vaccination Schedule</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{done}/{total} done</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }} />
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {defaultVaccines.map((v, i) => (
          <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
            v.status === 'done' ? 'bg-emerald-50' : v.status === 'upcoming' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
              v.status === 'done' ? 'bg-emerald-500 text-white' :
              v.status === 'upcoming' ? 'bg-amber-400 text-white' :
              'bg-gray-200 text-gray-400'
            }`}>
              {v.status === 'done' ? '\u2713' : v.status === 'upcoming' ? '!' : (i + 1)}
            </div>
            <span className="font-medium text-gray-700 flex-1">{v.name}</span>
            <span className="text-gray-400">{v.age}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CircularRing;
