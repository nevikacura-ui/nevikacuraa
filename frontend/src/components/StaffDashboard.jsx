import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Calendar, Users, Activity, Baby, Fingerprint, Clock,
  TrendingUp, AlertCircle, CheckCircle2, UserPlus, Package
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function StaffDashboard({ staffInfo, onNavigate }) {
  const [stats, setStats] = useState({
    appointments: { total: 0, today: 0, pending: 0 },
    anc: { total: 0, dueThisWeek: 0 },
    glydex: { total: 0, uncontrolled: 0 },
    attendance: { present: 0, late: 0, absent: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const accessModules = staffInfo?.access_modules || [];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [staffInfo]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const token = localStorage.getItem('staffToken');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch appointments count
      if (accessModules.includes('appointments')) {
        const appointmentsRes = await fetch(`${API}/api/staff/clinic/appointments?date=${today}`, { headers });
        if (appointmentsRes.ok) {
          const data = await appointmentsRes.json();
          setStats(prev => ({
            ...prev,
            appointments: {
              total: data.appointments?.length || 0,
              today: data.appointments?.filter(a => a.date === today).length || 0,
              pending: data.appointments?.filter(a => a.status === 'Booked').length || 0
            }
          }));
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
        const attendanceRes = await fetch(`${API}/api/biometric-attendance/daily-report?clinic=${clinic}&date=${today}`);
        if (attendanceRes.ok) {
          const data = await attendanceRes.json();
          setStats(prev => ({
            ...prev,
            attendance: {
              present: data.present || 0,
              late: data.late || 0,
              absent: data.absent || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
    setLoading(false);
  };

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
    },
    { 
      id: 'attendance', 
      label: 'Mark Attendance', 
      icon: Fingerprint, 
      color: 'bg-orange-500',
      module: 'attendance'
    }
  ].filter(action => accessModules.includes(action.module));

  return (
    <div className="space-y-6" data-testid="staff-dashboard">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-teal-100 text-sm">{getGreeting()}</p>
            <h1 className="text-2xl font-bold">{staffInfo?.name}</h1>
            <p className="text-teal-100 text-sm mt-1">
              {staffInfo?.clinic} • {staffInfo?.role?.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{formatTime(currentTime)}</p>
            <p className="text-teal-100 text-sm">{formatDate(currentTime)}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {accessModules.includes('appointments') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('appointments')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Today&apos;s Appointments</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.appointments.today}</p>
                  <p className="text-xs text-gray-400">{stats.appointments.pending} pending</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {accessModules.includes('anc') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('anc')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">ANC Patients</p>
                  <p className="text-2xl font-bold text-pink-600">{stats.anc.total}</p>
                  <p className="text-xs text-gray-400">{stats.anc.dueThisWeek} due this week</p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <Baby className="w-6 h-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {accessModules.includes('glydex') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('glydex')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Diabetes Patients</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.glydex.total}</p>
                  {stats.glydex.uncontrolled > 0 && (
                    <p className="text-xs text-red-500">{stats.glydex.uncontrolled} uncontrolled</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {accessModules.includes('attendance') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('attendance')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Attendance Today</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.attendance.present}</p>
                  <p className="text-xs text-gray-400">{stats.attendance.late} late</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Fingerprint className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                className={`${action.color} text-white hover:opacity-90 border-0`}
                onClick={() => onNavigate(action.id)}
                data-testid={`quick-action-${action.id}`}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Access Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Your Access Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {accessModules.map(module => (
              <Badge key={module} variant="secondary" className="py-1 px-3">
                {module === 'anc' && <Baby className="w-3 h-3 mr-1" />}
                {module === 'glydex' && <Activity className="w-3 h-3 mr-1" />}
                {module === 'attendance' && <Fingerprint className="w-3 h-3 mr-1" />}
                {module === 'appointments' && <Calendar className="w-3 h-3 mr-1" />}
                {module === 'pharmacy' && <Package className="w-3 h-3 mr-1" />}
                {module.toUpperCase()}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
