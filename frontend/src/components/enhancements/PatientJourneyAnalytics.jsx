import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, ArrowRight, ArrowDown, Activity, Target, BarChart3, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const PatientJourneyAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = () => {
    setAnalytics({
      funnel: {
        first_visit: 1250,
        second_visit: 875,
        regular_patient: 620,
        loyal_patient: 340
      },
      conversion_rates: {
        first_to_second: 70,
        second_to_regular: 71,
        regular_to_loyal: 55
      },
      drop_off_reasons: [
        { reason: 'Long wait times', percentage: 35 },
        { reason: 'Found alternative provider', percentage: 25 },
        { reason: 'Cost concerns', percentage: 20 },
        { reason: 'Location inconvenience', percentage: 12 },
        { reason: 'Other', percentage: 8 }
      ],
      patient_segments: [
        { name: 'New Patients', count: 245, growth: 12 },
        { name: 'Returning', count: 580, growth: 8 },
        { name: 'Regular', count: 620, growth: 15 },
        { name: 'Loyal', count: 340, growth: 22 }
      ],
      engagement_metrics: {
        avg_visits_per_month: 1.8,
        avg_time_between_visits: '45 days',
        app_engagement_rate: 68,
        prescription_refill_rate: 72
      }
    });
  };

  const getFunnelWidth = (value, max) => `${(value / max) * 100}%`;

  return (
    <div className="space-y-4" data-testid="patient-journey-analytics">
      {/* Header */}
      <Card className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Patient Journey Analytics</h2>
                <p className="text-violet-100 text-sm">Track patient conversion & retention</p>
              </div>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/20 text-white border-0 rounded-lg px-3 py-1 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {analytics && (
        <>
          {/* Conversion Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" /> Patient Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'First Visit', value: analytics.funnel.first_visit, color: 'bg-blue-500' },
                { label: 'Second Visit', value: analytics.funnel.second_visit, color: 'bg-indigo-500' },
                { label: 'Regular Patient', value: analytics.funnel.regular_patient, color: 'bg-purple-500' },
                { label: 'Loyal Patient', value: analytics.funnel.loyal_patient, color: 'bg-violet-500' }
              ].map((stage, idx) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{stage.label}</span>
                    <span className="text-sm text-gray-500">{stage.value.toLocaleString()}</span>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: getFunnelWidth(stage.value, analytics.funnel.first_visit) }}
                    >
                      {idx > 0 && (
                        <span className="text-xs text-white font-medium">
                          {Object.values(analytics.conversion_rates)[idx - 1]}%
                        </span>
                      )}
                    </div>
                  </div>
                  {idx < 3 && (
                    <div className="flex justify-center my-1">
                      <ArrowDown className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Patient Segments */}
          <div className="grid grid-cols-2 gap-3">
            {analytics.patient_segments.map(segment => (
              <Card key={segment.name}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">{segment.name}</p>
                  <div className="flex items-end justify-between mt-2">
                    <p className="text-2xl font-bold">{segment.count}</p>
                    <Badge className={segment.growth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {segment.growth > 0 ? '+' : ''}{segment.growth}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Drop-off Analysis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4" /> Drop-off Reasons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.drop_off_reasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 truncate">{reason.reason}</div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{ width: `${reason.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-10">{reason.percentage}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" /> Engagement Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{analytics.engagement_metrics.avg_visits_per_month}</p>
                  <p className="text-xs text-gray-500">Avg Visits/Month</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{analytics.engagement_metrics.avg_time_between_visits}</p>
                  <p className="text-xs text-gray-500">Time Between Visits</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{analytics.engagement_metrics.app_engagement_rate}%</p>
                  <p className="text-xs text-gray-500">App Engagement</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{analytics.engagement_metrics.prescription_refill_rate}%</p>
                  <p className="text-xs text-gray-500">Refill Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PatientJourneyAnalytics;
