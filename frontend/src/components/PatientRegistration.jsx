import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, User, Phone, Calendar, Loader2, CheckCircle2, 
  UserPlus, History, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Patient Lookup Component - Used in booking flows
export const PatientLookup = ({ 
  onPatientFound, 
  onNewPatient,
  initialMobile = '',
  showHistory = true 
}) => {
  const [mobile, setMobile] = useState(initialMobile);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const lookupPatient = async () => {
    if (mobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setPatient(null);

    try {
      const response = await axios.get(`${API}/patients/lookup`, {
        params: { mobile: mobile.replace(/\D/g, '').slice(-10) }
      });

      if (response.data.found) {
        setPatient(response.data.patient);
        onPatientFound && onPatientFound(response.data.patient);
      } else {
        setNotFound(true);
        onNewPatient && onNewPatient(mobile);
      }
    } catch (error) {
      toast.error('Failed to lookup patient');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      lookupPatient();
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="tel"
            placeholder="Enter mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyPress={handleKeyPress}
            className="pl-10 h-12 text-lg rounded-xl"
            data-testid="patient-mobile-input"
          />
        </div>
        <Button 
          onClick={lookupPatient}
          disabled={loading || mobile.length < 10}
          className="h-12 px-6 rounded-xl bg-teal-600 hover:bg-teal-700"
          data-testid="patient-lookup-btn"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </Button>
      </div>

      {/* Patient Found */}
      {patient && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl" data-testid="patient-found-card">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-green-800">{patient.name}</h4>
                <Badge className="bg-green-600 text-white text-xs">{patient.patient_id}</Badge>
              </div>
              <div className="text-sm text-green-700 space-y-0.5">
                <p><Phone className="w-3 h-3 inline mr-1" />{patient.mobile}</p>
                {patient.age && <p>Age: {patient.age} yrs • {patient.gender}</p>}
                {patient.total_visits > 0 && (
                  <p className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {patient.total_visits} previous visit{patient.total_visits > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not Found */}
      {notFound && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl" data-testid="patient-not-found">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-800">New Patient</h4>
              <p className="text-sm text-amber-700">
                This mobile number is not registered. Please register the patient first.
              </p>
              {onNewPatient && (
                <Button 
                  size="sm" 
                  className="mt-2 bg-amber-600 hover:bg-amber-700"
                  onClick={() => onNewPatient(mobile)}
                  data-testid="register-new-patient-btn"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register New Patient
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Patient Registration Form - Used by Staff
export const PatientRegistrationForm = ({ 
  onSuccess, 
  onCancel,
  initialMobile = '',
  registrationType = 'walk-in'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: initialMobile,
    age: '',
    gender: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.mobile) {
      toast.error('Name and mobile are required');
      return;
    }

    setLoading(true);
    try {
      const staffToken = localStorage.getItem('staffToken');
      const response = await axios.post(`${API}/patients/register`, {
        name: formData.name,
        mobile: formData.mobile.replace(/\D/g, '').slice(-10),
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        registration_type: registrationType
      }, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        onSuccess && onSuccess(response.data.patient);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label className="text-gray-600">Patient Name *</Label>
          <Input
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="h-11 rounded-xl"
            data-testid="reg-patient-name"
            required
          />
        </div>
        
        <div>
          <Label className="text-gray-600">Mobile Number *</Label>
          <Input
            type="tel"
            placeholder="10-digit mobile"
            value={formData.mobile}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              mobile: e.target.value.replace(/\D/g, '').slice(0, 10) 
            }))}
            className="h-11 rounded-xl"
            data-testid="reg-patient-mobile"
            required
          />
        </div>
        
        <div>
          <Label className="text-gray-600">Age</Label>
          <Input
            type="number"
            placeholder="Age in years"
            value={formData.age}
            onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
            className="h-11 rounded-xl"
            min="0"
            max="150"
            data-testid="reg-patient-age"
          />
        </div>
        
        <div className="sm:col-span-2">
          <Label className="text-gray-600">Gender</Label>
          <div className="flex gap-3 mt-2">
            {['male', 'female', 'other'].map(g => (
              <Button
                key={g}
                type="button"
                variant={formData.gender === g ? 'default' : 'outline'}
                onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                className={`flex-1 rounded-xl capitalize ${
                  formData.gender === g ? 'bg-teal-600 hover:bg-teal-700' : ''
                }`}
                data-testid={`reg-gender-${g}`}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 rounded-xl"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={loading || !formData.name || !formData.mobile}
          className="flex-1 bg-teal-600 hover:bg-teal-700 rounded-xl"
          data-testid="reg-submit-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Register Patient
        </Button>
      </div>
    </form>
  );
};


// Patient Registration Dialog - Can be opened from anywhere
export const PatientRegistrationDialog = ({ 
  open, 
  onOpenChange, 
  initialMobile = '',
  registrationType = 'walk-in',
  onSuccess 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-600" />
            Register New Patient
          </DialogTitle>
        </DialogHeader>
        <PatientRegistrationForm
          initialMobile={initialMobile}
          registrationType={registrationType}
          onSuccess={(patient) => {
            onOpenChange(false);
            onSuccess && onSuccess(patient);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};


// Patient History Component - Shows past visits
export const PatientHistory = ({ patientId, compact = false }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/patients/${patientId}/history`);
        setHistory(response.data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (patientId) {
      fetchHistory();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!history) return null;

  if (compact) {
    return (
      <div className="flex gap-4 text-sm text-gray-600">
        <span>{history.summary.total_appointments} appointments</span>
        <span>{history.summary.total_pharmacy_orders} pharmacy orders</span>
        <span>{history.summary.total_diagnostic_orders} lab tests</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Appointments', count: history.summary.total_appointments, color: 'blue' },
          { label: 'Pharmacy', count: history.summary.total_pharmacy_orders, color: 'orange' },
          { label: 'Lab Tests', count: history.summary.total_diagnostic_orders, color: 'purple' },
          { label: 'Bills', count: history.summary.total_bills, color: 'green' }
        ].map(item => (
          <div 
            key={item.label}
            className={`p-3 bg-${item.color}-50 border border-${item.color}-200 rounded-xl text-center`}
          >
            <p className={`text-2xl font-bold text-${item.color}-600`}>{item.count}</p>
            <p className="text-xs text-gray-600">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Appointments */}
      {history.appointments.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Recent Appointments</h4>
          <div className="space-y-2">
            {history.appointments.slice(0, 5).map((apt, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">{apt.doctor}</p>
                  <p className="text-sm text-gray-500">{apt.date} at {apt.time}</p>
                </div>
                <Badge variant={apt.status === 'completed' ? 'success' : 'secondary'}>
                  {apt.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// Combined Lookup + Register Component
export const PatientLookupOrRegister = ({ 
  onPatientSelected,
  registrationType = 'walk-in'
}) => {
  const [patient, setPatient] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [mobileForRegister, setMobileForRegister] = useState('');

  const handlePatientFound = (p) => {
    setPatient(p);
    onPatientSelected && onPatientSelected(p);
  };

  const handleNewPatient = (mobile) => {
    setMobileForRegister(mobile);
    setShowRegister(true);
  };

  const handleRegistrationSuccess = (p) => {
    setPatient(p);
    setShowRegister(false);
    onPatientSelected && onPatientSelected(p);
  };

  return (
    <div className="space-y-4">
      <PatientLookup
        onPatientFound={handlePatientFound}
        onNewPatient={handleNewPatient}
      />

      <PatientRegistrationDialog
        open={showRegister}
        onOpenChange={setShowRegister}
        initialMobile={mobileForRegister}
        registrationType={registrationType}
        onSuccess={handleRegistrationSuccess}
      />

      {patient && (
        <div className="mt-4">
          <PatientHistory patientId={patient.patient_id} compact />
        </div>
      )}
    </div>
  );
};

export default PatientLookup;
