import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

/* ==================== EVARA: Period Cycle Trend ==================== */
export const CycleTrendChart = ({ history = [] }) => {
  if (history.length < 2) return null;

  const data = [];
  for (let i = history.length - 1; i > 0; i--) {
    const d1 = new Date(history[i].start_date);
    const d2 = new Date(history[i - 1].start_date);
    const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (days > 0 && days < 60) {
      data.push({
        date: history[i - 1].start_date.slice(5),
        days,
        flow: history[i - 1].flow,
      });
    }
  }

  if (data.length < 1) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" data-testid="cycle-trend-chart">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Cycle Length Trend</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#999" />
          <YAxis tick={{ fontSize: 10 }} stroke="#999" domain={[20, 40]} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(v) => [`${v} days`, 'Cycle']} />
          <ReferenceLine y={28} stroke="#f472b6" strokeDasharray="5 5" label={{ value: '28d avg', fontSize: 9, fill: '#f472b6' }} />
          <Line type="monotone" dataKey="days" stroke="#ec4899" strokeWidth={2.5} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ==================== EVARA: Symptom Frequency ==================== */
export const SymptomFrequency = ({ history = [] }) => {
  const freq = {};
  history.forEach(h => (h.symptoms || []).forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sorted.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" data-testid="symptom-frequency">
      <h3 className="text-sm font-bold text-gray-700 mb-2">Most Common Symptoms</h3>
      <div className="flex flex-wrap gap-2">
        {sorted.map(([name, count]) => (
          <span key={name} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold border border-rose-100">
            {name} <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-0.5">{count}x</span>
          </span>
        ))}
      </div>
    </div>
  );
};

