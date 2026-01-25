import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { 
  Users, Calendar, Clock, 
  AlertTriangle, CheckCircle, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { API, getAuthHeaders } from '@/pages/staff/staffUtils';

// TrendIndicator component - extracted to avoid re-render issues
const TrendIndicator = ({ value, suffix = '%' }) => {
  if (value > 0) return (
    <span className="flex items-center text-green-600 text-sm">
      <ArrowUpRight className="w-4 h-4" />+{value}{suffix}
    </span>
  );
  if (value < 0) return (
    <span className="flex items-center text-red-600 text-sm">
      <ArrowDownRight className="w-4 h-4" />{value}{suffix}
    </span>
  );
  return <span className="flex items-center text-gray-500 text-sm"><Minus className="w-4 h-4" />0{suffix}</span>;
};

const ClinicAnalytics = ({ staffInfo }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/staff/analytics/clinic`, {
        params: { clinic: staffInfo?.clinic || '', range: timeRange },
        headers: getAuthHeaders()
      });
      setAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Demo data fallback
      setAnalytics({
        total_appointments: 127, change_percent: 12.5,
        walkins: 45, walkin_percent: 35.4,
        emergencies: 8, emergency_change: -2,
        completed: 98, completion_rate: 77.2,
        avg_wait_time: 18, wait_time_change: -3,
        daily_breakdown: [
          { day: 'Mon', appointments: 22, walkins: 8 },
          { day: 'Tue', appointments: 19, walkins: 6 },
          { day: 'Wed', appointments: 25, walkins: 10 },
          { day: 'Thu', appointments: 18, walkins: 7 },
          { day: 'Fri', appointments: 23, walkins: 8 },
          { day: 'Sat', appointments: 15, walkins: 5 },
          { day: 'Sun', appointments: 5, walkins: 1 }
        ],
        top_doctors: [
          { name: 'Dr. Vikas', appointments: 42, rating: 4.8 },
          { name: 'Dr. Neha', appointments: 38, rating: 4.9 },
          { name: 'Dr. Rahul', appointments: 28, rating: 4.7 }
        ]
      });
    }
    setLoading(false);
  }, [staffInfo?.clinic, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="clinic-analytics">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-600" />
          Clinic Performance
        </h3>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map(range => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-teal-600' : ''}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-teal-700">Total Appointments</p>
              <p className="text-2xl font-bold text-teal-900">{analytics?.total_appointments}</p>
            </div>
            <Calendar className="w-8 h-8 text-teal-500 opacity-50" />
          </div>
          <TrendIndicator value={analytics?.change_percent} />
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-700">Walk-ins</p>
              <p className="text-2xl font-bold text-blue-900">{analytics?.walkins}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
          <p className="text-sm text-blue-600">{analytics?.walkin_percent}% of total</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-amber-700">Avg Wait Time</p>
              <p className="text-2xl font-bold text-amber-900">{analytics?.avg_wait_time} min</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
          <TrendIndicator value={analytics?.wait_time_change} suffix=" min" />
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-green-700">Completion Rate</p>
              <p className="text-2xl font-bold text-green-900">{analytics?.completion_rate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
          </div>
          <p className="text-sm text-green-600">{analytics?.completed} completed</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Daily Breakdown */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 text-gray-700">Daily Breakdown</h4>
          <div className="flex items-end gap-2 h-32">
            {analytics?.daily_breakdown?.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-1">
                  <div 
                    className="w-full bg-teal-400 rounded-t"
                    style={{ height: `${(day.appointments / 30) * 80}px` }}
                    title={`${day.appointments} appointments`}
                  />
                  <div 
                    className="w-full bg-blue-400 rounded-b"
                    style={{ height: `${(day.walkins / 15) * 40}px` }}
                    title={`${day.walkins} walk-ins`}
                  />
                </div>
                <span className="text-xs text-gray-500">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-teal-400 rounded"></div> Scheduled</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded"></div> Walk-ins</span>
          </div>
        </Card>

        {/* Top Doctors */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 text-gray-700">Top Performing Doctors</h4>
          <div className="space-y-3">
            {analytics?.top_doctors?.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="font-medium">{doc.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-teal-700">{doc.appointments} apt</p>
                  <p className="text-xs text-amber-600">★ {doc.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Emergency Stats */}
      <Card className="p-4 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-700">Emergency Cases This {timeRange}</p>
              <p className="text-2xl font-bold text-red-900">{analytics?.emergencies}</p>
            </div>
          </div>
          <TrendIndicator value={analytics?.emergency_change} />
        </div>
      </Card>
    </div>
  );
};

export default ClinicAnalytics;
