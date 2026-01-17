import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, Calendar, FileText, Pill, User, Activity,
  Heart, Droplet, TrendingUp, TrendingDown, Clock, Download,
  Share2, Eye, ChevronRight, Stethoscope, FlaskConical,
  ClipboardList, Baby, Syringe, AlertCircle, CheckCircle2,
  RefreshCw, Loader2, History, LineChart
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    'Completed': { color: 'bg-green-500', icon: CheckCircle2 },
    'Booked': { color: 'bg-blue-500', icon: Clock },
    'Pending': { color: 'bg-yellow-500', icon: Clock },
    'Cancelled': { color: 'bg-red-500', icon: AlertCircle },
    'In Progress': { color: 'bg-purple-500', icon: Activity },
    'Delivered': { color: 'bg-green-500', icon: CheckCircle2 }
  };
  const config = statusConfig[status] || { color: 'bg-gray-500', icon: Clock };
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.color} text-white flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
};

// Timeline Item Component
const TimelineItem = ({ item, isLast }) => {
  const iconMap = {
    'appointment': { icon: Calendar, color: 'bg-blue-500' },
    'diagnostic': { icon: FlaskConical, color: 'bg-purple-500' },
    'pharmacy': { icon: Pill, color: 'bg-green-500' },
    'prescription': { icon: FileText, color: 'bg-orange-500' },
    'vaccination': { icon: Syringe, color: 'bg-pink-500' }
  };
  
  const config = iconMap[item.type] || { icon: Activity, color: 'bg-gray-500' };
  const Icon = config.icon;
  
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        {!isLast && <div className="w-0.5 h-full bg-gray-200 mt-2" />}
      </div>
      <div className={`flex-1 pb-6 ${isLast ? '' : 'border-b border-gray-100'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{item.title}</h4>
            <p className="text-sm text-gray-500">{item.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">{item.date}</p>
            <StatusBadge status={item.status} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subtext, color = 'blue', onClick }) => (
  <Card 
    className={`hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-${color}-500`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Health Trend Chart Component (Simple)
const HealthTrendChart = ({ data, label, unit, color = 'blue' }) => {
  if (!data || data.length === 0) return null;
  
  const maxVal = Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));
  const range = maxVal - minVal || 1;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-lg font-bold text-${color}-600`}>
          {data[data.length - 1]?.value} {unit}
        </span>
      </div>
      <div className="flex items-end gap-1 h-16">
        {data.slice(-10).map((d, i) => (
          <div
            key={i}
            className={`flex-1 bg-${color}-500 rounded-t opacity-${50 + (i * 5)}`}
            style={{ height: `${((d.value - minVal) / range) * 100}%`, minHeight: '8px' }}
            title={`${d.date}: ${d.value} ${unit}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center">Last {Math.min(10, data.length)} readings</p>
    </div>
  );
};

const HealthDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [healthSummary, setHealthSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [bloodSugarTrends, setBloodSugarTrends] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch all health data
  const fetchHealthData = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;
    
    if (showRefresh) setRefreshing(true);
    
    try {
      const [summaryRes, timelineRes, trendsRes, appointmentsRes, diagnosticsRes, pharmacyRes] = await Promise.all([
        axios.get(`${API}/api/health-records/summary/${user.id}`).catch(e => ({ data: null })),
        axios.get(`${API}/api/health-records/timeline/${user.id}?limit=20`).catch(e => ({ data: { timeline: [] } })),
        axios.get(`${API}/api/health-records/trends/blood-sugar/${user.id}`).catch(e => ({ data: null })),
        axios.get(`${API}/api/appointments`, { headers }).catch(e => ({ data: [] })),
        axios.get(`${API}/api/diagnostics`, { headers }).catch(e => ({ data: [] })),
        axios.get(`${API}/api/pharmacy`, { headers }).catch(e => ({ data: [] }))
      ]);
      
      setHealthSummary(summaryRes.data);
      setTimeline(timelineRes.data?.timeline || []);
      setBloodSugarTrends(trendsRes.data);
      setAppointments(appointmentsRes.data || []);
      setDiagnostics(diagnosticsRes.data || []);
      setPharmacyOrders(pharmacyRes.data || []);
      
      // Extract prescriptions from summary
      if (summaryRes.data?.prescriptions) {
        setPrescriptions(summaryRes.data.prescriptions);
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, headers]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchHealthData();
  }, [user, navigate, fetchHealthData]);

  // Generate shareable health summary
  const generateShareableSummary = () => {
    if (!healthSummary) {
      toast.error('No health data available');
      return;
    }
    
    const summary = `
HEALTH SUMMARY - ${user?.name || 'Patient'}
Generated: ${new Date().toLocaleDateString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATISTICS
• Total Appointments: ${healthSummary.stats?.total_appointments || 0}
• Completed Consultations: ${healthSummary.stats?.completed_appointments || 0}
• Lab Tests: ${healthSummary.stats?.total_diagnostic_tests || 0}
• Pharmacy Orders: ${healthSummary.stats?.total_pharmacy_orders || 0}

📅 RECENT APPOINTMENTS
${appointments.slice(0, 5).map(a => `• ${a.date} - ${a.doctor} (${a.status})`).join('\n') || 'No recent appointments'}

💊 RECENT MEDICATIONS
${pharmacyOrders.slice(0, 3).map(o => `• ${o.medicines?.map(m => m.name).join(', ') || 'Order'} - ${o.status}`).join('\n') || 'No recent orders'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nevika Cura Healthcare
    `.trim();
    
    navigator.clipboard.writeText(summary);
    toast.success('Health summary copied to clipboard!');
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = healthSummary?.stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Health Dashboard</h1>
                <p className="text-sm text-gray-500">Complete health overview</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchHealthData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateShareableSummary}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Patient Info Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user?.name || 'Patient'}</h2>
                <p className="text-blue-100">{user?.phone || user?.email}</p>
                <div className="flex gap-3 mt-2">
                  {user?.blood_group && (
                    <Badge className="bg-white/20">
                      <Droplet className="w-3 h-3 mr-1" />
                      {user.blood_group}
                    </Badge>
                  )}
                  <Badge className="bg-white/20">
                    <History className="w-3 h-3 mr-1" />
                    Member since {new Date(user?.created_at || Date.now()).getFullYear()}
                  </Badge>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-blue-100 text-sm">Health Score</p>
                <p className="text-4xl font-bold">
                  {stats.completed_appointments > 0 ? '85%' : '--'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Calendar}
            label="Appointments"
            value={stats.total_appointments || 0}
            subtext={`${stats.completed_appointments || 0} completed`}
            color="blue"
            onClick={() => setActiveTab('appointments')}
          />
          <StatCard
            icon={FlaskConical}
            label="Lab Tests"
            value={stats.total_diagnostic_tests || 0}
            subtext="diagnostic orders"
            color="purple"
            onClick={() => setActiveTab('diagnostics')}
          />
          <StatCard
            icon={Pill}
            label="Pharmacy"
            value={stats.total_pharmacy_orders || 0}
            subtext="medicine orders"
            color="green"
            onClick={() => setActiveTab('pharmacy')}
          />
          <StatCard
            icon={Activity}
            label="Health Readings"
            value={stats.blood_sugar_readings || 0}
            subtext="logged entries"
            color="orange"
            onClick={() => setActiveTab('trends')}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <ClipboardList className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-1">
              <FlaskConical className="w-4 h-4" />
              Lab Tests
            </TabsTrigger>
            <TabsTrigger value="pharmacy" className="flex items-center gap-1">
              <Pill className="w-4 h-4" />
              Medicines
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1">
              <LineChart className="w-4 h-4" />
              Trends
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Recent Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length > 0 ? (
                    <div className="space-y-0">
                      {timeline.slice(0, 5).map((item, idx) => (
                        <TimelineItem 
                          key={idx} 
                          item={item} 
                          isLast={idx === Math.min(4, timeline.length - 1)} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Health Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bloodSugarTrends?.insights?.map((insight, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg ${
                        insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                        insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                      }`}
                    >
                      <p className={`text-sm ${
                        insight.type === 'success' ? 'text-green-700' :
                        insight.type === 'warning' ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {insight.message}
                      </p>
                    </div>
                  ))}
                  
                  {(!bloodSugarTrends?.insights || bloodSugarTrends.insights.length === 0) && (
                    <div className="text-center py-4 text-gray-500">
                      <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Log your health data to get personalized insights</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => navigate('/glydex')}
                      >
                        Start Tracking
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>Visit History</CardTitle>
                <CardDescription>Your past and upcoming appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map((apt, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{apt.doctor || 'Doctor'}</p>
                            <p className="text-sm text-gray-500">{apt.clinic || 'Clinic'}</p>
                            <p className="text-xs text-gray-400">{apt.date} at {apt.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={apt.status} />
                          {apt.notes && (
                            <p className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">
                              {apt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No appointments yet</p>
                    <p className="text-sm">Book your first appointment with a doctor</p>
                    <Button className="mt-4" onClick={() => navigate('/diagyn')}>
                      Book Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnostics Tab */}
          <TabsContent value="diagnostics">
            <Card>
              <CardHeader>
                <CardTitle>Lab Test Reports</CardTitle>
                <CardDescription>Your diagnostic test history and results</CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.length > 0 ? (
                  <div className="space-y-3">
                    {diagnostics.map((order, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <FlaskConical className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {order.tests?.length || 0} Tests
                            </p>
                            <p className="text-sm text-gray-500">
                              {order.tests?.slice(0, 3).join(', ') || 'Lab Tests'}
                              {order.tests?.length > 3 && ` +${order.tests.length - 3} more`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {order.created_at?.split('T')[0] || order.date}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          {order.report_url && (
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FlaskConical className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No lab tests yet</p>
                    <p className="text-sm">Book diagnostic tests to track your health</p>
                    <Button className="mt-4" onClick={() => navigate('/proton')}>
                      Book Lab Tests
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pharmacy Tab */}
          <TabsContent value="pharmacy">
            <Card>
              <CardHeader>
                <CardTitle>Medicine Orders</CardTitle>
                <CardDescription>Your pharmacy order history</CardDescription>
              </CardHeader>
              <CardContent>
                {pharmacyOrders.length > 0 ? (
                  <div className="space-y-3">
                    {pharmacyOrders.map((order, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <Pill className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {order.medicines?.length || 0} Medicines
                            </p>
                            <p className="text-sm text-gray-500">
                              {order.medicines?.slice(0, 2).map(m => m.name).join(', ') || 'Medicine Order'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {order.created_at?.split('T')[0]} • ₹{order.total_amount || 0}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              localStorage.setItem('reorder_data', JSON.stringify(order));
                              navigate('/pharmacy?reorder=true');
                            }}
                          >
                            Reorder
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Pill className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No medicine orders yet</p>
                    <p className="text-sm">Order medicines from Orange Pharmacy</p>
                    <Button className="mt-4" onClick={() => navigate('/pharmacy')}>
                      Order Medicines
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Blood Sugar Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-red-500" />
                    Blood Sugar Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bloodSugarTrends?.trends?.fbs ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-500">Average FBS</p>
                          <p className="text-xl font-bold text-blue-600">
                            {bloodSugarTrends.trends.fbs.average}
                          </p>
                          <p className="text-xs text-gray-400">mg/dL</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-500">Min</p>
                          <p className="text-xl font-bold text-green-600">
                            {bloodSugarTrends.trends.fbs.min}
                          </p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-gray-500">Max</p>
                          <p className="text-xl font-bold text-red-600">
                            {bloodSugarTrends.trends.fbs.max}
                          </p>
                        </div>
                      </div>
                      
                      {bloodSugarTrends.trends.hba1c && (
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-700">HbA1c (3-month avg)</span>
                            <span className="text-2xl font-bold text-purple-600">
                              {bloodSugarTrends.trends.hba1c.latest}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Droplet className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No blood sugar data logged</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => navigate('/glydex')}
                      >
                        Start Logging
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Total Consultations</span>
                      <span className="text-xl font-bold">{stats.completed_appointments || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Lab Tests Done</span>
                      <span className="text-xl font-bold">{stats.total_diagnostic_tests || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Health Readings</span>
                      <span className="text-xl font-bold">{stats.blood_sugar_readings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Period Logs</span>
                      <span className="text-xl font-bold">{stats.period_logs || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HealthDashboard;