/* ==================== EVARA: Mini Period Calendar ==================== */
export const PeriodCalendar = ({ history = [] }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  const periodDays = new Map();
  history.forEach(h => {
    const start = new Date(h.start_date);
    const end = h.end_date ? new Date(h.end_date) : new Date(start.getTime() + 5 * 86400000);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        periodDays.set(d.getDate(), h.flow || 'medium');
      }
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const flow = periodDays.get(d);
    const isToday = d === today.getDate();
    cells.push(
      <div key={d} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-all
        ${flow === 'heavy' ? 'bg-rose-500 text-white' : flow === 'medium' ? 'bg-rose-300 text-white' : flow === 'light' ? 'bg-rose-100 text-rose-600' : ''}
        ${isToday && !flow ? 'ring-2 ring-rose-400 text-rose-600 font-bold' : !flow ? 'text-gray-600' : ''}
      `}>
        {d}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" data-testid="period-calendar">
      <h3 className="text-sm font-bold text-gray-700 mb-3">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[10px] text-gray-400 font-semibold">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 place-items-center">{cells}</div>
      <div className="flex gap-3 mt-3 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-rose-500" />Heavy</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-rose-300" />Medium</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-rose-100 border" />Light</span>
      </div>
    </div>
  );
};

/* ==================== GLYDEX: Blood Sugar Trend ==================== */
export const SugarTrendChart = ({ logs = [], period = 7 }) => {
  if (logs.length === 0) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);

  const data = logs
    .filter(l => new Date(l.date) >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(l => ({
      date: l.date.slice(5),
      value: parseInt(l.value),
      type: l.type === 'fbs' ? 'Fasting' : l.type === 'ppbs' ? 'Post-Meal' : 'Random',
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" data-testid="sugar-trend-chart">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Blood Sugar Trend ({period}d)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="sugarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#999" />
          <YAxis tick={{ fontSize: 10 }} stroke="#999" domain={[50, 250]} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(v, n, p) => [`${v} mg/dL`, p.payload.type]} />
          <ReferenceArea y1={70} y2={100} fill="#22c55e" fillOpacity={0.08} />
          <ReferenceArea y1={100} y2={125} fill="#f59e0b" fillOpacity={0.08} />
          <ReferenceArea y1={125} y2={250} fill="#ef4444" fillOpacity={0.06} />
          <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" />
          <ReferenceLine y={125} stroke="#f59e0b" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#sugarGrad)" dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-2 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-emerald-400" />Normal</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-amber-400" />Pre-diabetic</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-red-400" />High</span>
      </div>
    </div>
  );
};

/* ==================== GLYDEX: Daily Summary ==================== */
export const DailySummaryBar = ({ logs = [] }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === today);
  if (todayLogs.length === 0) return null;

  const getStatus = (value, type) => {
    const v = parseInt(value);
    if (type === 'fbs') {
      if (v < 70) return { label: 'Low', bg: 'bg-red-100', text: 'text-red-600' };
      if (v <= 100) return { label: 'Normal', bg: 'bg-emerald-100', text: 'text-emerald-600' };
      if (v <= 125) return { label: 'Pre-diabetic', bg: 'bg-amber-100', text: 'text-amber-600' };
      return { label: 'High', bg: 'bg-red-100', text: 'text-red-600' };
    }
    if (v < 70) return { label: 'Low', bg: 'bg-red-100', text: 'text-red-600' };
    if (v <= 140) return { label: 'Normal', bg: 'bg-emerald-100', text: 'text-emerald-600' };
    if (v <= 199) return { label: 'Pre-diabetic', bg: 'bg-amber-100', text: 'text-amber-600' };
    return { label: 'High', bg: 'bg-red-100', text: 'text-red-600' };
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" data-testid="daily-summary">
      <h3 className="text-sm font-bold text-gray-700 mb-2">Today's Readings</h3>
      <div className="flex gap-2 overflow-x-auto">
        {todayLogs.map((log, i) => {
          const s = getStatus(log.value, log.type);
          return (
            <div key={i} className={`flex-shrink-0 px-4 py-2.5 rounded-xl ${s.bg} flex items-center gap-2`}>
              <div>
                <p className={`text-lg font-bold ${s.text}`}>{log.value}</p>
                <p className="text-[10px] text-gray-500">{log.type === 'fbs' ? 'Fasting' : log.type === 'ppbs' ? 'Post-Meal' : 'Random'}</p>
              </div>
              <span className={`text-[10px] font-semibold ${s.text} px-2 py-0.5 rounded-full bg-white/60`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==================== RENEU: Sleep Quality Chart ==================== */
export const SleepQualityChart = ({ logs = [] }) => {
  if (logs.length === 0) return null;

  const qualityMap = { poor: 1, fair: 2, good: 3, excellent: 4 };
  const data = logs.slice(0, 7).reverse().map(l => {
    const [bh, bm] = (l.bedtime || '23:00').split(':').map(Number);
    const [wh, wm] = (l.wakeup_time || '07:00').split(':').map(Number);
    let hours = wh - bh + (wm - bm) / 60;
    if (hours < 0) hours += 24;
    return {
      date: (l.date || '').slice(5),
      hours: parseFloat(hours.toFixed(1)),
      quality: qualityMap[l.quality] || 2,
      screen: l.screen_time_minutes || 0,
    };
  });

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" data-testid="sleep-quality-chart">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Sleep Quality (Last 7 Nights)</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#999" />
          <YAxis tick={{ fontSize: 10 }} stroke="#999" domain={[0, 12]} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(v, name) => [name === 'hours' ? `${v}h` : `${v} min`, name === 'hours' ? 'Sleep' : 'Screen Time']} />
          <Bar dataKey="hours" fill="#818cf8" radius={[6, 6, 0, 0]} />
          <Bar dataKey="screen" fill="#f472b6" radius={[6, 6, 0, 0]} opacity={0.4} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-indigo-400" />Sleep Hours</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-3 h-3 rounded-full bg-pink-300" />Screen Time</span>
      </div>
    </div>
  );
};

/* ==================== RENEU: Workout Streak ==================== */
export const WorkoutStreak = ({ logs = [] }) => {
  if (logs.length === 0) return null;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    if (logs.some(l => l.date === ds)) streak++;
    else if (i > 0) break;
  }

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    last7.push({
      day: d.toLocaleString('default', { weekday: 'short' }).slice(0, 2),
      done: logs.some(l => l.date === ds),
    });
  }

  return (
    <div className="bg-gradient-to-r from-orange-400 to-rose-400 rounded-2xl p-4 text-white shadow-lg" data-testid="workout-streak">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">Workout Streak</h3>
        <span className="text-2xl font-black">{streak}d</span>
      </div>
      <div className="flex justify-between gap-1">
        {last7.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${d.done ? 'bg-white text-orange-500' : 'bg-white/20 text-white/60'}`}>
              {d.done ? '✓' : '·'}
            </div>
            <span className="text-[9px] text-white/70">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
