import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Heart, Plus, Search, Calendar, Baby,
  Phone, User, MapPin, Activity, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ANCRegistration({ staffName = 'Staff', clinic = 'amnion' }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [kickCounts, setKickCounts] = useState([]);
  
  // Dialogs
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showKickCountDialog, setShowKickCountDialog] = useState(false);
  
  // Form
  const [registerForm, setRegisterForm] = useState({
    patient_name: '',
    age: '',
    phone: '',
    email: '',
    address: '',
    husband_name: '',
    lmp: '',
    gravida: 1,
    para: 0,
    abortion: 0,
    living: 0,
    blood_group: '',
    clinic: clinic,
    registered_by: staffName
  });
  
  const [kickCountForm, setKickCountForm] = useState({
    count: '',
    duration_minutes: 60,
    notes: ''
  });

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await fetch(`${API}/api/anc/patients?clinic=${clinic}`);
        const data = await res.json();
        if (data.success) setPatients(data.patients || []);
      } catch (err) { console.error('Error fetching patients:', err); }
    };
    loadPatients();
  }, [clinic]);

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API}/api/anc/patients?clinic=${clinic}`);
      const data = await res.json();
      if (data.success) setPatients(data.patients || []);
    } catch (err) { console.error('Error fetching patients:', err); }
  };

  const fetchPatientDetails = async (registrationId) => {
    try {
      const res = await fetch(`${API}/api/anc/patient/${registrationId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedPatient(data.patient);
        fetchKickCounts(registrationId);
      }
    } catch (err) { console.error('Error fetching patient:', err); }
  };

  const fetchKickCounts = async (registrationId) => {
    try {
      const res = await fetch(`${API}/api/anc/kick-counts/${registrationId}`);
      const data = await res.json();
      if (data.success) setKickCounts(data.kick_counts || []);
    } catch (err) { console.error('Error fetching kick counts:', err); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPatients();
      return;
    }
    try {
      const res = await fetch(`${API}/api/anc/search?query=${encodeURIComponent(searchQuery)}&clinic=${clinic}`);
      const data = await res.json();
      if (data.success) setPatients(data.results || []);
    } catch (err) { toast.error('Search failed'); }
  };

  const handleRegister = async () => {
    if (!registerForm.patient_name || !registerForm.phone || !registerForm.lmp) {
      toast.error('Please fill required fields (Name, Phone, LMP)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/anc/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerForm,
          age: parseInt(registerForm.age) || 0,
          gravida: parseInt(registerForm.gravida) || 1,
          para: parseInt(registerForm.para) || 0,
          abortion: parseInt(registerForm.abortion) || 0,
          living: parseInt(registerForm.living) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Patient registered! ID: ${data.registration_id}`);
        setShowRegisterDialog(false);
        setRegisterForm({
          patient_name: '', age: '', phone: '', email: '', address: '', husband_name: '',
          lmp: '', gravida: 1, para: 0, abortion: 0, living: 0, blood_group: '',
          clinic: clinic, registered_by: staffName
        });
        fetchPatients();
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) { toast.error('Error registering patient'); }
    setLoading(false);
  };

  const handleAddKickCount = async () => {
    if (!selectedPatient || !kickCountForm.count) {
      toast.error('Please enter kick count');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/anc/kick-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: selectedPatient.registration_id,
          count: parseInt(kickCountForm.count),
          duration_minutes: parseInt(kickCountForm.duration_minutes),
          notes: kickCountForm.notes,
          recorded_by: staffName
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (data.alert) {
          toast.warning(data.alert, { duration: 5000 });
        }
        setShowKickCountDialog(false);
        setKickCountForm({ count: '', duration_minutes: 60, notes: '' });
        fetchKickCounts(selectedPatient.registration_id);
      }
    } catch (err) { toast.error('Error adding kick count'); }
    setLoading(false);
  };

  const getGestationalDisplay = (patient) => {
    if (!patient?.gestational_age) return 'Unknown';
    const { weeks, days } = patient.gestational_age;
    return `${weeks}w ${days}d`;
  };

  const getTrimester = (weeks) => {
    if (weeks < 13) return { label: '1st Trimester', color: 'bg-blue-500' };
    if (weeks < 27) return { label: '2nd Trimester', color: 'bg-green-500' };
    return { label: '3rd Trimester', color: 'bg-purple-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold">ANC Registration</h2>
              <p className="text-pink-100">Antenatal Care Management - {clinic === 'amnion' ? 'Amnion Clinic' : 'Pushpa Clinic'}</p>
            </div>
          </div>
          <Button onClick={() => setShowRegisterDialog(true)} className="bg-white text-pink-600 hover:bg-pink-50">
            <Plus className="w-4 h-4 mr-2" /> Register Patient
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search by name, phone, or registration ID..." 
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
          <CardHeader><CardTitle className="text-lg">ANC Patients ({patients.length})</CardTitle></CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
            {patients.map(patient => {
              const trimester = patient.gestational_age ? getTrimester(patient.gestational_age.weeks) : null;
              return (
                <div 
                  key={patient.registration_id}
                  onClick={() => fetchPatientDetails(patient.registration_id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedPatient?.registration_id === patient.registration_id 
                      ? 'bg-pink-100 border-2 border-pink-500' 
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{patient.patient_name}</p>
                      <p className="text-xs text-gray-500">{patient.registration_id}</p>
                    </div>
                    {trimester && (
                      <Badge className={`${trimester.color} text-white text-xs`}>
                        {getGestationalDisplay(patient)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone}</span>
                    {patient.edd && (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> EDD: {patient.edd}</span>
                    )}
                  </div>
                </div>
              );
            })}
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
                    <p className="text-sm text-gray-500">{selectedPatient.registration_id}</p>
                  </div>
                  {selectedPatient.gestational_age && (
                    <Badge className={`${getTrimester(selectedPatient.gestational_age.weeks).color} text-white`}>
                      {getTrimester(selectedPatient.gestational_age.weeks).label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pregnancy Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-pink-50 rounded-lg text-center">
                    <Baby className="w-6 h-6 mx-auto text-pink-500 mb-1" />
                    <p className="text-lg font-bold text-pink-700">{getGestationalDisplay(selectedPatient)}</p>
                    <p className="text-xs text-pink-600">Gestational Age</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center">
                    <Calendar className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                    <p className="text-lg font-bold text-purple-700">{selectedPatient.edd || 'N/A'}</p>
                    <p className="text-xs text-purple-600">EDD</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <Activity className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-bold text-blue-700">G{selectedPatient.gravida}P{selectedPatient.para}A{selectedPatient.abortion}L{selectedPatient.living}</p>
                    <p className="text-xs text-blue-600">Obstetric History</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <Heart className="w-6 h-6 mx-auto text-red-500 mb-1" />
                    <p className="text-lg font-bold text-red-700">{selectedPatient.blood_group || 'N/A'}</p>
                    <p className="text-xs text-red-600">Blood Group</p>
                  </div>
                </div>

                {/* Patient Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-xs">Husband</p>
                      <p className="font-medium">{selectedPatient.husband_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-xs">Phone</p>
                      <p className="font-medium">{selectedPatient.phone}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded flex items-center gap-2 col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-xs">Address</p>
                      <p className="font-medium">{selectedPatient.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => setShowKickCountDialog(true)} className="flex-1 bg-pink-600 hover:bg-pink-700">
                    <Baby className="w-4 h-4 mr-2" /> Add Kick Count
                  </Button>
                  <Button onClick={() => setShowVisitDialog(true)} variant="outline" className="flex-1">
                    <FileText className="w-4 h-4 mr-2" /> Add Visit
                  </Button>
                </div>

                {/* Kick Count History */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Kick Count History
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {kickCounts.map((kick, idx) => (
                      <div key={idx} className={`flex items-center gap-3 p-2 rounded ${
                        kick.count < 10 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                      }`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          kick.count < 10 ? 'bg-red-500' : 'bg-green-500'
                        } text-white font-bold`}>
                          {kick.count}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{kick.count} kicks in {kick.duration_minutes} min</span>
                            <span className="text-xs text-gray-500">{kick.date}</span>
                          </div>
                          {kick.count < 10 && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Below normal - consult doctor
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {kickCounts.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No kick counts recorded yet</p>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register New ANC Patient</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient Name *</Label>
                <Input value={registerForm.patient_name} onChange={e => setRegisterForm({...registerForm, patient_name: e.target.value})} />
              </div>
              <div>
                <Label>Age</Label>
                <Input type="number" value={registerForm.age} onChange={e => setRegisterForm({...registerForm, age: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone *</Label>
                <Input value={registerForm.phone} onChange={e => setRegisterForm({...registerForm, phone: e.target.value})} />
              </div>
              <div>
                <Label>Husband Name</Label>
                <Input value={registerForm.husband_name} onChange={e => setRegisterForm({...registerForm, husband_name: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={registerForm.address} onChange={e => setRegisterForm({...registerForm, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>LMP (Last Menstrual Period) *</Label>
                <Input type="date" value={registerForm.lmp} onChange={e => setRegisterForm({...registerForm, lmp: e.target.value})} />
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select value={registerForm.blood_group} onValueChange={v => setRegisterForm({...registerForm, blood_group: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label>Gravida</Label>
                <Input type="number" min="1" value={registerForm.gravida} onChange={e => setRegisterForm({...registerForm, gravida: e.target.value})} />
              </div>
              <div>
                <Label>Para</Label>
                <Input type="number" min="0" value={registerForm.para} onChange={e => setRegisterForm({...registerForm, para: e.target.value})} />
              </div>
              <div>
                <Label>Abortion</Label>
                <Input type="number" min="0" value={registerForm.abortion} onChange={e => setRegisterForm({...registerForm, abortion: e.target.value})} />
              </div>
              <div>
                <Label>Living</Label>
                <Input type="number" min="0" value={registerForm.living} onChange={e => setRegisterForm({...registerForm, living: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={loading}>Register Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kick Count Dialog */}
      <Dialog open={showKickCountDialog} onOpenChange={setShowKickCountDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Kick Count - {selectedPatient?.patient_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-pink-50 rounded-lg text-sm">
              <p className="font-medium text-pink-800">Kick Counter Instructions:</p>
              <p className="text-pink-600">Count baby kicks for 1 hour. Normal is 10+ kicks per hour.</p>
              <p className="text-pink-600">If less than 10, try eating something sweet and recount.</p>
            </div>
            <div>
              <Label>Number of Kicks *</Label>
              <Input type="number" min="0" value={kickCountForm.count} onChange={e => setKickCountForm({...kickCountForm, count: e.target.value})} placeholder="e.g., 12" />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Select value={String(kickCountForm.duration_minutes)} onValueChange={v => setKickCountForm({...kickCountForm, duration_minutes: parseInt(v)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={kickCountForm.notes} onChange={e => setKickCountForm({...kickCountForm, notes: e.target.value})} placeholder="Any observations..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKickCountDialog(false)}>Cancel</Button>
            <Button onClick={handleAddKickCount} disabled={loading}>Save Kick Count</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
