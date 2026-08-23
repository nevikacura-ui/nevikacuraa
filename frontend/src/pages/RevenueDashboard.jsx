import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag,
  FlaskConical, Stethoscope, Calendar, BarChart3, Minus, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

const StatCard = ({ label, value, icon: Icon, color, bgColor, growth, prefix = '₹' }) => (
  <div className="rounded-2xl p-4 border" style={{ background: bgColor, borderColor: `${color}30` }} data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {growth !== undefined && (
        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
          growth > 0 ? 'bg-green-500/20 text-green-400' : growth < 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
        }`}>
          {growth > 0 ? <TrendingUp className="w-3 h-3" /> : growth < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(growth)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-white">{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
    <p className="text-xs text-gray-400 mt-1">{label}</p>
  </div>
);

const MiniBar = ({ items, maxVal }) => (
  <div className="space-y-2">
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-24 truncate">{item.label}</span>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`, background: item.color || '#22c55e' }} />
        </div>
        <span className="text-xs font-bold text-white w-16 text-right">₹{item.value.toLocaleString('en-IN')}</span>
      </div>
    ))}
  </div>
);

const RevenueDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topServices, setTopServices] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, trendRes, topRes] = await Promise.all([
        axios.get(`${API}/api/revenue/summary?days=${period}`, getAuth()),
        axios.get(`${API}/api/revenue/daily-trend?days=${period}`, getAuth()),
        axios.get(`${API}/api/revenue/top-services?days=${period}`, getAuth())
      ]);
      setSummary(summaryRes.data);
      setTrend(trendRes.data.trend || []);
      setTopServices(topRes.data);
    } catch (err) {
      toast.error('Failed to load revenue data');
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const maxTrendVal = Math.max(...trend.map(d => d.total), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  const s = summary || {};
  const today = s.today || {};
  const current = s.current_period || {};
  const growth = s.growth || {};
  const patients = s.patients || {};

  return (
    <div className="min-h-screen bg-[#050510]" data-testid="revenue-dashboard">
      {/* Header */}
      <div className="bg-[#1A1A1A] sticky top-0 z-50 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Revenue Dashboard</h1>
              <p className="text-xs text-gray-500">Financial overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === d ? 'bg-teal-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`} data-testid={`period-${d}`}>
                {d}d
              </button>
            ))}
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-white/10">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Today's Revenue */}
        <div className="bg-gradient-to-br from-teal-500/20 to-emerald-500/10 rounded-2xl p-5 border border-teal-500/30" data-testid="today-revenue">
          <p className="text-xs text-teal-400 font-semibold uppercase tracking-wider mb-2">Today's Revenue</p>
          <p className="text-4xl font-bold text-white">₹{(today.total || 0).toLocaleString('en-IN')}</p>
          <div className="flex gap-4 mt-3">
            <span className="text-xs text-gray-300"><Stethoscope className="w-3 h-3 inline mr-1 text-teal-400" />₹{(today.consultations || 0).toLocaleString()}</span>
            <span className="text-xs text-gray-300"><ShoppingBag className="w-3 h-3 inline mr-1 text-orange-400" />₹{(today.pharmacy || 0).toLocaleString()}</span>
            <span className="text-xs text-gray-300"><FlaskConical className="w-3 h-3 inline mr-1 text-amber-400" />₹{(today.diagnostics || 0).toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{today.patients || 0} patients &middot; {today.completed || 0} completed</p>
        </div>

        {/* Period Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Revenue" value={current.total || 0} icon={DollarSign} color="#14b8a6" bgColor="#14b8a620" growth={growth.total} />
          <StatCard label="Avg Daily" value={current.avg_daily || 0} icon={BarChart3} color="#8b5cf6" bgColor="#8b5cf620" />
          <StatCard label="Consultations" value={current.consultations || 0} icon={Stethoscope} color="#06b6d4" bgColor="#06b6d420" growth={growth.consultations} />
          <StatCard label="Pharmacy" value={current.pharmacy || 0} icon={ShoppingBag} color="#f97316" bgColor="#f9731620" growth={growth.pharmacy} />
          <StatCard label="Diagnostics" value={current.diagnostics || 0} icon={FlaskConical} color="#eab308" bgColor="#eab30820" growth={growth.diagnostics} />
          <StatCard label="Total Patients" value={patients.total_visits || 0} icon={Users} color="#ec4899" bgColor="#ec489920" prefix="" />
        </div>

        {/* Revenue Trend Chart (ASCII-style bars) */}
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/10" data-testid="revenue-trend">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-white">Revenue Trend</p>
              <p className="text-xs text-gray-500">Daily revenue over {period} days</p>
            </div>
          </div>
          <div className="flex items-end gap-1 h-32">
            {trend.slice(-Math.min(trend.length, 30)).map((d, i) => {
              const height = maxTrendVal > 0 ? (d.total / maxTrendVal) * 100 : 0;
              const isToday = d.date === new Date().toISOString().split('T')[0];
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" data-testid={`trend-bar-${d.date}`}>
                  <div className="absolute -top-8 bg-[#2A2A3A] text-white text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {d.date.slice(5)}: ₹{d.total.toLocaleString('en-IN')}
                  </div>
                  <div 
                    className="w-full rounded-t-sm transition-all"
                    style={{ 
                      height: `${Math.max(height, 2)}%`,
                      background: isToday ? '#14b8a6' : d.total > 0 ? '#14b8a650' : '#ffffff10',
                      minHeight: '2px'
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-gray-500">{trend[0]?.date?.slice(5) || ''}</span>
            <span className="text-[10px] text-gray-500">{trend[trend.length - 1]?.date?.slice(5) || ''}</span>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/10" data-testid="department-breakdown">
          <p className="font-semibold text-white mb-4">Department Breakdown</p>
          <MiniBar 
            items={[
              { label: 'Consultations', value: current.consultations || 0, color: '#06b6d4' },
              { label: 'Pharmacy', value: current.pharmacy || 0, color: '#f97316' },
              { label: 'Diagnostics', value: current.diagnostics || 0, color: '#eab308' }
            ]}
            maxVal={Math.max(current.consultations || 0, current.pharmacy || 0, current.diagnostics || 0, 1)}
          />
        </div>

        {/* Top Services */}
        {topServices && (
          <>
            {/* Top Doctors */}
            {(topServices.top_doctors || []).length > 0 && (
              <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/10" data-testid="top-doctors">
                <p className="font-semibold text-white mb-3">Top Doctors by Revenue</p>
                <div className="space-y-3">
                  {topServices.top_doctors.slice(0, 5).map((doc, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{doc.doctor}</p>
                          <p className="text-xs text-gray-500">{doc.count} patients &middot; {doc.clinic}</p>
                        </div>
                      </div>
                      <span className="font-bold text-teal-400">₹{(doc.revenue || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Products */}
            {(topServices.top_products || []).length > 0 && (
              <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/10" data-testid="top-products">
                <p className="font-semibold text-white mb-3">Top Pharmacy Products</p>
                <div className="space-y-3">
                  {topServices.top_products.slice(0, 5).map((prod, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{prod.product}</p>
                          <p className="text-xs text-gray-500">{prod.quantity} units sold</p>
                        </div>
                      </div>
                      <span className="font-bold text-orange-400">₹{(prod.revenue || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Tests */}
            {(topServices.top_tests || []).length > 0 && (
              <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/10 mb-8" data-testid="top-tests">
                <p className="font-semibold text-white mb-3">Top Diagnostic Tests</p>
                <div className="space-y-3">
                  {topServices.top_tests.slice(0, 5).map((test, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{test.test}</p>
                          <p className="text-xs text-gray-500">{test.count} orders</p>
                        </div>
                      </div>
                      <span className="font-bold text-amber-400">₹{(test.revenue || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RevenueDashboard;
