import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  BarChart3, Users, ShoppingCart, TestTube2, Calendar,
  TrendingUp, Clock, Pill, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AnalyticsDashboard = ({ staffToken }) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [overview, setOverview] = useState(null);
  const [popularMeds, setPopularMeds] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [trends, setTrends] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [engagement, setEngagement] = useState(null);

  const token = staffToken || localStorage.getItem('staffToken');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ovRes, medRes, peakRes, trendRes, statusRes, engRes] = await Promise.all([
        fetch(`${API}/api/admin/analytics/overview?days=${period}`, { headers }),
        fetch(`${API}/api/admin/analytics/popular-medicines?limit=10`, { headers }),
        fetch(`${API}/api/admin/analytics/peak-hours?days=${period}`, { headers }),
        fetch(`${API}/api/admin/analytics/order-trends?days=${period}`, { headers }),
        fetch(`${API}/api/admin/analytics/order-status-breakdown`, { headers }),
        fetch(`${API}/api/admin/analytics/engagement?days=${period}`, { headers })
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (medRes.ok) { const d = await medRes.json(); setPopularMeds(d.medicines || []); }
      if (peakRes.ok) { const d = await peakRes.json(); setPeakHours(d.peak_hours || []); }
      if (trendRes.ok) { const d = await trendRes.json(); setTrends(d.trends || []); }
      if (statusRes.ok) { const d = await statusRes.json(); setStatusBreakdown(d.statuses || []); }
      if (engRes.ok) setEngagement(await engRes.json());
    } catch (e) {
      toast.error('Failed to load analytics');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [period]);

  const maxPeakTotal = useMemo(() => {
    return Math.max(...peakHours.map(h => h.appointments + h.pharmacy_orders + h.lab_bookings), 1);
  }, [peakHours]);

  const maxTrendVal = useMemo(() => {
    return Math.max(...trends.map(t => t.appointments + t.pharmacy_orders + t.lab_bookings), 1);
  }, [trends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="analytics-loading">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        <span className="ml-3 text-slate-500">Loading analytics...</span>
      </div>
    );
  }

  const statusColors = {
    order_placed: '#3b82f6', booked: '#3b82f6', prescription_validated: '#8b5cf6',
    pharmacist_call: '#8b5cf6', in_process: '#f59e0b', packing: '#f59e0b',
    shipped: '#06b6d4', out_for_delivery: '#06b6d4', delivered: '#22c55e',
    completed: '#22c55e', cancelled: '#ef4444'
  };

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-500" />
          <h2 className="text-lg font-semibold text-slate-800">Platform Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map(d => (
            <Button key={d} variant={period === d ? 'default' : 'outline'} size="sm"
              onClick={() => setPeriod(d)} data-testid={`period-${d}`}
              className={period === d ? 'bg-teal-500 hover:bg-teal-600' : ''}>
              {d}d
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchAll} data-testid="refresh-analytics">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="overview-cards">
          <MetricCard icon={Calendar} label="Appointments" value={overview.total_appointments} color="text-blue-500" bg="bg-blue-50" />
          <MetricCard icon={ShoppingCart} label="Pharmacy Orders" value={overview.total_pharmacy_orders} color="text-orange-500" bg="bg-orange-50" />
          <MetricCard icon={TestTube2} label="Lab Bookings" value={overview.total_lab_bookings} color="text-green-500" bg="bg-green-50" />
          <MetricCard icon={Users} label="New Users" value={overview.new_users} subtext={`of ${overview.total_users} total`} color="text-purple-500" bg="bg-purple-50" />
        </div>
      )}

      {/* Revenue Card */}
      {overview && (
        <Card className="p-5 border-0 shadow-sm bg-gradient-to-r from-teal-50 to-cyan-50" data-testid="revenue-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Pharmacy Revenue ({period} days)</p>
              <p className="text-3xl font-bold text-teal-700">
                {'\u20B9'}{overview.pharmacy_revenue?.toLocaleString('en-IN') || '0'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </Card>
      )}

      {/* Two Column: Popular Meds + Status Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular Medicines */}
        <Card className="p-5 border-0 shadow-sm" data-testid="popular-medicines">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-slate-700">Top Ordered Medicines</h3>
          </div>
          {popularMeds.length > 0 ? (
            <div className="space-y-3">
              {popularMeds.map((med, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 truncate">{med.name || 'Unknown'}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 ml-2">{med.order_count} orders</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No order data yet</p>
          )}
        </Card>

        {/* Order Status Breakdown */}
        <Card className="p-5 border-0 shadow-sm" data-testid="status-breakdown">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-slate-700">Order Status Distribution</h3>
          </div>
          {statusBreakdown.length > 0 ? (
            <div className="space-y-3">
              {statusBreakdown.map((s, i) => {
                const total = statusBreakdown.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 capitalize">{(s.status || '').replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium text-slate-700">{s.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: statusColors[s.status] || '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No orders yet</p>
          )}
        </Card>
      </div>

      {/* Peak Hours Chart */}
      <Card className="p-5 border-0 shadow-sm" data-testid="peak-hours">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-slate-700">Peak Activity Hours</h3>
        </div>
        <div className="flex items-end gap-1 h-40">
          {peakHours.filter(h => h.hour >= 6 && h.hour <= 23).map((h) => {
            const total = h.appointments + h.pharmacy_orders + h.lab_bookings;
            const height = maxPeakTotal > 0 ? (total / maxPeakTotal) * 100 : 0;
            return (
              <div key={h.hour} className="flex flex-col items-center flex-1 min-w-0 group relative">
                <div className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {total} activities
                </div>
                <div className="w-full rounded-t" style={{
                  height: `${Math.max(height, 2)}%`,
                  background: total > 0 ? `linear-gradient(to top, #14b8a6, #06b6d4)` : '#e2e8f0',
                  minHeight: '2px'
                }} />
                <span className="text-[10px] text-slate-400 mt-1">{h.hour}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Appointments</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Pharmacy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Lab Tests</span>
        </div>
      </Card>

      {/* Daily Trends Chart */}
      <Card className="p-5 border-0 shadow-sm" data-testid="order-trends">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-teal-500" />
          <h3 className="font-semibold text-slate-700">Daily Activity Trends ({period} days)</h3>
        </div>
        <div className="flex items-end gap-px h-32 overflow-x-auto">
          {trends.map((t, i) => {
            const total = t.appointments + t.pharmacy_orders + t.lab_bookings;
            const height = maxTrendVal > 0 ? (total / maxTrendVal) * 100 : 0;
            const isToday = t.date === new Date().toISOString().slice(0, 10);
            return (
              <div key={i} className="flex flex-col items-center flex-1 min-w-[4px] group relative">
                <div className="absolute -top-10 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {t.date}: {total}
                </div>
                <div className="w-full rounded-t transition-all" style={{
                  height: `${Math.max(height, 2)}%`,
                  backgroundColor: isToday ? '#14b8a6' : total > 0 ? '#94a3b8' : '#e2e8f0',
                  minHeight: '2px'
                }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>{trends[0]?.date?.slice(5)}</span>
          <span>{trends[trends.length - 1]?.date?.slice(5)}</span>
        </div>
      </Card>

      {/* Engagement Card */}
      {engagement && (
        <Card className="p-5 border-0 shadow-sm" data-testid="engagement-metrics">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-700">User Engagement ({period} days)</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MiniMetric label="Active Users" value={engagement.active_users} />
            <MiniMetric label="Pharmacy Users" value={engagement.pharmacy_users} />
            <MiniMetric label="Appointment Users" value={engagement.appointment_users} />
            <MiniMetric label="Lab Users" value={engagement.lab_users} />
            <MiniMetric label="Cross-Service" value={engagement.cross_service_users} highlight />
          </div>
        </Card>
      )}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, subtext, color, bg }) => (
  <Card className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value?.toLocaleString() || 0}</p>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </Card>
);

const MiniMetric = ({ label, value, highlight }) => (
  <div className={`text-center p-3 rounded-lg ${highlight ? 'bg-indigo-50' : 'bg-slate-50'}`}>
    <p className={`text-xl font-bold ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>{value || 0}</p>
    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
  </div>
);

export default AnalyticsDashboard;
