import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, Clock, TrendingUp, Calendar, Bell, DollarSign,
  AlertTriangle, CheckCircle, Phone, Mail, RefreshCw,
  BarChart3, Activity, UserCheck, ArrowUp, ArrowDown,
  Timer, Stethoscope, Building
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export const ClinicManagementDashboard = ({ token, clinic = "pushpa" }) => {
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedClinic, setSelectedClinic] = useState(clinic);
  
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  return (
    <div className="space-y-6">
      {/* Clinic Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clinic Management</h2>
          <p className="text-sm text-gray-500">Smart tools for efficient clinic operations</p>
        </div>
        <Select value={selectedClinic} onValueChange={setSelectedClinic}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Clinic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pushpa">🏥 Pushpa Clinic</SelectItem>
            <SelectItem value="amnion">🏥 Amnion Clinic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="queue" className="gap-2"><Users className="w-4 h-4" /> Queue</TabsTrigger>
          <TabsTrigger value="optimizer" className="gap-2"><Calendar className="w-4 h-4" /> Optimizer</TabsTrigger>
          <TabsTrigger value="staff" className="gap-2"><UserCheck className="w-4 h-4" /> Staff</TabsTrigger>
          <TabsTrigger value="recall" className="gap-2"><Bell className="w-4 h-4" /> Recall</TabsTrigger>
          <TabsTrigger value="finance" className="gap-2"><DollarSign className="w-4 h-4" /> Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <QueueManagement clinic={selectedClinic} headers={headers} />
        </TabsContent>
        <TabsContent value="optimizer">
          <AppointmentOptimizer clinic={selectedClinic} headers={headers} />
        </TabsContent>
        <TabsContent value="staff">
          <StaffAnalytics clinic={selectedClinic} headers={headers} />
        </TabsContent>
        <TabsContent value="recall">
          <PatientRecall headers={headers} />
        </TabsContent>
        <TabsContent value="finance">
          <FinanceDashboard clinic={selectedClinic} headers={headers} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============ 1. QUEUE MANAGEMENT ============
const QueueManagement = ({ clinic, headers }) => {
  const [queue, setQueue] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [clinic]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, analyticsRes] = await Promise.all([
        fetch(`${API}/api/clinic-management/queue/${clinic}`, { headers }),
        fetch(`${API}/api/clinic-management/queue/analytics/${clinic}?days=30`, { headers })
      ]);
      const queueData = await queueRes.json();
      const analyticsData = await analyticsRes.json();
      
      if (queueData.success) setQueue(queueData);
      if (analyticsData.success) setAnalytics(analyticsData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const checkInPatient = async (appointmentId) => {
    try {
      const res = await fetch(`${API}/api/clinic-management/queue/check-in`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          appointment_id: appointmentId,
          clinic: clinic,
          priority: 'normal'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Patient checked in');
        fetchData();
      }
    } catch (e) { toast.error('Check-in failed'); }
  };

  const notifyPatient = async (appointmentId, type) => {
    try {
      const res = await fetch(`${API}/api/clinic-management/queue/notify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          appointment_id: appointmentId,
          notification_type: type
        })
      });
      const data = await res.json();
      if (data.success) toast.success(`Notification sent - Position #${data.position}`);
    } catch (e) { toast.error('Notification failed'); }
  };

  if (loading) return <div className="text-center py-8">Loading queue...</div>;

  return (
    <div className="space-y-6">
      {/* Queue Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{queue?.total_waiting || 0}</p>
            <p className="text-sm opacity-80">Waiting</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <Activity className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{queue?.in_progress || 0}</p>
            <p className="text-sm opacity-80">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <Timer className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{queue?.avg_consultation_time || 15}</p>
            <p className="text-sm opacity-80">Avg. Minutes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{analytics?.overall_avg_wait || 0}</p>
            <p className="text-sm opacity-80">Avg. Wait (min)</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Live Queue
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {queue?.queue?.length > 0 ? (
            <div className="space-y-3">
              {queue.queue.map((patient, i) => (
                <div 
                  key={patient.appointment_id}
                  className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                    patient.status === 'In-Progress' ? 'bg-green-50 border-green-300' :
                    patient.status === 'Checked-In' ? 'bg-blue-50 border-blue-300' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      patient.status === 'In-Progress' ? 'bg-green-500 text-white' :
                      patient.status === 'Checked-In' ? 'bg-blue-500 text-white' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {patient.status === 'In-Progress' ? '▶' : patient.position || (i + 1)}
                    </div>
                    <div>
                      <p className="font-semibold">{patient.patient_name}</p>
                      <p className="text-sm text-gray-500">
                        {patient.time_slot} • Dr. {patient.doctor}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge className={
                        patient.status === 'In-Progress' ? 'bg-green-500' :
                        patient.status === 'Checked-In' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }>
                        {patient.status}
                      </Badge>
                      {patient.status === 'Checked-In' && (
                        <p className="text-sm text-gray-500 mt-1">
                          ~{patient.estimated_wait_minutes} min wait
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {patient.status === 'Confirmed' && (
                        <Button size="sm" onClick={() => checkInPatient(patient.appointment_id)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Check In
                        </Button>
                      )}
                      {patient.status === 'Checked-In' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => notifyPatient(patient.appointment_id, 'app')}>
                            <Bell className="w-4 h-4" />
                          </Button>
                          {patient.patient_email && (
                            <Button size="sm" variant="outline" onClick={() => notifyPatient(patient.appointment_id, 'email')}>
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No patients in queue today
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peak Hours Analytics */}
      {analytics?.peak_hours?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Hours Analysis (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {analytics.peak_hours.filter(h => h.patient_count > 0).map((hour, i) => {
                const maxCount = Math.max(...analytics.peak_hours.map(h => h.patient_count));
                const intensity = hour.patient_count / maxCount;
                return (
                  <div 
                    key={i}
                    className="text-center p-2 rounded-lg"
                    style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
                  >
                    <p className={`text-xs font-medium ${intensity > 0.5 ? 'text-white' : 'text-gray-700'}`}>
                      {hour.hour}
                    </p>
                    <p className={`text-lg font-bold ${intensity > 0.5 ? 'text-white' : 'text-gray-800'}`}>
                      {hour.patient_count}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4 text-sm text-gray-600">
              <p><strong>Busiest:</strong> {analytics.busiest_hours?.[0]?.hour || '-'}</p>
              <p><strong>Avg Wait:</strong> {analytics.overall_avg_wait} mins</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============ 2. APPOINTMENT OPTIMIZER ============
const AppointmentOptimizer = ({ clinic, headers }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);

  const runOptimization = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/clinic-management/appointments/optimize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ clinic, date })
      });
      const data = await res.json();
      if (data.success) setOptimization(data);
    } catch (e) { toast.error('Optimization failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> AI Appointment Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm text-gray-500">Select Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block mt-1 border rounded-lg px-3 py-2"
              />
            </div>
            <Button onClick={runOptimization} disabled={loading}>
              {loading ? 'Analyzing...' : 'Run Optimization'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {optimization && (
        <>
          {/* Optimization Score */}
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Schedule Optimization Score</p>
                  <p className="text-4xl font-bold">{optimization.optimization_score}/100</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">{optimization.date}</p>
                  <p className="text-lg font-semibold">{optimization.total_appointments} appointments</p>
                </div>
              </div>
              <Progress value={optimization.optimization_score} className="mt-4 h-2 bg-white/30" />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* No-Show Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> No-Show Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optimization.no_show_predictions?.length > 0 ? (
                  <div className="space-y-3">
                    {optimization.no_show_predictions.map((pred, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div>
                          <p className="font-medium">{pred.patient_name}</p>
                          <p className="text-xs text-gray-500">{pred.time} • {pred.reason}</p>
                        </div>
                        <Badge className="bg-amber-500">{pred.no_show_risk}% risk</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No high-risk predictions</p>
                )}
              </CardContent>
            </Card>

            {/* Schedule Gaps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Schedule Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optimization.schedule_gaps?.length > 0 ? (
                  <div className="space-y-3">
                    {optimization.schedule_gaps.map((gap, i) => (
                      <div key={i} className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium">{gap.after} → {gap.before}</p>
                        <p className="text-sm text-gray-600">{gap.gap_minutes} min gap</p>
                        <p className="text-xs text-blue-600 mt-1">{gap.suggestion}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-600 text-center py-4">✓ Schedule looks optimized</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Buffer Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buffer Time Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {optimization.buffer_recommendations?.map((rec, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="font-medium text-sm">{rec.appointment_type}</p>
                    <p className="text-2xl font-bold text-indigo-600">{rec.recommended_duration_minutes}m</p>
                    <p className="text-xs text-gray-500">+{rec.buffer_between}m buffer</p>
                    <p className="text-xs text-gray-400">{rec.count} booked</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

// ============ 3. STAFF ANALYTICS ============
const StaffAnalytics = ({ clinic, headers }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [clinic]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/clinic-management/staff/analytics?clinic=${clinic}&days=30`, { headers });
      const data = await res.json();
      if (data.success) setAnalytics(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="text-center py-8">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Stethoscope className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{analytics?.summary?.total_appointments || 0}</p>
            <p className="text-sm text-gray-500">Total Appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{analytics?.summary?.total_completed || 0}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{analytics?.summary?.overall_completion_rate || 0}%</p>
            <p className="text-sm text-gray-500">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">₹{(analytics?.summary?.total_revenue || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" /> Doctor Performance (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.doctor_analytics?.map((doctor, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{doctor.doctor_name}</p>
                    <p className="text-sm text-gray-500">{doctor.patients_per_day} patients/day avg</p>
                  </div>
                  <Badge className={doctor.completion_rate >= 90 ? 'bg-green-500' : doctor.completion_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}>
                    {doctor.completion_rate}% completion
                  </Badge>
                </div>
                <div className="grid grid-cols-5 gap-4 text-center text-sm">
                  <div>
                    <p className="font-bold text-lg">{doctor.total_appointments}</p>
                    <p className="text-gray-500">Total</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-green-600">{doctor.completed}</p>
                    <p className="text-gray-500">Done</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-red-600">{doctor.cancelled}</p>
                    <p className="text-gray-500">Cancelled</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg">{doctor.avg_consultation_minutes}m</p>
                    <p className="text-gray-500">Avg Time</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-amber-600">₹{doctor.revenue_generated.toLocaleString()}</p>
                    <p className="text-gray-500">Revenue</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ 4. PATIENT RECALL ============
const PatientRecall = ({ headers }) => {
  const [followups, setFollowups] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [followupsRes, campaignsRes] = await Promise.all([
        fetch(`${API}/api/clinic-management/recall/due-followups?days_overdue=7`, { headers }),
        fetch(`${API}/api/clinic-management/recall/campaigns`, { headers })
      ]);
      const followupsData = await followupsRes.json();
      const campaignsData = await campaignsRes.json();
      
      if (followupsData.success) setFollowups(followupsData);
      if (campaignsData.success) setCampaigns(campaignsData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sendReminder = async (patient) => {
    try {
      const res = await fetch(`${API}/api/clinic-management/recall/send-reminder?user_id=${patient.user_id}&patient_name=${patient.patient_name}&patient_email=${patient.patient_email || ''}&reason=${patient.reason}`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reminder sent to ${patient.patient_name}`);
        fetchData();
      }
    } catch (e) { toast.error('Failed to send reminder'); }
  };

  if (loading) return <div className="text-center py-8">Loading recall data...</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-rose-500 text-white">
          <CardContent className="p-4">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{followups?.high_priority || 0}</p>
            <p className="text-sm opacity-80">High Priority</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <CardContent className="p-4">
            <Bell className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{followups?.total_due || 0}</p>
            <p className="text-sm opacity-80">Due Follow-ups</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{campaigns?.total_conversions || 0}</p>
            <p className="text-sm opacity-80">Converted</p>
          </CardContent>
        </Card>
      </div>

      {/* Due Follow-ups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Patients Due for Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          {followups?.due_followups?.length > 0 ? (
            <div className="space-y-3">
              {followups.due_followups.map((patient, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                    patient.priority === 'high' ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{patient.patient_name}</p>
                      {patient.priority === 'high' && (
                        <Badge className="bg-red-500">High Priority</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Last visit: {patient.last_visit_date} • Dr. {patient.doctor}
                    </p>
                    <p className="text-sm text-gray-600">
                      {patient.reason} • <span className="text-red-600">{patient.days_overdue} days overdue</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {patient.patient_phone && (
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" onClick={() => sendReminder(patient)}>
                      <Bell className="w-4 h-4 mr-1" /> Remind
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">No overdue follow-ups</p>
          )}
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      {campaigns?.campaigns?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recall Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.campaigns.map((campaign, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{campaign.campaign_type}</p>
                    <p className="text-sm text-gray-500">{campaign.reminders_sent} reminders sent</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{campaign.appointments_booked}</p>
                    <p className="text-xs text-gray-500">{campaign.conversion_rate}% conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============ 5. FINANCE DASHBOARD ============
const FinanceDashboard = ({ clinic, headers }) => {
  const [period, setPeriod] = useState('month');
  const [finance, setFinance] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [clinic, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [financeRes, compRes] = await Promise.all([
        fetch(`${API}/api/clinic-management/finance/dashboard?period=${period}&clinic=${clinic}`, { headers }),
        fetch(`${API}/api/clinic-management/finance/comparison?clinic=${clinic}`, { headers })
      ]);
      const financeData = await financeRes.json();
      const compData = await compRes.json();
      
      if (financeData.success) setFinance(financeData);
      if (compData.success) setComparison(compData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="text-center py-8">Loading financial data...</div>;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {['day', 'week', 'month'].map(p => (
          <Button 
            key={p} 
            variant={period === p ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
          </Button>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <CardContent className="p-4">
            <DollarSign className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">₹{(finance?.summary?.grand_total || 0).toLocaleString()}</p>
            <p className="text-sm opacity-80">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stethoscope className="w-8 h-8 mb-2 text-blue-500" />
            <p className="text-2xl font-bold">₹{(finance?.summary?.total_consultation_revenue || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Consultations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Activity className="w-8 h-8 mb-2 text-purple-500" />
            <p className="text-2xl font-bold">₹{(finance?.summary?.diagnostic_revenue || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Diagnostics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Building className="w-8 h-8 mb-2 text-amber-500" />
            <p className="text-2xl font-bold">₹{(finance?.summary?.pharmacy_revenue || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Pharmacy</p>
          </CardContent>
        </Card>
      </div>

      {/* Month Comparison */}
      {comparison && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{comparison.current_period.label}</p>
                <p className="text-2xl font-bold">₹{comparison.current_period.revenue.toLocaleString()}</p>
              </div>
              <div className={`flex items-center gap-2 ${comparison.growth_direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.growth_direction === 'up' ? <ArrowUp className="w-6 h-6" /> : <ArrowDown className="w-6 h-6" />}
                <span className="text-2xl font-bold">{Math.abs(comparison.growth_percentage)}%</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{comparison.previous_period.label}</p>
                <p className="text-2xl font-bold text-gray-400">₹{comparison.previous_period.revenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service-wise Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {finance?.service_breakdown?.map((service, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{service.service}</span>
                    <span>₹{service.revenue.toLocaleString()} ({service.percentage}%)</span>
                  </div>
                  <Progress value={service.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Doctor Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor-wise Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {finance?.doctor_revenue?.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{doc.doctor}</p>
                  <p className="font-bold text-green-600">₹{doc.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Modes */}
      {finance?.payment_modes?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Mode Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {finance.payment_modes.map((mode, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium">{mode.mode}</p>
                  <p className="text-xl font-bold">₹{mode.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{mode.transactions} transactions</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicManagementDashboard;
