import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Lock, LogOut, UserPlus, CheckCircle2, 
  Clock, Package, FlaskConical, Stethoscope, Users, 
  Phone, Calendar, Loader2, RefreshCw
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Clinic configuration
const CLINICS = {
  "Pushpa Clinic": ["Dr. Neha Batra", "Dr. Priya Sharma"],
  "Amnion Clinic": ["Dr. Vikas Jha", "Dr. Ankita Gupta"]
};

const StaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [appointments, setAppointments] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [diagnosticOrders, setDiagnosticOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Walk-in form - will be set based on staff's clinic
  const [walkInForm, setWalkInForm] = useState({
    doctor: '',
    clinic: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    patient_name: '',
    patient_phone: ''
  });

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    if (token && info) {
      setIsAuthenticated(true);
      const parsedInfo = JSON.parse(info);
      setStaffInfo(parsedInfo);
      
      // Set default clinic for walk-in form based on staff's clinic
      if (parsedInfo.clinic) {
        const clinicDoctors = CLINICS[parsedInfo.clinic] || [];
        setWalkInForm(prev => ({
          ...prev,
          clinic: parsedInfo.clinic,
          doctor: clinicDoctors[0] || ''
        }));
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && staffInfo) {
      loadData();
    }
  }, [isAuthenticated, staffInfo, selectedDate]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` }
  });

  // Helper to check clinic staff roles
  const isClinicStaff = (role) => ['clinic_staff_pushpa', 'clinic_staff_amnion', 'super_admin'].includes(role);
  const isDoctor = (role) => ['doctor_pushpa', 'doctor_amnion', 'super_admin'].includes(role);

  const loadData = async () => {
    try {
      const role = staffInfo?.role;
      
      if (isClinicStaff(role)) {
        const res = await axios.get(`${API}/staff/clinic/appointments?date=${selectedDate}`, getAuthHeaders());
        setAppointments(res.data.appointments || []);
      }
      
      if (isDoctor(role)) {
        const res = await axios.get(`${API}/staff/doctor/appointments?date=${selectedDate}`, getAuthHeaders());
        setAppointments(res.data.appointments || []);
      }
      
      if (role === 'pharmacy_staff' || role === 'super_admin') {
        const res = await axios.get(`${API}/staff/pharmacy/orders`, getAuthHeaders());
        setPharmacyOrders(res.data.orders || []);
      }
      
      if (role === 'diagnostics_staff' || role === 'super_admin') {
        const res = await axios.get(`${API}/staff/diagnostic/orders`, getAuthHeaders());
        setDiagnosticOrders(res.data.orders || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/staff/login`, { username, password });
      localStorage.setItem('staffToken', res.data.token);
      const staffData = {
        role: res.data.role,
        name: res.data.name,
        doctor_name: res.data.doctor_name,
        clinic: res.data.clinic
      };
      localStorage.setItem('staffInfo', JSON.stringify(staffData));
      setStaffInfo(staffData);
      
      // Set walk-in form clinic based on logged-in user
      if (res.data.clinic) {
        const clinicDoctors = CLINICS[res.data.clinic] || [];
        setWalkInForm(prev => ({
          ...prev,
          clinic: res.data.clinic,
          doctor: clinicDoctors[0] || ''
        }));
      }
      
      setIsAuthenticated(true);
      toast.success(`Welcome, ${res.data.name}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffInfo');
    setIsAuthenticated(false);
    setStaffInfo(null);
    toast.success('Logged out successfully');
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      await axios.put(`${API}/staff/appointments/${appointmentId}/check-in`, {}, getAuthHeaders());
      toast.success('Patient checked in successfully');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Check-in failed');
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await axios.put(`${API}/staff/appointments/${appointmentId}/complete`, {}, getAuthHeaders());
      toast.success('Appointment marked as completed');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const handleWalkInBooking = async () => {
    if (!walkInForm.patient_name || !walkInForm.patient_phone || !walkInForm.time) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/staff/appointments/walk-in`, walkInForm, getAuthHeaders());
      toast.success('Walk-in appointment booked');
      setWalkInForm({ ...walkInForm, patient_name: '', patient_phone: '', time: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed');
    }
    setLoading(false);
  };

  const handlePharmacyStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/staff/pharmacy/orders/${orderId}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`Order updated to ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const handleDiagnosticStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/staff/diagnostic/orders/${orderId}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`Order updated to ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Booked': 'bg-yellow-100 text-yellow-800',
      'In Clinic': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'No Show': 'bg-gray-100 text-gray-800',
      'Received': 'bg-yellow-100 text-yellow-800',
      'Processing': 'bg-blue-100 text-blue-800',
      'Ready': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Sample Collected': 'bg-blue-100 text-blue-800',
      'Report Ready': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
            <p className="text-gray-500 mt-1">Nevika Cura Healthcare</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10"
                  data-testid="staff-username"
                />
              </div>
            </div>
            
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="staff-password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleLogin} 
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600"
              data-testid="staff-login-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Login
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate('/')} className="text-gray-500">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const role = staffInfo?.role;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Staff Portal</h1>
              <p className="text-sm text-gray-500">{staffInfo?.name} • {role?.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Clinic Staff View */}
        {isClinicStaff(role) && (
          <Tabs defaultValue="appointments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="appointments">
                <Calendar className="w-4 h-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="walkin">
                <UserPlus className="w-4 h-4 mr-2" />
                Book Walk-in
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">{staffInfo?.clinic || 'Clinic'} - Appointments</h2>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No appointments for this date</p>
                  ) : (
                    appointments.map((appt) => (
                      <div key={appt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{appt.patient_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(appt.status)}`}>
                              {appt.status}
                            </span>
                            {appt.booking_type === 'walk_in' && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">Walk-in</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span>{appt.time}</span> • <span>{appt.doctor}</span> • <span>{appt.patient_phone}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {appt.status === 'Booked' && (
                            <Button size="sm" onClick={() => handleCheckIn(appt.id)} className="bg-blue-500 hover:bg-blue-600">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Check In
                            </Button>
                          )}
                          {appt.status === 'In Clinic' && (
                            <Button size="sm" onClick={() => handleCompleteAppointment(appt.id)} className="bg-green-500 hover:bg-green-600">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="walkin">
              <Card className="p-6 max-w-lg">
                <h2 className="font-semibold text-lg mb-4">Book Walk-in Appointment - {staffInfo?.clinic}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Doctor</Label>
                      <select
                        value={walkInForm.doctor}
                        onChange={(e) => setWalkInForm({ ...walkInForm, doctor: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                      >
                        {(CLINICS[staffInfo?.clinic] || []).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={walkInForm.date}
                        onChange={(e) => setWalkInForm({ ...walkInForm, date: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Time Slot</Label>
                    <select
                      value={walkInForm.time}
                      onChange={(e) => setWalkInForm({ ...walkInForm, time: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">Select time</option>
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <Label>Patient Name *</Label>
                    <Input
                      value={walkInForm.patient_name}
                      onChange={(e) => setWalkInForm({ ...walkInForm, patient_name: e.target.value })}
                      placeholder="Enter patient name"
                    />
                  </div>
                  
                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      value={walkInForm.patient_phone}
                      onChange={(e) => setWalkInForm({ ...walkInForm, patient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  
                  <Button onClick={handleWalkInBooking} disabled={loading} className="w-full bg-teal-500 hover:bg-teal-600">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Book Walk-in Appointment
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Doctor View */}
        {isDoctor(role) && !isClinicStaff(role) && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">My Appointments - {staffInfo?.doctor_name}</h2>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments for this date</p>
              ) : (
                appointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{appt.patient_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(appt.status)}`}>
                          {appt.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span>{appt.time}</span> • <span>{appt.patient_phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {appt.status === 'In Clinic' && (
                        <Button size="sm" onClick={() => handleCompleteAppointment(appt.id)} className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Pharmacy Staff View */}
        {role === 'pharmacy_staff' && (
          <Card className="p-4 mt-4">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Pharmacy Orders
            </h2>
            
            <div className="space-y-3">
              {pharmacyOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders</p>
              ) : (
                pharmacyOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">{order.patient_name}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{order.patient_phone}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {order.medicines?.map(m => `${m.name} (${m.quantity})`).join(', ')}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['Order Booked', 'Packing', 'Out for Delivery', 'Delivered'].map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={order.status === status ? 'default' : 'outline'}
                          onClick={() => handlePharmacyStatusUpdate(order.id, status)}
                          disabled={order.status === status}
                          className={order.status === status ? 'bg-orange-500' : ''}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Diagnostics Staff View */}
        {(role === 'diagnostics_staff' || role === 'super_admin') && (
          <Card className="p-4 mt-4">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-500" />
              Diagnostic Orders
            </h2>
            
            <div className="space-y-3">
              {diagnosticOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders</p>
              ) : (
                diagnosticOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">{order.patient_name}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{order.patient_phone}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {order.tests?.slice(0, 3).join(', ')}{order.tests?.length > 3 ? '...' : ''}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={order.status === status ? 'default' : 'outline'}
                          onClick={() => handleDiagnosticStatusUpdate(order.id, status)}
                          disabled={order.status === status}
                          className={order.status === status ? 'bg-purple-500' : ''}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default StaffPortal;
