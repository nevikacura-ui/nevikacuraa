import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Clock, Calendar, Star, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';

const API = process.env.REACT_APP_BACKEND_URL;

// Staff Performance Analytics (#15)
const StaffPerformanceAnalytics = ({ staffId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [staffId, period]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('staffToken');
      const res = await fetch(`${API}/api/staff/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data
  const mockAnalytics = analytics || {
    patientsServed: 156,
    patientsChange: 12,
    avgWaitTime: 18,
    waitTimeChange: -5,
    satisfactionScore: 4.6,
    satisfactionChange: 0.2,
    revenue: 245000,
    revenueChange: 15,
    appointmentsCompleted: 142,
    appointmentsCancelled: 8,
    noShows: 6,
    averageConsultTime: 12,
    peakHours: ['10:00-11:00', '16:00-17:00'],
    topServices: [
      { name: 'General Consultation', count: 68, revenue: 68000 },
      { name: 'Follow-up', count: 45, revenue: 22500 },
      { name: 'Lab Tests', count: 33, revenue: 99000 },
    ],
    dailyBreakdown: [
      { day: 'Mon', patients: 28 },
      { day: 'Tue', patients: 32 },
      { day: 'Wed', patients: 25 },
      { day: 'Thu', patients: 30 },
      { day: 'Fri', patients: 35 },
      { day: 'Sat', patients: 6 },
    ]
  };

  const StatCard = ({ icon: Icon, title, value, change, suffix = '', color = 'teal' }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
          {change !== undefined && (
            <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}{suffix === '₹' ? '%' : suffix || '%'}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold mt-2">{suffix === '₹' ? '₹' : ''}{value.toLocaleString()}{suffix !== '₹' ? suffix : ''}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="staff-analytics">
      {/* Period Selector */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        {['day', 'week', 'month'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === p ? 'bg-white shadow text-teal-600' : 'text-gray-600'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} title="Patients Served" value={mockAnalytics.patientsServed} change={mockAnalytics.patientsChange} />
        <StatCard icon={Clock} title="Avg Wait Time" value={mockAnalytics.avgWaitTime} change={mockAnalytics.waitTimeChange} suffix=" min" color="blue" />
        <StatCard icon={Star} title="Satisfaction" value={mockAnalytics.satisfactionScore} change={mockAnalytics.satisfactionChange} suffix="/5" color="yellow" />
        <StatCard icon={DollarSign} title="Revenue" value={mockAnalytics.revenue} change={mockAnalytics.revenueChange} suffix="₹" color="green" />
      </div>

      {/* Appointment Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Appointment Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Completed</span>
            <div className="flex items-center gap-2">
              <Progress value={90} className="w-32 h-2" />
              <span className="font-semibold text-green-600">{mockAnalytics.appointmentsCompleted}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Cancelled</span>
            <div className="flex items-center gap-2">
              <Progress value={5} className="w-32 h-2 bg-gray-200" />
              <span className="font-semibold text-red-600">{mockAnalytics.appointmentsCancelled}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">No-shows</span>
            <div className="flex items-center gap-2">
              <Progress value={4} className="w-32 h-2 bg-gray-200" />
              <span className="font-semibold text-amber-600">{mockAnalytics.noShows}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Top Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {mockAnalytics.topServices.map((service, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-gray-500">{service.count} appointments</p>
              </div>
              <p className="font-semibold text-teal-600">₹{service.revenue.toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily Breakdown Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-2">
            {mockAnalytics.dailyBreakdown.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-teal-500 rounded-t"
                  style={{ height: `${(day.patients / 40) * 100}%` }}
                ></div>
                <p className="text-xs text-gray-500 mt-1">{day.day}</p>
                <p className="text-xs font-medium">{day.patients}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-orange-600" />
            <div>
              <p className="font-semibold">Peak Hours</p>
              <p className="text-sm text-gray-600">{mockAnalytics.peakHours.join(' & ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPerformanceAnalytics;
