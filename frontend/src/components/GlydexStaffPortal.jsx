import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Activity, Users, Plus, Search, TrendingUp, TrendingDown,
  Phone, Droplet, Heart, Send, Mail, MessageSquare, FileText, CheckCircle2, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function GlydexStaffPortal({ staffName = 'Staff', clinic = 'Pushpa Clinic', doctor = 'Dr. Vikas Jha' }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  
  // Diabetes Forms list
  const [diabetesForms, setDiabetesForms] = useState([]);
  const [formCounts, setFormCounts] = useState({ total: 0, allotted: 0, filled: 0 });
  
  // Dialogs
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showSugarLogDialog, setShowSugarLogDialog] = useState(false);
  const [showHba1cDialog, setShowHba1cDialog] = useState(false);
  const [showSendFormDialog, setShowSendFormDialog] = useState(false);
  
  // Send Form state
  const [sendFormData, setSendFormData] = useState({
    patient_name: '',
    patient_phone: '',
    patient_email: '',
    send_via: 'both'
  });
  const [sendingForm, setSendingForm] = useState(false);
  
  // Forms
  const [registerForm, setRegisterForm] = useState({
    patient_name: '',
    age: '',
    phone: '',
    email: '',
    diabetes_type: 'type2',
    doctor_assigned: 'Dr. Vikas',
    clinic: clinic,
    send_congratulations: true,
    registered_by: staffName
  });
  
  const [sugarLogForm, setSugarLogForm] = useState({
    type: 'fbs',
    value: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: ''
  });
  
  const [hba1cForm, setHba1cForm] = useState({
    value: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patientsRes, summaryRes] = await Promise.all([
          fetch(`${API}/api/glydex/staff/patients`),
          fetch(`${API}/api/glydex/staff/reports/summary`)
        ]);
        const patientsData = await patientsRes.json();
        const summaryData = await summaryRes.json();
        if (patientsData.success) setPatients(patientsData.patients || []);
        if (summaryData.success) setSummary(summaryData.summary);
      } catch (err) { console.error('Error loading data:', err); }
    };
    loadData();
    fetchDiabetesForms();
  }, []);

  const fetchDiabetesForms = async () => {
    try {
      const res = await fetch(`${API}/api/glydex/forms/list?clinic=${clinic}`);
      const data = await res.json();
      if (data.success) {
        setDiabetesForms(data.forms || []);
        setFormCounts(data.counts || { total: 0, allotted: 0, filled: 0 });
      }
    } catch (err) { console.error('Error fetching diabetes forms:', err); }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API}/api/glydex/staff/patients`);
      const data = await res.json();
      if (data.success) setPatients(data.patients || []);
    } catch (err) { console.error('Error fetching patients:', err); }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API}/api/glydex/staff/reports/summary`);
      const data = await res.json();
      if (data.success) setSummary(data.summary);
    } catch (err) { console.error('Error fetching summary:', err); }
  };

  const fetchPatientDetails = async (patientId) => {
    try {
      const res = await fetch(`${API}/api/glydex/staff/patients/${patientId}`);
      const data = await res.json();
      if (data.success) setSelectedPatient(data.patient);
    } catch (err) { console.error('Error fetching patient:', err); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPatients();
      return;
    }
    try {
      const res = await fetch(`${API}/api/glydex/staff/patients/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setPatients(data.results || []);
    } catch (err) { toast.error('Search failed'); }
  };

  const handleRegister = async () => {
    if (!registerForm.patient_name || !registerForm.phone || !registerForm.age) {
      toast.error('Please fill required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/glydex/staff/patients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registerForm, age: parseInt(registerForm.age) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Patient registered! ID: ${data.patient_id}`);
        setShowRegisterDialog(false);
        setRegisterForm({
          patient_name: '', age: '', phone: '', email: '', diabetes_type: 'type2',
          doctor_assigned: 'Dr. Vikas', send_congratulations: true, registered_by: staffName
        });
        fetchPatients();
        fetchSummary();
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) { toast.error('Error registering patient'); }
    setLoading(false);
  };

  const handleAddSugarLog = async () => {
    if (!selectedPatient || !sugarLogForm.value) {
      toast.error('Please enter sugar value');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/glydex/staff/patients/${selectedPatient.patient_id}/sugar-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          ...sugarLogForm,
          value: parseInt(sugarLogForm.value),
          recorded_by: staffName
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (data.congratulations_sent) {
          toast.success('Congratulatory message sent to patient!', { icon: '🎉' });
        }
        setShowSugarLogDialog(false);
        setSugarLogForm({ type: 'fbs', value: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), notes: '' });
        fetchPatientDetails(selectedPatient.patient_id);
      }
    } catch (err) { toast.error('Error adding sugar log'); }
    setLoading(false);
  };

  const handleAddHba1c = async () => {
    if (!selectedPatient || !hba1cForm.value) {
      toast.error('Please enter HbA1c value');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/glydex/staff/patients/${selectedPatient.patient_id}/hba1c?value=${hba1cForm.value}&date=${hba1cForm.date}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (data.congratulations_sent) {
          toast.success('Congratulatory message sent for great HbA1c!', { icon: '🎉' });
        }
        setShowHba1cDialog(false);
        setHba1cForm({ value: '', date: new Date().toISOString().split('T')[0] });
        fetchPatientDetails(selectedPatient.patient_id);
      }
    } catch (err) { toast.error('Error adding HbA1c'); }
    setLoading(false);
  };

  const toggleCongratulations = async (patientId, enabled) => {
    try {
      const res = await fetch(`${API}/api/glydex/staff/patients/${patientId}/congratulations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, enabled })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (selectedPatient) fetchPatientDetails(patientId);
      }
    } catch (err) { toast.error('Error updating setting'); }
  };

  const getSugarStatus = (type, value) => {
    if (type === 'fbs') {
      if (value < 100) return { status: 'Excellent', color: 'bg-green-500' };
      if (value < 126) return { status: 'Good', color: 'bg-yellow-500' };
      return { status: 'High', color: 'bg-red-500' };
    }
    if (type === 'ppbs') {
      if (value < 140) return { status: 'Excellent', color: 'bg-green-500' };
      if (value < 200) return { status: 'Good', color: 'bg-yellow-500' };
      return { status: 'High', color: 'bg-red-500' };
    }
    return { status: 'Unknown', color: 'bg-gray-500' };
  };

  // Send Diabetes Form Link
  const handleSendForm = async () => {
    if (!sendFormData.patient_name || !sendFormData.patient_phone) {
      toast.error('Please enter patient name and phone');
      return;
    }
    
    setSendingForm(true);
    try {
      const res = await fetch(`${API}/api/glydex/form/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sendFormData,
          clinic: clinic,
          doctor: doctor
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Diabetes form link sent to ${sendFormData.patient_name}!`);
        setShowSendFormDialog(false);
        setSendFormData({ patient_name: '', patient_phone: '', patient_email: '', send_via: 'both' });
        fetchDiabetesForms();
      } else {
        toast.error(data.error || 'Failed to send form');
      }
    } catch (err) {
      toast.error('Failed to send form link');
    }
    setSendingForm(false);
  };

  // Get form status badge
  const getFormStatusBadge = (status) => {
    if (status === 'filled') {
      return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Form Filled</Badge>;
    }
    return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Form Allotted</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold">Glydex Staff Portal</h2>
              <p className="text-emerald-100">Diabetes Patient Management - {doctor}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowSendFormDialog(true)} variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
              <Send className="w-4 h-4 mr-2" /> Send Form Link
            </Button>
            <Button onClick={() => setShowRegisterDialog(true)} className="bg-white text-emerald-600 hover:bg-emerald-50">
              <Plus className="w-4 h-4 mr-2" /> Register Patient
            </Button>
          </div>
        </div>
        
        {/* Form Stats */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Forms Sent: <strong>{formCounts.total}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-yellow-200">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Pending: <strong>{formCounts.allotted}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Filled: <strong>{formCounts.filled}</strong></span>
          </div>
        </div>
      </div>

      {/* Diabetes Forms Status Section */}
      {diabetesForms.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Diabetes Form Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 max-h-[200px] overflow-y-auto">
              {diabetesForms.slice(0, 10).map(form => (
                <div key={form.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  form.status === 'filled' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{form.patient_name}</p>
                      <p className="text-sm text-gray-500">{form.patient_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFormStatusBadge(form.status)}
                    <span className="text-xs text-gray-400">
                      {new Date(form.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{summary.total_patients}</p>
              <p className="text-xs text-blue-600">Total Patients</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none">
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{summary.controlled}</p>
              <p className="text-xs text-green-600">Controlled (HbA1c &lt;7%)</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-none">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-700">{summary.uncontrolled}</p>
              <p className="text-xs text-red-600">Uncontrolled</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-none">
            <CardContent className="p-4 text-center">
              <Heart className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-700">{summary.control_rate}%</p>
              <p className="text-xs text-purple-600">Control Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search by name, phone, or patient ID..." 
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Patient List */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-lg">Patients ({patients.length})</CardTitle></CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
            {patients.map(patient => (
              <div 
                key={patient.patient_id}
                onClick={() => fetchPatientDetails(patient.patient_id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedPatient?.patient_id === patient.patient_id 
                    ? 'bg-emerald-100 border-2 border-emerald-500' 
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{patient.patient_name}</p>
                    <p className="text-xs text-gray-500">{patient.patient_id}</p>
                  </div>
                  <Badge variant={patient.diabetes_type === 'type1' ? 'destructive' : 'secondary'}>
                    {patient.diabetes_type}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone}</span>
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <p className="text-center text-gray-500 py-8">No patients found</p>
            )}
          </CardContent>
        </Card>

        {/* Patient Details */}
        <Card className="md:col-span-2">
          {selectedPatient ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedPatient.patient_name}</CardTitle>
                    <p className="text-sm text-gray-500">{selectedPatient.patient_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Auto Congrats</Label>
                    <Switch 
                      checked={selectedPatient.send_congratulations}
                      onCheckedChange={(checked) => toggleCongratulations(selectedPatient.patient_id, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Patient Info */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-gray-500">Age</p>
                    <p className="font-medium">{selectedPatient.age} years</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium capitalize">{selectedPatient.diabetes_type}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-gray-500">Doctor</p>
                    <p className="font-medium">{selectedPatient.doctor_assigned}</p>
                  </div>
                </div>

                {/* Stats */}
                {selectedPatient.stats && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedPatient.stats.fbs_avg || '--'}</p>
                      <p className="text-xs text-blue-600">Avg FBS</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-amber-600">{selectedPatient.stats.ppbs_avg || '--'}</p>
                      <p className="text-xs text-amber-600">Avg PPBS</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedPatient.stats.last_hba1c?.value || '--'}%</p>
                      <p className="text-xs text-purple-600">Last HbA1c</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => setShowSugarLogDialog(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <Droplet className="w-4 h-4 mr-2" /> Add Sugar Log
                  </Button>
                  <Button onClick={() => setShowHba1cDialog(true)} variant="outline" className="flex-1">
                    Add HbA1c
                  </Button>
                </div>

                {/* Recent Logs */}
                <div>
                  <h4 className="font-medium mb-2">Recent Sugar Logs</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPatient.sugar_logs?.slice(-10).reverse().map((log, idx) => {
                      const status = getSugarStatus(log.type, log.value);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className={`w-2 h-8 rounded ${status.color}`} />
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="font-medium">{log.value} mg/dL</span>
                              <span className="text-xs text-gray-500">{log.date}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span className="uppercase">{log.type}</span>
                              <span>{status.status}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(!selectedPatient.sugar_logs || selectedPatient.sugar_logs.length === 0) && (
                      <p className="text-center text-gray-500 py-4">No sugar logs yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-96 text-gray-500">
              Select a patient to view details
            </CardContent>
          )}
        </Card>
      </div>

      {/* Register Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register New Diabetes Patient</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Patient Name *</Label>
              <Input value={registerForm.patient_name} onChange={e => setRegisterForm({...registerForm, patient_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Age *</Label>
                <Input type="number" value={registerForm.age} onChange={e => setRegisterForm({...registerForm, age: e.target.value})} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input value={registerForm.phone} onChange={e => setRegisterForm({...registerForm, phone: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} />
            </div>
            <div>
              <Label>Diabetes Type</Label>
              <Select value={registerForm.diabetes_type} onValueChange={v => setRegisterForm({...registerForm, diabetes_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="type1">Type 1</SelectItem>
                  <SelectItem value="type2">Type 2</SelectItem>
                  <SelectItem value="gestational">Gestational</SelectItem>
                  <SelectItem value="prediabetic">Pre-diabetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Send Congratulatory Messages</Label>
              <Switch checked={registerForm.send_congratulations} onCheckedChange={checked => setRegisterForm({...registerForm, send_congratulations: checked})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={loading}>Register Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sugar Log Dialog */}
      <Dialog open={showSugarLogDialog} onOpenChange={setShowSugarLogDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Sugar Log - {selectedPatient?.patient_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={sugarLogForm.type} onValueChange={v => setSugarLogForm({...sugarLogForm, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fbs">FBS (Fasting)</SelectItem>
                  <SelectItem value="ppbs">PPBS (Post Meal)</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value (mg/dL)</Label>
              <Input type="number" value={sugarLogForm.value} onChange={e => setSugarLogForm({...sugarLogForm, value: e.target.value})} placeholder="e.g., 110" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={sugarLogForm.date} onChange={e => setSugarLogForm({...sugarLogForm, date: e.target.value})} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={sugarLogForm.time} onChange={e => setSugarLogForm({...sugarLogForm, time: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={sugarLogForm.notes} onChange={e => setSugarLogForm({...sugarLogForm, notes: e.target.value})} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSugarLogDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSugarLog} disabled={loading}>Save Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HbA1c Dialog */}
      <Dialog open={showHba1cDialog} onOpenChange={setShowHba1cDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add HbA1c Result - {selectedPatient?.patient_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>HbA1c Value (%)</Label>
              <Input type="number" step="0.1" value={hba1cForm.value} onChange={e => setHba1cForm({...hba1cForm, value: e.target.value})} placeholder="e.g., 6.5" />
            </div>
            <div>
              <Label>Test Date</Label>
              <Input type="date" value={hba1cForm.date} onChange={e => setHba1cForm({...hba1cForm, date: e.target.value})} />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="font-medium text-blue-800">HbA1c Reference:</p>
              <p className="text-blue-600">&lt;5.7% Normal | 5.7-6.4% Pre-diabetes | &gt;6.5% Diabetes</p>
              <p className="text-blue-600">Target for diabetics: &lt;7%</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHba1cDialog(false)}>Cancel</Button>
            <Button onClick={handleAddHba1c} disabled={loading}>Save HbA1c</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
