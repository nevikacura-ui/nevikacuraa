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

        {accessModules.includes('attendance') && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('attendance')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-sm text-gray-500">Attendance</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.attendance.present}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400">{stats.attendance.late} late</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Fingerprint className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
            {accessModules.map(module => (
              <Badge key={module} variant="secondary" className="py-0.5 sm:py-1 px-2 sm:px-3 text-[10px] sm:text-xs">
                {module === 'anc' && <Baby className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                {module === 'glydex' && <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                {module === 'attendance' && <Fingerprint className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
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
