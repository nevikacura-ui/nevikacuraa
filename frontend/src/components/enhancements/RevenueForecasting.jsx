import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Users, BarChart3, ArrowUp, ArrowDown, Target, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const RevenueForecasting = () => {
  const [forecast, setForecast] = useState(null);
  const [view, setView] = useState('weekly');

  useEffect(() => {
    fetchForecast();
  }, [view]);

  const fetchForecast = () => {
    setForecast({
      current_month: {
        actual: 1250000,
        forecast: 1450000,
        target: 1500000,
        achievement: 83
      },
      weekly_forecast: [
        { week: 'Week 1', actual: 320000, forecast: 350000 },
        { week: 'Week 2', actual: 380000, forecast: 370000 },
        { week: 'Week 3', actual: 290000, forecast: 360000 },
        { week: 'Week 4', actual: null, forecast: 370000 }
      ],
      revenue_by_service: [
        { service: 'Consultations', amount: 450000, percentage: 36 },
        { service: 'Lab Tests', amount: 350000, percentage: 28 },
        { service: 'Pharmacy', amount: 280000, percentage: 22 },
        { service: 'Procedures', amount: 170000, percentage: 14 }
      ],
      trends: {
        yoy_growth: 18,
        mom_growth: 5,
        avg_transaction: 850,
        peak_days: ['Monday', 'Saturday']
      },
      seasonal_insights: [
        { insight: 'Flu season approaching - expect 20% increase in OPD visits', type: 'positive' },
        { insight: 'Festival season may reduce appointments by 15%', type: 'warning' }
      ]
    });
  };

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const getBarHeight = (value, max) => `${(value / max) * 100}%`;

  return (
    <div className="space-y-4" data-testid="revenue-forecasting">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Revenue Forecasting</h2>
                <p className="text-green-100 text-sm">Predictive financial insights</p>
              </div>
            </div>
            <div className="flex gap-2">
              {['weekly', 'monthly'].map(v => (
                <Button
                  key={v}
                  size="sm"
                  variant={view === v ? "secondary" : "ghost"}
                  onClick={() => setView(v)}
                  className={view === v ? "bg-white/20" : "text-white hover:bg-white/10"}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {forecast && (
        <>
          {/* Current Month Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">This Month</h3>
                <Badge className={forecast.current_month.achievement >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {forecast.current_month.achievement}% of target
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Actual</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(forecast.current_month.actual)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Forecast</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(forecast.current_month.forecast)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Target</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(forecast.current_month.target)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Weekly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between h-40 gap-4">
                {forecast.weekly_forecast.map((week, idx) => {
                  const maxValue = Math.max(...forecast.weekly_forecast.map(w => w.forecast));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex gap-1 items-end h-32">
                        {week.actual && (
                          <div
                            className="flex-1 bg-green-500 rounded-t"
                            style={{ height: getBarHeight(week.actual, maxValue) }}
                          />
                        )}
                        <div
                          className={`flex-1 ${week.actual ? 'bg-blue-200' : 'bg-blue-400'} rounded-t`}
                          style={{ height: getBarHeight(week.forecast, maxValue) }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{week.week}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-xs text-gray-500">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded" />
                  <span className="text-xs text-gray-500">Forecast</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Service */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue by Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {forecast.revenue_by_service.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{item.service}</span>
                    <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Trends */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`flex items-center justify-center gap-1 ${forecast.trends.yoy_growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {forecast.trends.yoy_growth > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  <span className="text-2xl font-bold">{forecast.trends.yoy_growth}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Year over Year</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`flex items-center justify-center gap-1 ${forecast.trends.mom_growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {forecast.trends.mom_growth > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  <span className="text-2xl font-bold">{forecast.trends.mom_growth}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Month over Month</p>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Seasonal Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {forecast.seasonal_insights.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    item.type === 'positive' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                  }`}
                >
                  <p className={`text-sm ${item.type === 'positive' ? 'text-green-700' : 'text-amber-700'}`}>
                    {item.insight}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RevenueForecasting;
