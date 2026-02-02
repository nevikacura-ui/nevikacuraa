import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  TrendingUp, TrendingDown, Minus, Activity, Calendar, 
  ChevronDown, AlertTriangle, CheckCircle, Info, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const ReportTrendsChart = ({ patientId, patientPhone }) => {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
    if (patientId || patientPhone) {
      fetchTrends();
    }
  }, [patientId, patientPhone, timeRange]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const identifier = patientId || patientPhone;
      const res = await fetch(`${API}/api/diagnostics/trends/${identifier}?range=${timeRange}`);
      const data = await res.json();
      
      if (data.success) {
        setTrends(data);
        if (data.parameters?.length > 0 && !selectedParameter) {
          setSelectedParameter(data.parameters[0].name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'normal':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Normal</Badge>;
      case 'borderline':
        return <Badge className="bg-amber-100 text-amber-700"><Info className="w-3 h-3 mr-1" />Borderline</Badge>;
      case 'high':
      case 'low':
        return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />{status === 'high' ? 'High' : 'Low'}</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const renderMiniChart = (values) => {
    if (!values || values.length === 0) return null;
    
    const max = Math.max(...values.map(v => v.value));
    const min = Math.min(...values.map(v => v.value));
    const range = max - min || 1;
    
    return (
      <div className="flex items-end gap-1 h-12">
        {values.slice(-10).map((v, idx) => {
          const height = ((v.value - min) / range) * 100;
          const isLast = idx === values.length - 1;
          return (
            <div
              key={idx}
              className={`w-2 rounded-t transition-all ${
                isLast ? 'bg-teal-500' : 'bg-slate-300'
              }`}
              style={{ height: `${Math.max(height, 10)}%` }}
              title={`${v.value} - ${v.date}`}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-slate-100 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!trends || !trends.parameters || trends.parameters.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 mb-2">No Report Data Yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Your health trends will appear here once you have lab reports
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/mango'}
            className="rounded-xl"
          >
            Book Your First Test
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedData = trends.parameters.find(p => p.name === selectedParameter);

  return (
    <Card className="overflow-hidden" data-testid="report-trends-chart">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-teal-600" />
            Health Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
              data-testid="time-range-selector"
            >
              <option value="3months">3 Months</option>
              <option value="6months">6 Months</option>
              <option value="1year">1 Year</option>
              <option value="all">All Time</option>
            </select>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchTrends}
              className="rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Parameter Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {trends.parameters.map((param) => (
            <button
              key={param.name}
              onClick={() => setSelectedParameter(param.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedParameter === param.name
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              data-testid={`param-btn-${param.name}`}
            >
              {param.name}
              {param.status !== 'normal' && (
                <span className={`ml-1 w-2 h-2 rounded-full inline-block ${
                  param.status === 'high' || param.status === 'low' ? 'bg-red-400' : 'bg-amber-400'
                }`}></span>
              )}
            </button>
          ))}
        </div>

        {/* Selected Parameter Details */}
        {selectedData && (
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 text-lg">{selectedData.name}</h4>
                <p className="text-sm text-slate-500">
                  Last tested: {selectedData.lastDate || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-2xl font-bold text-slate-800">
                    {selectedData.currentValue}
                  </span>
                  <span className="text-sm text-slate-500">{selectedData.unit}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendIcon(selectedData.trend)}
                  {getStatusBadge(selectedData.status)}
                </div>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="bg-white rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">Trend (Last 10 readings)</span>
                <span className="text-xs text-slate-500">
                  Normal: {selectedData.normalRange?.min || '?'} - {selectedData.normalRange?.max || '?'} {selectedData.unit}
                </span>
              </div>
              {renderMiniChart(selectedData.values)}
            </div>

            {/* Insights */}
            {selectedData.insight && (
              <div className={`rounded-xl p-3 ${
                selectedData.status === 'normal' 
                  ? 'bg-green-50 border border-green-200' 
                  : selectedData.status === 'borderline'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  selectedData.status === 'normal' 
                    ? 'text-green-700' 
                    : selectedData.status === 'borderline'
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}>
                  💡 {selectedData.insight}
                </p>
              </div>
            )}

            {/* History Table */}
            {selectedData.values && selectedData.values.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-slate-700 mb-2 text-sm">Recent History</h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedData.values.slice(-5).reverse().map((v, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between py-1.5 px-2 bg-white rounded-lg text-sm"
                    >
                      <span className="text-slate-500">{v.date}</span>
                      <span className={`font-medium ${
                        v.status === 'normal' ? 'text-green-600' :
                        v.status === 'borderline' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {v.value} {selectedData.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">
              {trends.parameters.filter(p => p.status === 'normal').length}
            </p>
            <p className="text-xs text-green-600">Normal</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <Info className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-700">
              {trends.parameters.filter(p => p.status === 'borderline').length}
            </p>
            <p className="text-xs text-amber-600">Borderline</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-700">
              {trends.parameters.filter(p => p.status === 'high' || p.status === 'low').length}
            </p>
            <p className="text-xs text-red-600">Needs Attention</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportTrendsChart;
