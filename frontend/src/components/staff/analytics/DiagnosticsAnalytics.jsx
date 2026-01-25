import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { 
  FlaskConical, FileCheck, Clock, TrendingUp, Gift,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3, TestTube
} from 'lucide-react';
import { API, getAuthHeaders } from '@/pages/staff/staffUtils';

// TrendIndicator component
const TrendIndicator = ({ value, suffix = '%', inverted = false }) => {
  const isPositive = inverted ? value < 0 : value > 0;
  if (value > 0) return (
    <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <ArrowUpRight className="w-4 h-4" />+{value}{suffix}
    </span>
  );
  if (value < 0) return (
    <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <ArrowDownRight className="w-4 h-4" />{value}{suffix}
    </span>
  );
  return <span className="flex items-center text-gray-500 text-sm"><Minus className="w-4 h-4" />0{suffix}</span>;
};

const DiagnosticsAnalytics = ({ staffInfo }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/staff/analytics/diagnostics`, {
        params: { time_range: timeRange },
        headers: getAuthHeaders()
      });
      setAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching diagnostics analytics:', error);
      // Demo data
      setAnalytics({
        total_tests: 156, test_change: 18.3,
        samples_collected: 142, reports_generated: 128,
        completion_rate: 82.1, avg_turnaround: 24, turnaround_change: -4,
        revenue: 245000, revenue_change: 25.6, loyalty_points_given: 6200,
        status_breakdown: { 'Test Booked': 14, 'Sample Collected': 14, 'In Process': 12, 'Reports Generated': 116 },
        test_categories: [
          { name: 'Blood Tests', count: 78, color: 'bg-red-500' },
          { name: 'Diabetes', count: 32, color: 'bg-blue-500' },
          { name: 'Hormonal', count: 24, color: 'bg-pink-500' },
          { name: 'Imaging', count: 15, color: 'bg-purple-500' },
          { name: 'Other', count: 7, color: 'bg-gray-500' }
        ],
        popular_tests: [
          { name: 'CBC', count: 45 }, { name: 'HbA1c', count: 32 },
          { name: 'Thyroid Profile', count: 28 }, { name: 'Lipid Profile', count: 25 }, { name: 'Vitamin D', count: 22 }
        ]
      });
    }
    setLoading(false);
  }, [timeRange]);

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

  const totalCategoryCount = analytics?.test_categories?.reduce((sum, cat) => sum + cat.count, 0) || 1;

  return (
    <div className="space-y-6" data-testid="diagnostics-analytics">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Diagnostics Performance
        </h3>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map(range => (
            <Button key={range} size="sm" variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)} className={timeRange === range ? 'bg-purple-500' : ''}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-purple-700">Total Tests</p>
              <p className="text-2xl font-bold text-purple-900">{analytics?.total_tests}</p></div>
            <FlaskConical className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
          <TrendIndicator value={analytics?.test_change} />
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-green-700">Reports Done</p>
              <p className="text-2xl font-bold text-green-900">{analytics?.reports_generated}</p></div>
            <FileCheck className="w-8 h-8 text-green-500 opacity-50" />
          </div>
          <p className="text-sm text-green-600">{analytics?.completion_rate}% completion</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-blue-700">Avg Turnaround</p>
              <p className="text-2xl font-bold text-blue-900">{analytics?.avg_turnaround}h</p></div>
            <Clock className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
          <TrendIndicator value={analytics?.turnaround_change} suffix="h" inverted />
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-amber-700">Loyalty Points</p>
              <p className="text-2xl font-bold text-amber-900">{analytics?.loyalty_points_given?.toLocaleString()}</p></div>
            <Gift className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
          <p className="text-sm text-amber-600">Given this {timeRange}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-4 text-gray-700">Test Pipeline</h4>
          <div className="space-y-3">
            {Object.entries(analytics?.status_breakdown || {}).map(([status, count]) => {
              const colors = { 'Test Booked': 'bg-blue-500', 'Sample Collected': 'bg-yellow-500', 'In Process': 'bg-purple-500', 'Reports Generated': 'bg-green-500' };
              const width = (count / analytics?.total_tests) * 100;
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">{status}</span><span className="font-medium">{count}</span></div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status]} rounded-full`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-4 text-gray-700">Test Categories</h4>
          <div className="space-y-2">
            {analytics?.test_categories?.map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-gray-600">{cat.name}</span><span className="font-medium">{cat.count}</span></div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${(cat.count / totalCategoryCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-4 text-gray-700">Most Ordered Tests</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {analytics?.popular_tests?.map((test, i) => (
            <div key={i} className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg text-center border border-purple-100">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TestTube className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-xs text-gray-600 truncate" title={test.name}>{test.name}</p>
              <p className="text-lg font-bold text-purple-600">{test.count}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div><p className="text-sm text-green-700">Revenue This {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}</p>
              <p className="text-2xl font-bold text-green-900">₹{analytics?.revenue?.toLocaleString()}</p></div>
          </div>
          <TrendIndicator value={analytics?.revenue_change} />
        </div>
      </Card>
    </div>
  );
};

export default DiagnosticsAnalytics;
