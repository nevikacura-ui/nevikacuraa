import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  User, Search, Loader2, Phone, Calendar, Clock, 
  Edit2, Save, X, History, FileText, Heart, Activity 
} from 'lucide-react';
import { PatientLookup, PatientRegistrationDialog } from '@/components/PatientRegistration';
import { 
  API, getAuthHeaders, formatIndianDate 
} from '@/pages/staff/staffUtils';

const PatientsTab = ({ 
  staffInfo,
  setPatientRegisterMobile,
  setPatientRegisterType,
  setShowPatientRegisterDialog
}) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [visitHistory, setVisitHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch patients
  const fetchPatients = async (query = '') => {
    setLoading(true);
    try {
      const endpoint = query 
        ? `${API}/patients/search?q=${encodeURIComponent(query)}&clinic=${staffInfo?.clinic}`
        : `${API}/patients?clinic=${staffInfo?.clinic}&limit=50`;
      
      const response = await axios.get(endpoint, {
        headers: getAuthHeaders()
      });
      
      setPatients(response.data?.patients || response.data || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch visit history for patient
  const fetchVisitHistory = async (patientId) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API}/patients/${patientId}/visits`, {
        headers: getAuthHeaders()
      });
      setVisitHistory(response.data?.visits || response.data || []);
    } catch (error) {
      console.error('Failed to fetch visit history:', error);
      setVisitHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3 || searchQuery === '') {
        fetchPatients(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, staffInfo?.clinic]);

  // Initial fetch
  useEffect(() => {
    if (staffInfo?.clinic) {
      fetchPatients();
    }
  }, [staffInfo?.clinic]);

  // Open patient details
  const openPatientDetails = (patient) => {
    setSelectedPatient(patient);
    setEditForm({ ...patient });
    setEditMode(false);
    setShowPatientModal(true);
    fetchVisitHistory(patient.patient_id);
  };

  // Save patient edits
  const savePatientEdit = async () => {
    try {
      await axios.put(`${API}/patients/${selectedPatient.patient_id}`, editForm, {
        headers: getAuthHeaders()
      });
      toast.success('Patient details updated');
      setEditMode(false);
      setSelectedPatient({ ...selectedPatient, ...editForm });
      fetchPatients(searchQuery);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update patient');
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const newToday = patients.filter(p => p.created_at?.startsWith(today)).length;
    const withVisits = patients.filter(p => p.total_visits > 0).length;
    
    return { total: patients.length, newToday, withVisits };
  }, [patients]);

  return (
    <div className="space-y-6" data-testid="patients-tab">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <p className="text-xs text-teal-600 font-medium uppercase">Total Patients</p>
          <p className="text-2xl font-bold text-teal-700">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <p className="text-xs text-blue-600 font-medium uppercase">New Today</p>
          <p className="text-2xl font-bold text-blue-700">{stats.newToday}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <p className="text-xs text-green-600 font-medium uppercase">With Visits</p>
          <p className="text-2xl font-bold text-green-700">{stats.withVisits}</p>
        </Card>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or patient ID..."
            className="pl-10"
            data-testid="patients-search-input"
          />
        </div>
        <Button
          onClick={() => {
            setPatientRegisterMobile('');
            setPatientRegisterType('general');
            setShowPatientRegisterDialog(true);
          }}
          className="bg-teal-600 hover:bg-teal-700"
          data-testid="patients-new-btn"
        >
          <User className="w-4 h-4 mr-2" />
          New Patient
        </Button>
      </div>

      {/* Patients List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : patients.length > 0 ? (
          <div className="divide-y">
            {patients.map(patient => (
              <div
                key={patient.patient_id || patient._id}
                onClick={() => openPatientDetails(patient)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                data-testid={`patient-row-${patient.patient_id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{patient.name}</p>
                        <Badge className="bg-teal-100 text-teal-700 text-xs">{patient.patient_id}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {patient.mobile}
                        </span>
                        {patient.age && (
                          <span>{patient.age} yrs • {patient.gender || 'N/A'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-600">
                      {patient.total_visits || 0} visits
                    </p>
                    {patient.last_visit && (
                      <p className="text-xs text-slate-400">
                        Last: {formatIndianDate(patient.last_visit)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No patients found</p>
          </div>
        )}
      </Card>

      {/* Patient Details Modal */}
      <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Patient Details</span>
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={savePatientEdit} className="bg-teal-600">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Patient ID</Label>
                  <p className="font-mono font-bold text-teal-600">{selectedPatient.patient_id}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Name</Label>
                  {editMode ? (
                    <Input
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{selectedPatient.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Phone</Label>
                  {editMode ? (
                    <Input
                      value={editForm.mobile || ''}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    />
                  ) : (
                    <p>{selectedPatient.mobile}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Age / Gender</Label>
                  {editMode ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={editForm.age || ''}
                        onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                        placeholder="Age"
                        className="w-20"
                      />
                      <select
                        value={editForm.gender || ''}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        className="flex-1 p-2 border rounded-lg"
                      >
                        <option value="">Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  ) : (
                    <p>{selectedPatient.age || 'N/A'} yrs • {selectedPatient.gender || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Email</Label>
                  {editMode ? (
                    <Input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  ) : (
                    <p>{selectedPatient.email || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Blood Group</Label>
                  {editMode ? (
                    <select
                      value={editForm.blood_group || ''}
                      onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  ) : (
                    <p>{selectedPatient.blood_group || 'Not provided'}</p>
                  )}
                </div>
              </div>

              {/* Visit History */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Visit History
                </h4>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : visitHistory.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {visitHistory.map((visit, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{visit.date}</span>
                          </div>
                          <Badge className="text-xs" variant="outline">
                            {visit.doctor}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {visit.clinic} • {visit.time}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-4 text-sm">No visit history</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-teal-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-teal-700">{selectedPatient.total_visits || 0}</p>
                  <p className="text-xs text-teal-600">Total Visits</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-sm font-medium text-blue-700">
                    {selectedPatient.last_visit ? formatIndianDate(selectedPatient.last_visit) : 'N/A'}
                  </p>
                  <p className="text-xs text-blue-600">Last Visit</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl text-center">
                  <p className="text-sm font-medium text-green-700">
                    {selectedPatient.created_at ? formatIndianDate(selectedPatient.created_at) : 'N/A'}
                  </p>
                  <p className="text-xs text-green-600">Registered</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsTab;
