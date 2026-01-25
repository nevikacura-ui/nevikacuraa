import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Calendar, Users, Activity, Baby, Clock,
  TrendingUp, AlertCircle, CheckCircle2, UserPlus, Package,
  ClipboardList, Zap, Timer, ArrowRight, ExternalLink, PlayCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function StaffDashboard({ staffInfo, onNavigate }) {
  const [stats, setStats] = useState({
    appointments: { total: 0, today: 0, pending: 0 },
    anc: { total: 0, dueThisWeek: 0 },
    glydex: { total: 0, uncontrolled: 0 },
    attendance: { present: 0, late: 0, absent: 0 }
  });
  const [todaySummary, setTodaySummary] = useState({
    totalBooked: 0,
    completed: 0,
    pending: 0,
    inClinic: 0,
    cancelled: 0,
    emergencyCount: 0,
    busiestSlot: null,
    slotDistribution: {},
    walkinCount: 0,
    onlineCount: 0
  });
  const [queueStats, setQueueStats] = useState({
    waiting: 0,
    serving: 0,
    avgWait: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const accessModules = useMemo(() => staffInfo?.access_modules || [], [staffInfo?.access_modules]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const token = localStorage.getItem('staffToken');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch appointments count and calculate today's summary
        if (accessModules.includes('appointments')) {
          const appointmentsRes = await fetch(`${API}/api/staff/clinic/appointments?date=${today}`, { headers });
          if (appointmentsRes.ok) {
            const data = await appointmentsRes.json();
            const appointments = data.appointments || [];
            
            // Calculate status counts
            const completed = appointments.filter(a => a.status === 'Completed').length;
            const pending = appointments.filter(a => a.status === 'Booked').length;
            const inClinic = appointments.filter(a => a.status === 'In Clinic').length;
            const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
            const emergencyCount = appointments.filter(a => a.appointment_type === 'EMERGENCY').length;
            const walkinCount = appointments.filter(a => a.appointment_type === 'WALKIN' || a.appointment_type === 'WALK_IN').length;
            const onlineCount = appointments.filter(a => a.appointment_type === 'ONLINE' || !a.appointment_type).length;
            
            // Calculate slot distribution to find busiest slot
            const slotDistribution = {};
            appointments.forEach(appt => {
              if (appt.time) {
                // Group by hour
                const hour = appt.time.split(':')[0];
                const hourLabel = `${hour}:00`;
                slotDistribution[hourLabel] = (slotDistribution[hourLabel] || 0) + 1;
              }
            });
            
            // Find busiest slot
            let busiestSlot = null;
            let maxCount = 0;
            Object.entries(slotDistribution).forEach(([slot, count]) => {
              if (count > maxCount) {
                maxCount = count;
                busiestSlot = { time: slot, count };
              }
            });
            
            setStats(prev => ({
              ...prev,
              appointments: {
                total: appointments.length,
                today: appointments.length,
                pending: pending
              }
            }));
            
            setTodaySummary({
              totalBooked: appointments.length,
              completed,
              pending,
              inClinic,
              cancelled,
              emergencyCount,
              busiestSlot,
              slotDistribution,
              walkinCount,
              onlineCount
            });
          }
        }

        // Fetch ANC stats
        if (accessModules.includes('anc')) {
          const ancRes = await fetch(`${API}/api/anc/dashboard/${encodeURIComponent(staffInfo?.clinic || 'Pushpa Clinic')}`);
          if (ancRes.ok) {
            const data = await ancRes.json();
            setStats(prev => ({
              ...prev,
              anc: {
                total: data.total_patients || 0,
                dueThisWeek: data.due_this_week || 0
              }
            }));
          }
        }

        // Fetch Glydex stats
        if (accessModules.includes('glydex')) {
          const glydexRes = await fetch(`${API}/api/glydex/staff/reports/summary`);
          if (glydexRes.ok) {
            const data = await glydexRes.json();
            setStats(prev => ({
              ...prev,
              glydex: {
                total: data.summary?.total_patients || 0,
                uncontrolled: data.summary?.uncontrolled || 0
              }
            }));
          }
        }

        // Fetch Attendance stats
        if (accessModules.includes('attendance')) {
          const clinic = staffInfo?.clinic?.toLowerCase().includes('pushpa') ? 'pushpa' : 
                         staffInfo?.clinic?.toLowerCase().includes('amnion') ? 'amnion' : 
                         staffInfo?.clinic?.toLowerCase().includes('pharmacy') ? 'pharmacy' : 'pushpa';
          const attendanceRes = await fetch(`${API}/api/biometric-attendance/report/${clinic}?date=${today}`);
          if (attendanceRes.ok) {
            const data = await attendanceRes.json();
            setStats(prev => ({
              ...prev,
              attendance: {
                present: data.summary?.present || 0,
                late: data.summary?.late || 0,
                absent: data.summary?.absent || 0
              }
            }));
          }
        }

        // Fetch live queue stats (public endpoint)
        try {
          const clinicParam = staffInfo?.clinic?.toLowerCase().includes('amnion') ? 'amnion' : 'pushpa';
          const queueRes = await fetch(`${API}/api/live-queue/status/${clinicParam}`);
          if (queueRes.ok) {
            const queueData = await queueRes.json();
            setQueueStats({
              waiting: queueData.stats?.total_waiting || 0,
              serving: queueData.stats?.currently_serving || 0,
              avgWait: queueData.stats?.avg_wait_time_minutes || 0
            });
          }
        } catch (e) {
          console.log('Queue stats fetch error:', e);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
      setLoading(false);
    };

    if (staffInfo) {
      fetchDashboardStats();
    }
  }, [staffInfo, accessModules]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const quickActions = [
    { 
      id: 'appointments', 
      label: 'View Appointments', 
      icon: Calendar, 
      color: 'bg-blue-500',
      module: 'appointments'
    },
    { 
      id: 'walkin', 
      label: 'New Walk-in', 
      icon: UserPlus, 
      color: 'bg-green-500',
      module: 'appointments'
    },
    { 
      id: 'anc', 
      label: 'ANC Patients', 
      icon: Baby, 
      color: 'bg-pink-500',
      module: 'anc'
    },
    { 
      id: 'glydex', 
      label: 'Diabetes Patients', 
      icon: Activity, 
      color: 'bg-purple-500',
      module: 'glydex'
    }
  ].filter(action => accessModules.includes(action.module));

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="staff-dashboard">
      {/* Welcome Header - Compact on mobile */}
      <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-xs sm:text-sm">{getGreeting()}</p>
            <h1 className="text-lg sm:text-2xl font-bold">{staffInfo?.name}</h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-0.5 sm:mt-1">
              {staffInfo?.clinic}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl sm:text-3xl font-bold">{formatTime(currentTime)}</p>
            <p className="text-teal-100 text-[10px] sm:text-sm">{formatDate(currentTime)}</p>
          </div>
        </div>
      </div>

      {/* Today's Summary Widget */}
      {accessModules.includes('appointments') && todaySummary.totalBooked > 0 && (
        <Card className="border-l-4 border-l-indigo-500 shadow-md" data-testid="todays-summary">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-500" />
              Today&apos;s Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Status breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700">{todaySummary.completed}</p>
                <p className="text-xs text-green-600">Completed</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-yellow-700">{todaySummary.pending}</p>
                <p className="text-xs text-yellow-600">Pending</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-700">{todaySummary.inClinic}</p>
                <p className="text-xs text-blue-600">In Clinic</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <Zap className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-700">{todaySummary.emergencyCount}</p>
                <p className="text-xs text-red-600">Emergency</p>
              </div>
            </div>
            
            {/* Appointment Type breakdown */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className="bg-white">
                <Calendar className="w-3 h-3 mr-1 text-blue-500" />
                Online: {todaySummary.onlineCount}
              </Badge>
              <Badge variant="outline" className="bg-white">
                <UserPlus className="w-3 h-3 mr-1 text-green-500" />
                Walk-in: {todaySummary.walkinCount}
              </Badge>
              {todaySummary.cancelled > 0 && (
                <Badge variant="outline" className="bg-white text-red-600">
                  Cancelled: {todaySummary.cancelled}
                </Badge>
              )}
            </div>
            
            {/* Busiest slot info */}
            {todaySummary.busiestSlot && (
              <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-gray-700">
                    Busiest time: <strong className="text-indigo-600">{todaySummary.busiestSlot.time}</strong>
                    <span className="text-gray-500 ml-1">({todaySummary.busiestSlot.count} appointments)</span>
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-indigo-600 hover:text-indigo-700 p-2 h-auto"
                  onClick={() => onNavigate('appointments')}
                >
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid - 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {accessModules.includes('appointments') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('appointments')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-sm text-gray-500">Appointments</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.appointments.today}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400">{stats.appointments.pending} pending</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {accessModules.includes('anc') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('anc')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-sm text-gray-500">ANC Patients</p>
                  <p className="text-xl sm:text-2xl font-bold text-pink-600">{stats.anc.total}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400">{stats.anc.dueThisWeek} due</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Baby className="w-4 h-4 sm:w-6 sm:h-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {accessModules.includes('glydex') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('glydex')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-sm text-gray-500">Diabetes</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.glydex.total}</p>
                  {stats.glydex.uncontrolled > 0 ? (
                    <p className="text-[10px] sm:text-xs text-red-500">{stats.glydex.uncontrolled} uncontrolled</p>
                  ) : (
                    <p className="text-[10px] sm:text-xs text-gray-400">patients</p>
                  )}
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Live Queue Widget */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />
              Live Queue
            </CardTitle>
            <a href="/queue" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700">
                <ExternalLink className="w-4 h-4 mr-1" />
                Full View
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-3xl font-bold text-green-600">{queueStats.serving}</p>
              <p className="text-xs text-gray-500">Being Served</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-3xl font-bold text-amber-600">{queueStats.waiting}</p>
              <p className="text-xs text-gray-500">Waiting</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-3xl font-bold text-blue-600">{queueStats.avgWait}<span className="text-lg">m</span></p>
              <p className="text-xs text-gray-500">Avg Wait</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="sm"
              onClick={() => {
                // Call next patient via API
                const token = localStorage.getItem('staffToken');
                const clinicParam = staffInfo?.clinic?.toLowerCase().includes('amnion') ? 'amnion' : 'pushpa';
                fetch(`${API}/api/live-queue/staff/call-next/${clinicParam}`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()).then(data => {
                  if (data.success) {
                    alert(`Called: ${data.called_patient?.name || 'Next patient'}`);
                    // Refresh queue stats
                    fetch(`${API}/api/live-queue/status/${clinicParam}`)
                      .then(r => r.json())
                      .then(q => setQueueStats({
                        waiting: q.stats?.total_waiting || 0,
                        serving: q.stats?.currently_serving || 0,
                        avgWait: q.stats?.avg_wait_time_minutes || 0
                      }));
                  } else {
                    alert(data.message || 'No patients waiting');
                  }
                }).catch(e => console.error(e));
              }}
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Call Next
            </Button>
            <a href={`/queue?clinic=${staffInfo?.clinic?.toLowerCase().includes('amnion') ? 'amnion' : 'pushpa'}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full border-cyan-300 text-cyan-700" size="sm">
                <Users className="w-4 h-4 mr-1" />
                Manage Queue
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Grid on mobile */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className={`${action.color} text-white hover:opacity-90 border-0 text-xs sm:text-sm`}
                onClick={() => onNavigate(action.id)}
                data-testid={`quick-action-${action.id}`}
              >
                <action.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Access Summary - Compact on mobile */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-base sm:text-lg">Your Access</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {accessModules.filter(m => m !== 'attendance').map(module => (
              <Badge key={module} variant="secondary" className="py-0.5 sm:py-1 px-2 sm:px-3 text-[10px] sm:text-xs">
                {module === 'anc' && <Baby className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                {module === 'glydex' && <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                {module === 'appointments' && <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                {module === 'pharmacy' && <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                {module.toUpperCase()}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
