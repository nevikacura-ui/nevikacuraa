import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, User, Phone, Calendar, Loader2, LogOut, Mail, Edit2, Save, X,
  FileText, Pill, FlaskConical, Receipt, History, Clock, Gift, Package,
  CheckCircle2, XCircle, AlertCircle, Download, Eye, Search, Users, Bell,
  Stethoscope, Building2, CreditCard, Shield, Star, ChevronRight, Settings, Heart,
  CalendarPlus
} from 'lucide-react';
import { AddToCalendarButton } from '@/components/AddToCalendar';
// Enhancement Components
import { LoyaltyPoints, FamilyHub, PrescriptionWallet, QueueTracker, NotificationPreferences } from '@/components/enhancements';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const PatientPortal = () => {
  const navigate = useNavigate();
  const { setPatientAuth, logout: authLogout } = useAuth();
  
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [token, setToken] = useState(null);
  
  // Login states
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  
  // Data states
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Active section
  const [activeSection, setActiveSection] = useState('profile');
  
  // Edit profile states
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ email: '', mobile: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Check for existing session
  useEffect(() => {
    const verifyExistingToken = async (savedToken) => {
      try {
        const response = await axios.get(`${API}/patients/portal/me`, {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        setPatientInfo(response.data);
        setToken(savedToken);
        setIsAuthenticated(true);
        setEditForm({ email: response.data.email || '', mobile: response.data.mobile || '' });
        fetchHistory(response.data.patient_id, savedToken);
      } catch (error) {
        localStorage.removeItem('patientToken');
      }
    };
    
    const savedToken = localStorage.getItem('patientToken');
    if (savedToken) {
      verifyExistingToken(savedToken);
    }
  }, []);
  
  const handleSendOtp = async () => {
    if (mobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/patients/portal/send-otp?mobile=${mobile}`);
      setOtpSent(true);
      setMockOtp(response.data.mock_otp || '');
      toast.success('OTP sent to your mobile number');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP. Please register at the clinic first.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/patients/portal/verify-otp?mobile=${mobile}&otp=${otp}`);
      const { token: newToken, patient } = response.data;
      
      localStorage.setItem('patientToken', newToken);
      setToken(newToken);
      setPatientInfo(patient);
      setIsAuthenticated(true);
      setEditForm({ email: patient.email || '', mobile: patient.mobile || '' });
      
      // Sync with AuthContext for global user state
      if (setPatientAuth) {
        setPatientAuth(newToken, patient);
      }
      
      toast.success(`Welcome, ${patient.name}!`);
      
      fetchHistory(patient.patient_id, newToken);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('patientToken');
    setIsAuthenticated(false);
    setPatientInfo(null);
    setToken(null);
    setHistory(null);
    setOtpSent(false);
    setOtp('');
    setMobile('');
    
    // Also logout from global auth context
    if (authLogout) {
      authLogout();
    }
    
    toast.success('Logged out successfully');
  };
  
  const fetchHistory = async (patientId, authToken) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API}/patients/${patientId}/history`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put(`${API}/patients/${patientInfo.patient_id}/update`, {
        email: editForm.email,
        mobile: editForm.mobile
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPatientInfo(prev => ({ ...prev, email: editForm.email, mobile: editForm.mobile }));
      setEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };
  
  // Menu Items - Updated with enhancement features
  const menuItems = [
    { id: 'profile', icon: User, label: 'Profile Details', color: 'teal' },
    { id: 'health', icon: Heart, label: 'My Health', color: 'red', link: '/health-dashboard' },
    { id: 'family', icon: Users, label: 'Family Members', color: 'cyan', isNew: true },
    { id: 'appointments', icon: Calendar, label: 'My Appointments', color: 'indigo' },
    { id: 'prescriptions', icon: FileText, label: 'Prescriptions', color: 'emerald', isNew: true },
    { id: 'tests', icon: FlaskConical, label: 'My Lab Tests', color: 'purple' },
    { id: 'orders', icon: Pill, label: 'My Orders', color: 'orange' },
    { id: 'track', icon: Package, label: 'Track Orders', color: 'blue' },
    { id: 'payments', icon: CreditCard, label: 'Payment History', color: 'green', link: '/payment/history' },
    { id: 'loyalty', icon: Gift, label: 'Loyalty Points', color: 'pink' },
    { id: 'notifications', icon: Settings, label: 'Notifications', color: 'amber', isNew: true },
    { id: 'settings', icon: Settings, label: 'Settings', color: 'slate', link: '/settings' },
  ];
  
  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg text-teal-800">Patient Portal</h1>
                <p className="text-xs text-gray-500">Access your health records</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-md mx-auto px-4 py-12">
          <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <User className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">Welcome Back</h2>
              <p className="text-teal-100 mt-1">Login to view your health records</p>
            </div>
            
            <CardContent className="p-6 space-y-4">
              {!otpSent ? (
                <>
                  <div>
                    <Label className="text-gray-600">Mobile Number</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div className="flex items-center px-3 bg-gray-100 rounded-l-xl border border-r-0 border-gray-200">
                        <span className="text-gray-500">+91</span>
                      </div>
                      <Input
                        type="tel"
                        placeholder="Enter your mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="rounded-l-none rounded-r-xl h-12 text-lg"
                        data-testid="portal-mobile"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSendOtp}
                    disabled={loading || mobile.length < 10}
                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl text-lg"
                    data-testid="portal-send-otp"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                  </Button>
                  
                  <p className="text-center text-sm text-gray-500">
                    Not registered? Visit our clinic to create your patient profile.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <p className="text-gray-600">OTP sent to <strong>+91 {mobile}</strong></p>
                    <button 
                      onClick={() => { setOtpSent(false); setOtp(''); }}
                      className="text-teal-600 text-sm underline mt-1"
                    >
                      Change number
                    </button>
                  </div>
                  
                  {mockOtp && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-xs text-amber-700">Test OTP: <strong className="text-lg">{mockOtp}</strong></p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-gray-600">Enter OTP</Label>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-12 text-center text-2xl tracking-widest rounded-xl mt-1.5"
                      maxLength={6}
                      data-testid="portal-otp"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length < 6}
                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl text-lg"
                    data-testid="portal-verify-otp"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="w-full text-teal-600"
                  >
                    Resend OTP
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  // Dashboard Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-teal-800">My Profile</h1>
              <p className="text-xs text-gray-500">{patientInfo?.patient_id}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Patient Info Card */}
        <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{patientInfo?.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-teal-100 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {patientInfo?.mobile}
                  </span>
                  {patientInfo?.age && <span>• {patientInfo?.age} yrs</span>}
                  {patientInfo?.gender && <span>• {patientInfo?.gender}</span>}
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.link ? navigate(item.link) : setActiveSection(item.id)}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${
                activeSection === item.id 
                  ? `border-${item.color}-500 bg-${item.color}-50` 
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
              data-testid={`menu-${item.id}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                activeSection === item.id ? `bg-${item.color}-500` : 'bg-gray-100'
              }`}>
                <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <p className={`font-medium text-sm ${activeSection === item.id ? `text-${item.color}-700` : 'text-gray-700'}`}>
                {item.label}
              </p>
            </button>
          ))}
        </div>
        
        {/* Content Sections */}
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {/* Profile Details Section */}
            {activeSection === 'profile' && (
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-teal-700">
                    <User className="w-5 h-5" />
                    Profile Details
                  </CardTitle>
                  {!editingProfile ? (
                    <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingProfile(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="bg-teal-600 hover:bg-teal-700">
                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <Label className="text-xs text-gray-500">Full Name</Label>
                      <p className="font-semibold text-gray-800 mt-1">{patientInfo?.name}</p>
                      <p className="text-xs text-gray-400 mt-1">Name cannot be edited</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <Label className="text-xs text-gray-500">Patient ID</Label>
                      <p className="font-semibold text-gray-800 mt-1">{patientInfo?.patient_id}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <Label className="text-xs text-gray-500">Mobile Number</Label>
                      {editingProfile ? (
                        <Input 
                          value={editForm.mobile}
                          onChange={(e) => setEditForm(prev => ({ ...prev, mobile: e.target.value }))}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-semibold text-gray-800 mt-1 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {patientInfo?.mobile}
                        </p>
                      )}
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <Label className="text-xs text-gray-500">Email Address</Label>
                      {editingProfile ? (
                        <Input 
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email"
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-semibold text-gray-800 mt-1 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {patientInfo?.email || 'Not provided'}
                        </p>
                      )}
                    </div>
                    
                    {patientInfo?.age && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <Label className="text-xs text-gray-500">Age</Label>
                        <p className="font-semibold text-gray-800 mt-1">{patientInfo?.age} years</p>
                      </div>
                    )}
                    
                    {patientInfo?.gender && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <Label className="text-xs text-gray-500">Gender</Label>
                        <p className="font-semibold text-gray-800 mt-1 capitalize">{patientInfo?.gender}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* My Appointments Section */}
            {activeSection === 'appointments' && history && (
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-700">
                    <Calendar className="w-5 h-5" />
                    My Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-3 bg-indigo-50 rounded-xl text-center">
                      <p className="text-xl font-bold text-indigo-600">{history.summary.total_appointments || 0}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl text-center">
                      <p className="text-xl font-bold text-green-600">
                        {history.appointments.filter(a => a.status === 'Completed').length}
                      </p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-center">
                      <p className="text-xl font-bold text-blue-600">
                        {history.appointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length}
                      </p>
                      <p className="text-xs text-gray-500">Upcoming</p>
                    </div>
                  </div>
                  
                  {history.appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No appointments yet</p>
                      <Button className="mt-4" onClick={() => navigate('/diagyn')}>Book Appointment</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.appointments.map((apt, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border ${
                          apt.status === 'Completed' ? 'bg-gray-50 border-gray-100' : 'bg-indigo-50 border-indigo-100'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                apt.status === 'Completed' ? 'bg-green-100' : 'bg-indigo-100'
                              }`}>
                                <Stethoscope className={`w-5 h-5 ${
                                  apt.status === 'Completed' ? 'text-green-600' : 'text-indigo-600'
                                }`} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{apt.doctor}</p>
                                <p className="text-sm text-gray-500">{apt.clinic}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {apt.status === 'Confirmed' && apt.id && (
                                <AddToCalendarButton 
                                  appointmentId={apt.id} 
                                  variant="icon-only"
                                />
                              )}
                              <Badge className={
                                apt.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                                apt.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-indigo-100 text-indigo-700'
                              }>
                                {apt.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {apt.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {apt.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* My Lab Tests Section */}
            {activeSection === 'tests' && history && (
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <FlaskConical className="w-5 h-5" />
                    My Lab Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.diagnostic_orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No lab tests booked</p>
                      <Button className="mt-4" onClick={() => navigate('/proton')}>Book Lab Test</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.diagnostic_orders.map((order, idx) => (
                        <div key={idx} className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <FlaskConical className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Test Order #{idx + 1}</p>
                                <p className="text-xs text-gray-500">{order.created_at?.split('T')[0]}</p>
                              </div>
                            </div>
                            <Badge className={order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}>
                              {order.status}
                            </Badge>
                          </div>
                          {order.tests && (
                            <div className="mt-3 text-sm text-gray-600">
                              {order.tests.slice(0, 3).join(', ')}
                              {order.tests.length > 3 && ` +${order.tests.length - 3} more`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* My Orders Section (Pharmacy) */}
            {activeSection === 'orders' && history && (
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Pill className="w-5 h-5" />
                    My Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.pharmacy_orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No orders yet</p>
                      <Button className="mt-4" onClick={() => navigate('/orange')}>Order Medicines</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.pharmacy_orders.map((order, idx) => (
                        <div key={idx} className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Pill className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Order #{order.order_id || idx + 1}</p>
                                <p className="text-xs text-gray-500">{order.created_at?.split('T')[0]}</p>
                              </div>
                            </div>
                            <Badge className={
                              order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                              'bg-orange-100 text-orange-700'
                            }>
                              {order.status}
                            </Badge>
                          </div>
                          {order.items && (
                            <div className="text-sm text-gray-600">
                              {order.items.slice(0, 2).map((item, i) => (
                                <p key={i}>• {item.name} x {item.quantity}</p>
                              ))}
                              {order.items.length > 2 && (
                                <p className="text-gray-400">+{order.items.length - 2} more items</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Track Orders Section */}
            {activeSection === 'track' && history && (
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Package className="w-5 h-5" />
                    Track Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <Package className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                    <h3 className="font-semibold text-gray-800 mb-2">Track Your Orders</h3>
                    <p className="text-sm text-gray-500 mb-4">Enter your order ID to track delivery status</p>
                    <Button onClick={() => navigate('/track')} className="bg-blue-600 hover:bg-blue-700">
                      <Search className="w-4 h-4 mr-2" />
                      Go to Order Tracking
                    </Button>
                  </div>
                  
                  {/* Recent trackable orders */}
                  {history.pharmacy_orders.filter(o => o.status !== 'delivered').length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Active Orders</h4>
                      <div className="space-y-2">
                        {history.pharmacy_orders.filter(o => o.status !== 'delivered').slice(0, 3).map((order, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <span className="text-sm font-medium">Order #{order.order_id || idx + 1}</span>
                            <Badge className="bg-blue-100 text-blue-700">{order.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Loyalty Points Section - Enhanced */}
            {activeSection === 'loyalty' && (
              <LoyaltyPoints />
            )}
            
            {/* Family Hub Section - New */}
            {activeSection === 'family' && (
              <FamilyHub />
            )}
            
            {/* Prescriptions Section - New */}
            {activeSection === 'prescriptions' && (
              <PrescriptionWallet />
            )}
            
            {/* Notification Preferences Section - New */}
            {activeSection === 'notifications' && (
              <NotificationPreferences />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PatientPortal;
