import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Phone, Calendar, Loader2, LogOut,
  FileText, Pill, FlaskConical, Receipt, History, Clock,
  CheckCircle2, XCircle, AlertCircle, Download, Eye,
  Stethoscope, Building2, CreditCard, Shield
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const PatientPortal = () => {
  const navigate = useNavigate();
  
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
  
  // Check for existing session
  useEffect(() => {
    const savedToken = localStorage.getItem('patientToken');
    if (savedToken) {
      verifyToken(savedToken);
    }
  }, []);
  
  const verifyToken = async (savedToken) => {
    try {
      const response = await axios.get(`${API}/patients/portal/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });
      setPatientInfo(response.data);
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchHistory(response.data.patient_id, savedToken);
    } catch (error) {
      localStorage.removeItem('patientToken');
    }
  };
  
  const handleSendOtp = async () => {
    if (mobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/patients/portal/send-otp?mobile=${mobile}`);
      setOtpSent(true);
      setMockOtp(response.data.mock_otp || ''); // For testing
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
              <div>
                <h2 className="text-2xl font-bold">{patientInfo?.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-teal-100">
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
          
          {/* Quick Stats */}
          {history && (
            <div className="grid grid-cols-4 divide-x">
              {[
                { icon: Calendar, label: 'Appointments', count: history.summary.total_appointments, color: 'blue' },
                { icon: Pill, label: 'Prescriptions', count: history.appointments?.filter(a => a.prescription).length || 0, color: 'green' },
                { icon: FlaskConical, label: 'Lab Tests', count: history.summary.total_diagnostic_orders, color: 'purple' },
                { icon: Receipt, label: 'Bills', count: history.summary.total_bills, color: 'orange' }
              ].map((stat, idx) => (
                <div key={idx} className="p-4 text-center">
                  <stat.icon className={`w-6 h-6 mx-auto text-${stat.color}-500 mb-1`} />
                  <p className="text-2xl font-bold text-gray-800">{stat.count}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        
        {/* History Tabs */}
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : history ? (
          <Tabs defaultValue="appointments" className="space-y-4">
            <TabsList className="bg-white rounded-xl p-1 shadow-sm grid grid-cols-4 h-auto">
              <TabsTrigger value="appointments" className="rounded-lg py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Calendar className="w-4 h-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="rounded-lg py-3 data-[state=active]:bg-green-500 data-[state=active]:text-white">
                <Pill className="w-4 h-4 mr-2" />
                Prescriptions
              </TabsTrigger>
              <TabsTrigger value="lab-reports" className="rounded-lg py-3 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <FlaskConical className="w-4 h-4 mr-2" />
                Lab Reports
              </TabsTrigger>
              <TabsTrigger value="bills" className="rounded-lg py-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Receipt className="w-4 h-4 mr-2" />
                Bills
              </TabsTrigger>
            </TabsList>
            
            {/* Appointments Tab */}
            <TabsContent value="appointments">
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Calendar className="w-5 h-5" />
                    Appointment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No appointments found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.appointments.map((apt, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                              <Stethoscope className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{apt.doctor}</p>
                              <p className="text-sm text-gray-500 flex items-center gap-2">
                                <Building2 className="w-3 h-3" />
                                {apt.clinic}
                              </p>
                              <p className="text-sm text-gray-500 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {apt.date} at {apt.time}
                              </p>
                            </div>
                          </div>
                          <Badge className={`
                            ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : 
                              apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                              apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'}
                          `}>
                            {apt.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {apt.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                            {apt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Prescriptions Tab */}
            <TabsContent value="prescriptions">
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Pill className="w-5 h-5" />
                    Prescriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.pharmacy_orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No prescriptions found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.pharmacy_orders.map((order, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Pill className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">Order #{order.order_id || idx + 1}</p>
                                <p className="text-xs text-gray-500">{order.created_at?.split('T')[0]}</p>
                              </div>
                            </div>
                            <Badge className={`
                              ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                                order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'}
                            `}>
                              {order.status}
                            </Badge>
                          </div>
                          {order.items && (
                            <div className="text-sm text-gray-600">
                              {order.items.slice(0, 3).map((item, i) => (
                                <p key={i}>• {item.name} x {item.quantity}</p>
                              ))}
                              {order.items.length > 3 && (
                                <p className="text-gray-400">+{order.items.length - 3} more items</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Lab Reports Tab */}
            <TabsContent value="lab-reports">
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <FlaskConical className="w-5 h-5" />
                    Lab Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.diagnostic_orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No lab reports found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.diagnostic_orders.map((order, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <FlaskConical className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {order.tests?.join(', ') || 'Lab Test'}
                                </p>
                                <p className="text-xs text-gray-500">{order.created_at?.split('T')[0]}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`
                                ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'}
                              `}>
                                {order.status}
                              </Badge>
                              {order.report_url && (
                                <Button size="sm" variant="outline" className="rounded-lg">
                                  <Download className="w-4 h-4 mr-1" />
                                  Report
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Bills Tab */}
            <TabsContent value="bills">
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Receipt className="w-5 h-5" />
                    Billing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.bills.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No bills found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.bills.map((bill, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Receipt className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Bill #{bill.bill_number || idx + 1}</p>
                              <p className="text-xs text-gray-500">{bill.created_at?.split('T')[0]}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-800">₹{bill.amount || 0}</p>
                            <Badge className={bill.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {bill.paid ? 'Paid' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
        
        {/* Quick Actions */}
        <Card className="rounded-2xl shadow-lg border-0 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 rounded-xl flex flex-col items-center gap-2"
              onClick={() => navigate('/diagyn')}
            >
              <Calendar className="w-6 h-6 text-blue-500" />
              <span>Book Appointment</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 rounded-xl flex flex-col items-center gap-2"
              onClick={() => navigate('/pharmacy')}
            >
              <Pill className="w-6 h-6 text-orange-500" />
              <span>Order Medicines</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 rounded-xl flex flex-col items-center gap-2"
              onClick={() => navigate('/proton')}
            >
              <FlaskConical className="w-6 h-6 text-purple-500" />
              <span>Book Lab Test</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 rounded-xl flex flex-col items-center gap-2"
              onClick={() => navigate('/emergency')}
            >
              <AlertCircle className="w-6 h-6 text-red-500" />
              <span>Emergency</span>
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default PatientPortal;
