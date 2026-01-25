import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Heart, Activity, Weight, Footprints, TrendingUp, TrendingDown, 
  Plus, Calendar, AlertCircle, CheckCircle2, Flame, Target,
  Loader2, ChevronRight, Sparkles, LineChart
} from 'lucide-react';
import Achievements from './Achievements';
import FamilyMembers from './FamilyMembers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const METRIC_CONFIG = {
  weight: { label: 'Weight', unit: 'kg', icon: Weight, color: 'from-blue-500 to-indigo-500', range: { min: 30, max: 200 } },
  bp_systolic: { label: 'BP (Systolic)', unit: 'mmHg', icon: Heart, color: 'from-red-500 to-pink-500', range: { min: 80, max: 200 } },
  bp_diastolic: { label: 'BP (Diastolic)', unit: 'mmHg', icon: Heart, color: 'from-red-400 to-rose-400', range: { min: 50, max: 130 } },
  heart_rate: { label: 'Heart Rate', unit: 'bpm', icon: Activity, color: 'from-pink-500 to-rose-500', range: { min: 40, max: 200 } },
  steps: { label: 'Steps', unit: 'steps', icon: Footprints, color: 'from-emerald-500 to-teal-500', range: { min: 0, max: 50000 } },
  bmi: { label: 'BMI', unit: 'kg/m²', icon: Target, color: 'from-purple-500 to-violet-500', range: { min: 10, max: 50 } }
};

const EnhancedHealthDashboard = () => {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [metricValue, setMetricValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user && token) {
      fetchDashboard();
      fetchInsights();
    }
  }, [user, token]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/features/health/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await axios.get(`${API}/features/health/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsights(response.data.insights || []);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }
  };

  const logMetric = async () => {
    if (!metricValue || isNaN(parseFloat(metricValue))) {
      toast.error('Please enter a valid value');
      return;
    }

    const value = parseFloat(metricValue);
    const config = METRIC_CONFIG[selectedMetric];
    
    if (value < config.range.min || value > config.range.max) {
      toast.error(`Value must be between ${config.range.min} and ${config.range.max}`);
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/features/health/metrics`, {
        metric_type: selectedMetric,
        value: value,
        unit: config.unit
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${config.label} logged successfully!`);
      setShowLogDialog(false);
      setMetricValue('');
      fetchDashboard();
    } catch (error) {
      toast.error('Failed to log metric');
    } finally {
      setSaving(false);
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getTrendIcon = (trend) => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend.direction === 'down') return <TrendingDown className="w-4 h-4 text-emerald-500" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Health Dashboard
          </h1>
          <p className="text-sm text-slate-500">Track your health metrics & achievements</p>
        </div>
        <Button
          onClick={() => setShowLogDialog(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl shadow-lg"
          data-testid="log-metric-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Metric
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'achievements', label: 'Achievements' },
          { id: 'family', label: 'Family' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health Score Card */}
          <Card className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-400 text-sm">Your Health Score</p>
                  <p className={`text-5xl font-bold ${getHealthScoreColor(dashboardData?.health_score || 75)}`}>
                    {dashboardData?.health_score || 75}
                  </p>
                </div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                  <Heart className="w-10 h-10 text-white" />
                </div>
              </div>
              
              {/* Streak */}
              <div className="flex items-center gap-2 bg-white/10 rounded-xl p-3">
                <Flame className="w-6 h-6 text-orange-400" />
                <div>
                  <p className="font-semibold">{dashboardData?.logging_streak || 0} Day Streak</p>
                  <p className="text-xs text-slate-400">Keep logging to maintain your streak!</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(dashboardData?.latest_metrics || {}).slice(0, 4).map(([key, metric]) => {
              const config = METRIC_CONFIG[key];
              if (!config) return null;
              const Icon = config.icon;
              const trend = dashboardData?.trends?.[key];
              
              return (
                <Card 
                  key={key} 
                  className="p-4 rounded-xl cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => { setSelectedMetric(key); setShowLogDialog(true); }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {getTrendIcon(trend)}
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {metric.value} <span className="text-sm font-normal text-slate-400">{metric.unit}</span>
                  </p>
                  <p className="text-xs text-slate-500">{config.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{metric.date}</p>
                </Card>
              );
            })}
          </div>

          {/* Add more metrics button */}
          {Object.keys(dashboardData?.latest_metrics || {}).length < 4 && (
            <Card 
              className="p-6 rounded-xl border-dashed border-2 border-slate-200 text-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setShowLogDialog(true)}
            >
              <Plus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">Log your first health metric</p>
            </Card>
          )}

          {/* Health Insights */}
          {insights.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Health Insights
              </h3>
              {insights.map((insight, idx) => (
                <Card 
                  key={idx}
                  className={`p-4 rounded-xl ${
                    insight.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                    insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                    insight.type === 'alert' ? 'bg-red-50 border-red-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{insight.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{insight.title}</h4>
                      <p className="text-sm text-slate-600">{insight.message}</p>
                    </div>
                    {insight.action && (
                      <Button size="sm" variant="outline" className="rounded-lg">
                        Take Action
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Upcoming Appointments */}
          {dashboardData?.upcoming_appointments?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-500" />
                Upcoming Appointments
              </h3>
              {dashboardData.upcoming_appointments.map((apt, idx) => (
                <Card key={idx} className="p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{apt.doctor}</p>
                      <p className="text-sm text-slate-500">{apt.clinic}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-teal-600">{apt.date}</p>
                      <p className="text-sm text-slate-500">{apt.time}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Compact Achievements */}
          <Achievements compact={true} />
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && <Achievements />}

      {/* Family Tab */}
      {activeTab === 'family' && <FamilyMembers />}

      {/* Log Metric Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-teal-500" />
              Log Health Metric
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Select Metric</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(METRIC_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMetric(key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedMetric === key
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1 ${selectedMetric === key ? 'text-teal-600' : 'text-slate-400'}`} />
                      <p className="text-sm font-medium text-slate-700">{config.label}</p>
                      <p className="text-xs text-slate-400">{config.unit}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <Label>Value ({METRIC_CONFIG[selectedMetric].unit})</Label>
              <Input
                type="number"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                placeholder={`Enter ${METRIC_CONFIG[selectedMetric].label.toLowerCase()}`}
                className="mt-1 rounded-xl text-lg"
                min={METRIC_CONFIG[selectedMetric].range.min}
                max={METRIC_CONFIG[selectedMetric].range.max}
                data-testid="metric-value-input"
              />
              <p className="text-xs text-slate-400 mt-1">
                Range: {METRIC_CONFIG[selectedMetric].range.min} - {METRIC_CONFIG[selectedMetric].range.max}
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowLogDialog(false); setMetricValue(''); }}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={logMetric}
                disabled={saving || !metricValue}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl"
                data-testid="save-metric-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedHealthDashboard;
