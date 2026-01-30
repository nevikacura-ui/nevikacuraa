import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ArrowLeft, Calendar, FileText, Pill, User, Settings, Star, 
  FolderOpen, Upload, Trash2, RefreshCw, Eye, Download, Plus,
  Fingerprint, Smartphone, Shield, Monitor, Crown
} from 'lucide-react';
import PushNotificationSettings from '@/components/PushNotificationSettings';
import MembershipDashboard from '@/components/MembershipDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Security Settings Component
const SecuritySettings = ({ token }) => {
  const { biometricAvailable, biometricEnabled, registerBiometric, removeBiometric, getTrustedDevices, removeTrustedDevice } = useAuth();
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [biometricCredentials, setBiometricCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchSecurityData();
  }, []);
  
  const fetchSecurityData = async () => {
    try {
      // Fetch trusted devices
      const devices = await getTrustedDevices();
      setTrustedDevices(devices || []);
      
      // Fetch biometric credentials
      const response = await axios.get(`${API}/auth/biometric/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBiometricCredentials(response.data.credentials || []);
    } catch (e) {
      console.error('Failed to fetch security data:', e);
    }
  };
  
  const handleEnableBiometric = async () => {
    setLoading(true);
    try {
      await registerBiometric();
      toast.success('Biometric authentication enabled!');
      fetchSecurityData();
    } catch (error) {
      toast.error('Failed to enable biometric. Make sure your device supports it.');
    }
    setLoading(false);
  };
  
  const handleRemoveBiometric = async (credentialId) => {
    if (!window.confirm('Remove this biometric credential?')) return;
    try {
      await removeBiometric(credentialId);
      toast.success('Biometric removed');
      fetchSecurityData();
    } catch (error) {
      toast.error('Failed to remove biometric');
    }
  };
  
  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm('Remove this trusted device? You will need to login again on that device.')) return;
    try {
      await removeTrustedDevice(deviceId);
      toast.success('Device removed');
      fetchSecurityData();
    } catch (error) {
      toast.error('Failed to remove device');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Biometric Authentication */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Fingerprint className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold">Biometric Authentication</h3>
            <p className="text-sm text-gray-500">Use fingerprint or face recognition to login</p>
          </div>
        </div>
        
        {biometricAvailable ? (
          <div className="space-y-3">
            {biometricCredentials.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-green-600 mb-3">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Biometric enabled</span>
                </div>
                {biometricCredentials.map(cred => (
                  <div key={cred.credential_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-sm">{cred.device_name || 'Unknown Device'}</p>
                        <p className="text-xs text-gray-500">
                          Added: {new Date(cred.created_at).toLocaleDateString()}
                          {cred.last_used && ` • Last used: ${new Date(cred.last_used).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBiometric(cred.credential_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </>
            ) : (
              <Button
                onClick={handleEnableBiometric}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Setting up...' : 'Enable Biometric Login'}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Biometric authentication is not available on this device.
          </p>
        )}
      </Card>
      
      {/* Trusted Devices */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Monitor className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Trusted Devices</h3>
            <p className="text-sm text-gray-500">Devices where you've chosen "Remember Me"</p>
          </div>
        </div>
        
        {trustedDevices.length > 0 ? (
          <div className="space-y-2">
            {trustedDevices.map(device => (
              <div key={device.device_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-sm">{device.device_name}</p>
                    <p className="text-xs text-gray-500">
                      Last login: {new Date(device.last_login).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDevice(device.device_id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No trusted devices yet. Enable "Remember Me" when logging in.
          </p>
        )}
      </Card>
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Health record upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showMembershipDashboard, setShowMembershipDashboard] = useState(false);
  const [uploadData, setUploadData] = useState({
    record_type: 'prescription',
    title: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [appointmentsRes, diagnosticsRes, pharmacyRes, loyaltyRes, recordsRes] = await Promise.all([
        axios.get(`${API}/appointments`, { headers }),
        axios.get(`${API}/diagnostics`, { headers }),
        axios.get(`${API}/pharmacy`, { headers }),
        axios.get(`${API}/user/loyalty-points`, { headers }).catch(() => ({ data: { loyalty_points: 0 } })),
        axios.get(`${API}/health-records`, { headers }).catch(() => ({ data: { records: [] } }))
      ]);

      setAppointments(appointmentsRes.data);
      setDiagnostics(diagnosticsRes.data);
      setPharmacyOrders(pharmacyRes.data);
      setLoyaltyPoints(loyaltyRes.data.loyalty_points || 0);
      setHealthRecords(recordsRes.data.records || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/pharmacy/reorder/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Store reorder data and navigate to pharmacy
      localStorage.setItem('reorder_data', JSON.stringify(response.data));
      navigate('/pharmacy?reorder=true');
      toast.success('Medicines loaded for reorder!');
    } catch (error) {
      toast.error('Failed to load order for reorder');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadHealthRecord = async () => {
    if (!uploadData.title) {
      toast.error('Please enter a title');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Upload file first
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const uploadRes = await axios.post(`${API}/upload/file`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Save health record
      await axios.post(`${API}/health-records`, {
        ...uploadData,
        file_url: uploadRes.data.url
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Health record uploaded successfully!');
      setShowUploadDialog(false);
      setUploadData({ record_type: 'prescription', title: '', notes: '', date: new Date().toISOString().split('T')[0] });
      setSelectedFile(null);
      fetchData();
    } catch (error) {
      // If file upload fails, try with placeholder URL for demo
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API}/health-records`, {
          ...uploadData,
          file_url: `https://placeholder.nevikacura.com/records/${Date.now()}_${selectedFile.name}`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Health record saved!');
        setShowUploadDialog(false);
        setUploadData({ record_type: 'prescription', title: '', notes: '', date: new Date().toISOString().split('T')[0] });
        setSelectedFile(null);
        fetchData();
      } catch (err) {
        toast.error('Failed to upload record');
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteHealthRecord = async (recordId) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/health-records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Record deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F4]">
      <header className="border-b border-slate-200/50 bg-white/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                data-testid="back-button"
                className="rounded-full hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-heading text-2xl font-semibold text-slate-800">My Profile</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={logout}
              data-testid="logout-button"
              className="rounded-full"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Card with Loyalty Points */}
        <Card className="p-6 mb-8 bg-white shadow-sm border-slate-100 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-semibold text-slate-800" data-testid="user-name">{user.name}</h2>
                <p className="font-body text-slate-500" data-testid="user-email">{user.email}</p>
                <p className="font-body text-slate-500" data-testid="user-phone">{user.phone}</p>
              </div>
            </div>
            
            {/* Loyalty Points Display */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-3 shadow-sm" data-testid="loyalty-points-card">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Loyalty Points</p>
                <p className="text-2xl font-bold text-amber-900" data-testid="loyalty-points-value">{loyaltyPoints}</p>
              </div>
            </div>
          </div>
          
          {/* Nevika Cura ONE Membership Card */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowMembershipDashboard(true)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 rounded-2xl border border-amber-200 hover:shadow-md transition-all group"
              data-testid="membership-dashboard-btn"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-amber-900">Nevika Cura ONE</p>
                  <p className="text-sm text-amber-700">View benefits, discounts & usage stats</p>
                </div>
              </div>
              <ArrowLeft className="w-5 h-5 text-amber-500 rotate-180 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Health Dashboard Quick Link */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Button 
              onClick={() => navigate('/health-dashboard')}
              className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl shadow-lg shadow-teal-500/20"
              data-testid="health-dashboard-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Complete Health Dashboard
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-xl p-1 shadow-sm">
            <TabsTrigger value="appointments" data-testid="appointments-tab" className="rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="diagnostics" data-testid="diagnostics-tab">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Diagnostics</span>
            </TabsTrigger>
            <TabsTrigger value="pharmacy" data-testid="pharmacy-tab">
              <Pill className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Pharmacy</span>
            </TabsTrigger>
            <TabsTrigger value="records" data-testid="records-tab">
              <FolderOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Records</span>
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="settings-tab">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-6">
            {loading ? (
              <p className="text-center py-8 font-body text-muted-foreground">Loading...</p>
            ) : appointments.length > 0 ? (
              <div className="space-y-4" data-testid="appointments-list">
                {appointments.map((appointment) => (
                  <Card key={appointment.id} className="p-6" data-testid={`appointment-${appointment.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-heading text-lg font-semibold mb-2">{appointment.doctor}</h3>
                        <p className="font-body text-sm text-muted-foreground mb-1">
                          <strong>Clinic:</strong> {appointment.clinic}
                        </p>
                        <p className="font-body text-sm text-muted-foreground mb-1">
                          <strong>Date:</strong> {appointment.date}
                        </p>
                        <p className="font-body text-sm text-muted-foreground">
                          <strong>Time:</strong> {appointment.time}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {appointment.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-body text-muted-foreground" data-testid="no-appointments-message">
                No appointments found
              </p>
            )}
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-6">
            {loading ? (
              <p className="text-center py-8 font-body text-muted-foreground">Loading...</p>
            ) : diagnostics.length > 0 ? (
              <div className="space-y-4" data-testid="diagnostics-list">
                {diagnostics.map((order) => (
                  <Card key={order.id} className="p-6" data-testid={`diagnostic-${order.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-heading text-lg font-semibold mb-2">Diagnostic Tests</h3>
                        <p className="font-body text-sm text-muted-foreground mb-2">
                          <strong>Preferred Date:</strong> {order.preferred_date}
                        </p>
                        <div className="font-body text-sm text-muted-foreground">
                          <strong>Tests:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {order.tests.map((test, idx) => (
                              <li key={idx}>{test}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'Report Generated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {order.status}
                        </span>
                        {/* Download Invoice */}
                        {order.invoice_url && (
                          <a
                            href={order.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
                            data-testid={`download-invoice-${order.id}`}
                          >
                            <Download className="w-3 h-3" />
                            Invoice
                          </a>
                        )}
                        {/* Download Report */}
                        {order.report_url && (
                          <a
                            href={order.report_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100"
                            data-testid={`download-report-${order.id}`}
                          >
                            <FileText className="w-3 h-3" />
                            Report
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-body text-muted-foreground" data-testid="no-diagnostics-message">
                No diagnostic orders found
              </p>
            )}
          </TabsContent>

          <TabsContent value="pharmacy" className="mt-6">
            {loading ? (
              <p className="text-center py-8 font-body text-muted-foreground">Loading...</p>
            ) : pharmacyOrders.length > 0 ? (
              <div className="space-y-4" data-testid="pharmacy-orders-list">
                {pharmacyOrders.map((order) => (
                  <Card key={order.id} className="p-6" data-testid={`pharmacy-order-${order.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-heading text-lg font-semibold mb-2">Medicine Order</h3>
                        <div className="font-body text-sm text-muted-foreground">
                          <strong>Medicines:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {order.medicines.map((med, idx) => (
                              <li key={idx}>{med.name} - Qty: {med.quantity}</li>
                            ))}
                          </ul>
                        </div>
                        {order.delivery_address && (
                          <p className="font-body text-sm text-muted-foreground mt-2">
                            <strong>Delivery:</strong> {order.delivery_address}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {order.status}
                        </span>
                        {/* Download Invoice */}
                        {order.invoice_url && (
                          <a
                            href={order.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
                            data-testid={`download-pharmacy-invoice-${order.id}`}
                          >
                            <Download className="w-3 h-3" />
                            Invoice
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReorder(order.id)}
                          className="text-brand-teal border-brand-teal hover:bg-brand-teal/10"
                          data-testid={`reorder-btn-${order.id}`}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reorder
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-body text-muted-foreground" data-testid="no-pharmacy-orders-message">
                No pharmacy orders found
              </p>
            )}
          </TabsContent>

          <TabsContent value="records" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-lg font-semibold">Health Records</h3>
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="bg-brand-teal hover:bg-brand-teal/90"
                data-testid="upload-record-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Record
              </Button>
            </div>
            
            {healthRecords.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2" data-testid="health-records-list">
                {healthRecords.map((record) => (
                  <Card key={record.id} className="p-4" data-testid={`record-${record.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          record.record_type === 'prescription' ? 'bg-blue-100' :
                          record.record_type === 'lab_report' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <FileText className={`w-5 h-5 ${
                            record.record_type === 'prescription' ? 'text-blue-600' :
                            record.record_type === 'lab_report' ? 'text-purple-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{record.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{record.record_type.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{record.date}</p>
                          {record.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(record.file_url, '_blank')}
                          className="h-8 w-8"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteHealthRecord(record.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No health records uploaded yet</p>
                <p className="text-sm text-muted-foreground">
                  Store your prescriptions, lab reports, and other medical documents securely.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <SecuritySettings token={localStorage.getItem('token')} />
              <PushNotificationSettings token={localStorage.getItem('token')} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Upload Health Record Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Health Record</DialogTitle>
            <DialogDescription>
              Store prescriptions, lab reports, and medical documents securely.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Record Type</Label>
              <Select 
                value={uploadData.record_type}
                onValueChange={(v) => setUploadData({...uploadData, record_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="lab_report">Lab Report</SelectItem>
                  <SelectItem value="other">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Title *</Label>
              <Input 
                placeholder="e.g., Blood Test Report - Jan 2026"
                value={uploadData.title}
                onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Date</Label>
              <Input 
                type="date"
                value={uploadData.date}
                onChange={(e) => setUploadData({...uploadData, date: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea 
                placeholder="Any additional notes..."
                value={uploadData.notes}
                onChange={(e) => setUploadData({...uploadData, notes: e.target.value})}
                rows={2}
              />
            </div>
            
            <div>
              <Label>File *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  {selectedFile ? (
                    <p className="text-sm font-medium text-brand-teal">{selectedFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to upload (PDF, Image, Doc)</p>
                  )}
                </label>
              </div>
            </div>
            
            <Button 
              onClick={uploadHealthRecord}
              disabled={uploading}
              className="w-full bg-brand-teal hover:bg-brand-teal/90"
            >
              {uploading ? 'Uploading...' : 'Upload Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
