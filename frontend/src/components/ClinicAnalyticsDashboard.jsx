import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import {
  BarChart3, TrendingUp, Users, DollarSign, Calendar, Clock,
  Activity, RefreshCw, Loader2, Building2, Stethoscope, Pill,
  FlaskConical, ArrowUpRight, ArrowDownRight, Target
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Simple Bar Chart Component
const SimpleBarChart = ({ data, dataKey, color = '#3b82f6', height = 120 }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d[dataKey] || 0)) || 1;
  
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-t transition-all hover:opacity-80"
            style={{
              height: `${((item[dataKey] || 0) / maxVal) * 100}%`,
              minHeight: '4px',
              backgroundColor: color
            }}
            title={`${item.date || item.time_label}: ${item[dataKey]}`}
          />
          <span className="text-[8px] text-gray-400 mt-1 truncate w-full text-center">
            {item.date?.slice(-2) || item.time_label?.slice(0, 2)}
          </span>
        </div>
      ))}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, subtext, trend, color = 'blue' }) => (
  <Card className={`border-l-4 border-l-${color}-500`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
              {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
              {subtext}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ClinicAnalyticsDashboard = ({ token, clinic = 'all' }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(clinic);
  const [selectedDays, setSelectedDays] = useState(7);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [footfall, setFootfall] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [doctorPerformance, setDoctorPerformance] = useState(null);
  const [timeSlots, setTimeSlots] = useState(null);
  const [staffPerformance, setStaffPerformance] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAllData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const [overviewRes, footfallRes, revenueRes, doctorRes, slotsRes, staffRes] = await Promise.all([
        axios.get(`${API}/api/clinic-analytics/overview?clinic=${selectedClinic}&days=${selectedDays}`, { headers }),
        axios.get(`${API}/api/clinic-analytics/footfall?clinic=${selectedClinic}&days=${selectedDays}`, { headers }),
        axios.get(`${API}/api/clinic-analytics/revenue?days=${selectedDays}`, { headers }),
        axios.get(`${API}/api/clinic-analytics/doctor-performance?days=${selectedDays}`, { headers }),
        axios.get(`${API}/api/clinic-analytics/time-slots?clinic=${selectedClinic}&days=${selectedDays}`, { headers }),
        axios.get(`${API}/api/clinic-analytics/staff-performance?clinic=${selectedClinic}&days=${selectedDays}`, { headers })
      ]);
      
      setOverview(overviewRes.data);
      setFootfall(footfallRes.data);
      setRevenue(revenueRes.data);
      setDoctorPerformance(doctorRes.data);
      setTimeSlots(slotsRes.data);
      setStaffPerformance(staffRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClinic, selectedDays, headers]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Clinic Analytics
          </h2>
          <p className="text-sm text-gray-500">Performance insights and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClinic} onValueChange={setSelectedClinic}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Clinic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              <SelectItem value="pushpa">Pushpa Clinic</SelectItem>
              <SelectItem value="amnion">Amnion Clinic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedDays.toString()} onValueChange={(v) => setSelectedDays(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchAllData(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="Total Patients"
          value={overview?.overview?.total_appointments || 0}
          subtext={`${overview?.overview?.completion_rate || 0}% completed`}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          title="Revenue"
          value={`₹${(overview?.revenue?.total || 0).toLocaleString()}`}
          subtext={`₹${Math.round(overview?.revenue?.avg_daily || 0)}/day avg`}
          trend="up"
          color="green"
        />
        <StatCard
          icon={Calendar}
          title="Today"
          value={overview?.today?.total || 0}
          subtext={`${overview?.today?.completed || 0} completed`}
          color="purple"
        />
        <StatCard
          icon={Activity}
          title="Completion Rate"
          value={`${overview?.overview?.completion_rate || 0}%`}
          subtext={`${overview?.overview?.completed || 0} of ${overview?.overview?.total_appointments || 0}`}
          color="orange"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white shadow-sm border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="footfall">Footfall</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Patient Footfall Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Patient Footfall (Last {selectedDays} days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={footfall?.trend_data?.slice(-14)}
                  dataKey="total"
                  color="#3b82f6"
                  height={150}
                />
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-gray-500">Avg: {footfall?.summary?.avg_daily || 0}/day</span>
                  <span className="text-blue-600 font-medium">
                    Peak: {footfall?.summary?.peak_day?.total || 0} ({footfall?.summary?.peak_day?.day || 'N/A'})
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Time Slots Popularity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Popular Time Slots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={timeSlots?.time_slot_data}
                  dataKey="total"
                  color="#8b5cf6"
                  height={150}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-500">
                    Peak hours: {timeSlots?.insights?.peak_hours?.map(h => h.time_label).join(', ') || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <Pill className="w-6 h-6 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-gray-600">Pharmacy</p>
                  <p className="text-xl font-bold text-green-700">₹{(revenue?.summary?.pharmacy_revenue || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <FlaskConical className="w-6 h-6 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm text-gray-600">Diagnostics</p>
                  <p className="text-xl font-bold text-purple-700">₹{(revenue?.summary?.diagnostic_revenue || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <Stethoscope className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Consultations</p>
                  <p className="text-xl font-bold text-blue-700">₹{(overview?.revenue?.consultations || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footfall Tab */}
        <TabsContent value="footfall">
          <Card>
            <CardHeader>
              <CardTitle>Daily Patient Footfall</CardTitle>
              <CardDescription>Patient visits trend over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={footfall?.trend_data}
                dataKey="total"
                color="#3b82f6"
                height={200}
              />
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(footfall?.summary?.day_of_week_averages || {}).map(([day, avg]) => (
                  <div key={day} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">{day}</p>
                    <p className="text-xl font-bold">{avg}</p>
                    <p className="text-xs text-gray-400">avg patients</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SimpleBarChart
                data={revenue?.revenue_data}
                dataKey="total"
                color="#10b981"
                height={180}
              />
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Medicines */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-green-600" />
                    Top Selling Medicines
                  </h4>
                  <div className="space-y-2">
                    {revenue?.top_medicines?.slice(0, 5).map((med, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm truncate">{med.name}</span>
                        <Badge variant="outline">₹{med.revenue}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Top Tests */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    Popular Tests
                  </h4>
                  <div className="space-y-2">
                    {revenue?.top_tests?.slice(0, 5).map((test, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm truncate">{test.name}</span>
                        <Badge variant="outline">{test.count} orders</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Performance</CardTitle>
              <CardDescription>Appointment statistics per doctor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doctorPerformance?.doctors?.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.doctor}</p>
                        <p className="text-sm text-gray-500">{doc.clinics?.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-blue-600">{doc.total_appointments}</p>
                        <p className="text-gray-400">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{doc.completed}</p>
                        <p className="text-gray-400">Done</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-purple-600">{doc.completion_rate}%</p>
                        <p className="text-gray-400">Rate</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Attendance and hours tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {staffPerformance?.staff?.length > 0 ? (
                <div className="space-y-3">
                  {staffPerformance.staff.map((staff, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{staff.staff_name}</p>
                        <p className="text-sm text-gray-500">{staff.clinic}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-green-600">{staff.present_days}</p>
                          <p className="text-gray-400">Present</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-yellow-600">{staff.late_days}</p>
                          <p className="text-gray-400">Late</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{staff.total_hours}h</p>
                          <p className="text-gray-400">Hours</p>
                        </div>
                        <Badge className={staff.attendance_rate >= 90 ? 'bg-green-500' : staff.attendance_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}>
                          {staff.attendance_rate}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No staff attendance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicAnalyticsDashboard;
