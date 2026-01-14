import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Fingerprint, CheckCircle, XCircle, Users, Calendar,
  LogIn, LogOut, AlertTriangle, TrendingUp
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function BiometricAttendance({ clinic = 'amnion' }) {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [showRegisterDevice, setShowRegisterDevice] = useState(false);
  
  // Registration form
  const [registerForm, setRegisterForm] = useState({
    staff_name: '',
    staff_id: '',
    role: 'receptionist'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        const [attendanceRes, reportRes] = await Promise.all([
          fetch(`${API}/api/biometric-attendance/daily-report?clinic=${clinic}&date=${today}`),
          fetch(`${API}/api/biometric-attendance/monthly-report?clinic=${clinic}&year=${year}&month=${month}`)
        ]);
        
        const attendanceData = await attendanceRes.json();
        const reportData = await reportRes.json();
        
        if (attendanceData.success) setTodayAttendance(attendanceData.attendance || []);
        if (reportData.success) setMonthlyReport(reportData);
      } catch (err) { console.error('Error loading data:', err); }
    };
    loadData();
  }, [clinic]);

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API}/api/biometric-attendance/daily-report?clinic=${clinic}&date=${today}`);
      const data = await res.json();
      if (data.success) setTodayAttendance(data.attendance || []);
    } catch (err) { console.error('Error fetching attendance:', err); }
  };

  const fetchMonthlyReport = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const res = await fetch(`${API}/api/biometric-attendance/monthly-report?clinic=${clinic}&year=${year}&month=${month}`);
      const data = await res.json();
      if (data.success) setMonthlyReport(data);
    } catch (err) { console.error('Error fetching monthly report:', err); }
  };

  const handleRegisterDevice = async () => {
    if (!registerForm.staff_name || !registerForm.staff_id) {
      toast.error('Please fill staff name and ID');
      return;
    }
    
    setLoading(true);
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        toast.error('Biometric authentication not supported on this device');
        setLoading(false);
        return;
      }

      // Create a credential (simplified - in production, use proper WebAuthn flow)
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "Nevika Cura", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(registerForm.staff_id),
            name: registerForm.staff_id,
            displayName: registerForm.staff_name
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000
        }
      });

      if (credential) {
        // Send to backend
        const res = await fetch(`${API}/api/biometric-attendance/register-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_id: registerForm.staff_id,
            staff_name: registerForm.staff_name,
            clinic: clinic,
            device_id: credential.id,
            credential_id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
            public_key: btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey ? credential.response.getPublicKey() : [])))
          })
        });
        
        const data = await res.json();
        if (data.success) {
          toast.success('Biometric device registered successfully!');
          setShowRegisterDevice(false);
          setRegisterForm({ staff_name: '', staff_id: '', role: 'receptionist' });
        } else {
          toast.error(data.detail || 'Registration failed');
        }
      }
    } catch (err) {
      console.error('Biometric error:', err);
      // Fallback for demo - register without actual biometric
      const res = await fetch(`${API}/api/biometric-attendance/register-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: registerForm.staff_id,
          staff_name: registerForm.staff_name,
          clinic: clinic,
          device_id: `demo_${Date.now()}`,
          credential_id: `cred_${registerForm.staff_id}`,
          public_key: 'demo_key'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Staff registered (demo mode)');
        setShowRegisterDevice(false);
      }
    }
    setLoading(false);
  };

  const handleMarkAttendance = async (staffId, type) => {
    setLoading(true);
    try {
      // Try biometric verification first
      let verified = false;
      
      if (window.PublicKeyCredential) {
        try {
          const credential = await navigator.credentials.get({
            publicKey: {
              challenge: new Uint8Array(32),
              timeout: 60000,
              userVerification: "required",
              rpId: window.location.hostname
            }
          });
          verified = !!credential;
        } catch (err) {
          console.log('Biometric verification skipped');
        }
      }
      
      const res = await fetch(`${API}/api/biometric-attendance/mark-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          clinic: clinic,
          type: type,
          biometric_verified: verified,
          device_info: navigator.userAgent
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (data.is_late) {
          toast.warning('Marked as late arrival');
        }
        fetchTodayAttendance();
        fetchMonthlyReport();
      } else {
        toast.error(data.detail || 'Failed to mark attendance');
      }
    } catch (err) { toast.error('Error marking attendance'); }
    setLoading(false);
  };

  const getStatusBadge = (record) => {
    if (!record.check_in) return <Badge variant="outline" className="text-gray-500">Absent</Badge>;
    if (record.is_late) return <Badge className="bg-amber-500">Late</Badge>;
    return <Badge className="bg-green-500">Present</Badge>;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold">Biometric Attendance</h2>
              <p className="text-violet-100">{clinic === 'amnion' ? 'Amnion Clinic' : 'Pushpa Clinic'}</p>
            </div>
          </div>
          <Button onClick={() => setShowRegisterDevice(true)} className="bg-white text-violet-600 hover:bg-violet-50">
            <Fingerprint className="w-4 h-4 mr-2" /> Register Staff
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {monthlyReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{monthlyReport.summary?.present_days || 0}</p>
              <p className="text-xs text-green-600">Present Days</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-none">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-amber-700">{monthlyReport.summary?.late_days || 0}</p>
              <p className="text-xs text-amber-600">Late Days</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-none">
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-700">{monthlyReport.summary?.absent_days || 0}</p>
              <p className="text-xs text-red-600">Absent Days</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{monthlyReport.summary?.attendance_rate || 0}%</p>
              <p className="text-xs text-blue-600">Attendance Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Attendance - {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayAttendance.length > 0 ? (
              todayAttendance.map((record, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium">{record.staff_name}</p>
                      <p className="text-xs text-gray-500">{record.staff_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Check In</p>
                      <p className="font-medium text-green-600">{formatTime(record.check_in)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Check Out</p>
                      <p className="font-medium text-red-600">{formatTime(record.check_out)}</p>
                    </div>
                    {getStatusBadge(record)}
                    <div className="flex gap-1">
                      {!record.check_in && (
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkAttendance(record.staff_id, 'check_in')}
                          className="bg-green-500 hover:bg-green-600"
                          disabled={loading}
                        >
                          <LogIn className="w-4 h-4" />
                        </Button>
                      )}
                      {record.check_in && !record.check_out && (
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkAttendance(record.staff_id, 'check_out')}
                          className="bg-red-500 hover:bg-red-600"
                          disabled={loading}
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Fingerprint className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">No attendance records for today</p>
                <p className="text-xs text-gray-400">Register staff members to start tracking attendance</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Check-in/out */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Quick Biometric Check-in/out
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input 
              placeholder="Enter Staff ID"
              value={selectedStaff || ''}
              onChange={e => setSelectedStaff(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => selectedStaff && handleMarkAttendance(selectedStaff, 'check_in')}
              className="bg-green-500 hover:bg-green-600"
              disabled={!selectedStaff || loading}
            >
              <LogIn className="w-4 h-4 mr-2" /> Check In
            </Button>
            <Button 
              onClick={() => selectedStaff && handleMarkAttendance(selectedStaff, 'check_out')}
              className="bg-red-500 hover:bg-red-600"
              disabled={!selectedStaff || loading}
            >
              <LogOut className="w-4 h-4 mr-2" /> Check Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Register Device Dialog */}
      {showRegisterDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Register Staff Biometric</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Staff Name *</Label>
                <Input 
                  value={registerForm.staff_name} 
                  onChange={e => setRegisterForm({...registerForm, staff_name: e.target.value})} 
                  placeholder="e.g., Amnion Receptionist"
                />
              </div>
              <div>
                <Label>Staff ID *</Label>
                <Input 
                  value={registerForm.staff_id} 
                  onChange={e => setRegisterForm({...registerForm, staff_id: e.target.value})} 
                  placeholder="e.g., staff_amnion_01"
                />
              </div>
              <div className="p-3 bg-violet-50 rounded-lg text-sm">
                <p className="font-medium text-violet-800">Instructions:</p>
                <p className="text-violet-600">Click Register and follow the biometric prompt (fingerprint/face ID) to register the staff device.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRegisterDevice(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleRegisterDevice} disabled={loading} className="flex-1">
                  <Fingerprint className="w-4 h-4 mr-2" /> Register
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
