import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { User, AlertTriangle, Loader2, X, Search, Phone, Clock } from 'lucide-react';
import { PatientLookup, PatientRegistrationDialog } from '@/components/PatientRegistration';
import { 
  API, CLINICS, FEE_CODES,
  getIndianDate, getAuthHeaders 
} from '@/pages/staff/staffUtils';

const EmergencyTab = ({ 
  staffInfo, 
  emergencyForm, 
  setEmergencyForm,
  foundEmergencyPatient,
  setFoundEmergencyPatient,
  setPatientRegisterMobile,
  setPatientRegisterType,
  setShowPatientRegisterDialog,
  fetchAppointments
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [severity, setSeverity] = useState('medium');

  // Get clinic doctors
  const clinicDoctors = staffInfo?.clinic ? (CLINICS[staffInfo.clinic] || []) : [];

  // Get current time
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleBookEmergency = async () => {
    if (!emergencyForm.doctor || !emergencyForm.patient_name || !emergencyForm.patient_phone) {
      toast.error('Please fill all required fields');
      return;
    }

    setLocalLoading(true);
    try {
      const response = await axios.post(`${API}/appointments/emergency`, {
        ...emergencyForm,
        clinic: staffInfo.clinic,
        staff_name: staffInfo.name,
        time: getCurrentTime(),
        severity: severity,
        fee_code: 'E1',
        fee_amount: FEE_CODES['E1']?.amount || 600,
        status: 'Emergency',
        is_emergency: true
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success('Emergency appointment created! Patient added to priority queue.', {
        description: 'Emergency fee of ₹600 applied'
      });
      
      // Reset form
      setEmergencyForm({
        doctor: clinicDoctors[0] || '',
        clinic: staffInfo.clinic,
        date: getIndianDate(),
        patient_name: '',
        patient_phone: '',
        patient_id: '',
        emergency_reason: ''
      });
      setFoundEmergencyPatient(null);
      setSeverity('medium');
      
      if (fetchAppointments) fetchAppointments();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create emergency appointment');
    } finally {
      setLocalLoading(false);
    }
  };

  // Update clinic in form when staffInfo changes
  useEffect(() => {
    if (staffInfo?.clinic && emergencyForm.clinic !== staffInfo.clinic) {
      const clinicDocs = CLINICS[staffInfo.clinic] || [];
      setEmergencyForm(prev => ({
        ...prev,
        clinic: staffInfo.clinic,
        doctor: clinicDocs[0] || ''
      }));
    }
  }, [staffInfo]);

  return (
    <Card className="p-6 max-w-lg border-red-200 bg-red-50/30" data-testid="emergency-tab">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-red-800">Emergency Appointment</h2>
          <p className="text-sm text-red-600">Priority booking for urgent cases - {staffInfo?.clinic}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Patient Lookup Section */}
        <div className="p-4 bg-white border border-red-200 rounded-xl">
          <Label className="text-red-800 font-medium mb-2 block">
            <Search className="w-4 h-4 inline mr-2" />
            Find or Register Patient
          </Label>
          <PatientLookup
            onPatientFound={(patient) => {
              setFoundEmergencyPatient(patient);
              setEmergencyForm(prev => ({
                ...prev,
                patient_name: patient.name,
                patient_phone: patient.mobile,
                patient_id: patient.patient_id
              }));
            }}
            onNewPatient={(mobile) => {
              setPatientRegisterMobile(mobile);
              setPatientRegisterType('emergency');
              setShowPatientRegisterDialog(true);
            }}
            initialMobile={emergencyForm.patient_phone}
          />
        </div>
        
        {/* Show patient info if found */}
        {foundEmergencyPatient && (
          <div className="p-3 bg-white border border-green-200 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-800">{foundEmergencyPatient.name}</span>
                <Badge className="bg-green-600 text-white text-xs">{foundEmergencyPatient.patient_id}</Badge>
              </div>
              <p className="text-xs text-green-700">
                {foundEmergencyPatient.age && `${foundEmergencyPatient.age} yrs • `}
                {foundEmergencyPatient.mobile}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFoundEmergencyPatient(null);
                setEmergencyForm(prev => ({ ...prev, patient_name: '', patient_phone: '', patient_id: '' }));
              }}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {/* Doctor Selection */}
        <div>
          <Label>Attending Doctor</Label>
          <select
            value={emergencyForm.doctor}
            onChange={(e) => setEmergencyForm({ ...emergencyForm, doctor: e.target.value })}
            className="w-full p-2 border border-red-200 rounded-lg bg-white"
            data-testid="emergency-doctor-select"
          >
            {clinicDoctors.map(doc => (
              <option key={doc} value={doc}>{doc}</option>
            ))}
          </select>
        </div>

        {/* Severity Selection */}
        <div>
          <Label>Emergency Severity</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { value: 'low', label: 'Low', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
              { value: 'medium', label: 'Medium', color: 'bg-orange-100 border-orange-300 text-orange-800' },
              { value: 'high', label: 'High', color: 'bg-red-100 border-red-300 text-red-800' }
            ].map(sev => (
              <Button
                key={sev.value}
                variant="outline"
                onClick={() => setSeverity(sev.value)}
                className={`${severity === sev.value ? sev.color + ' ring-2 ring-offset-1' : ''}`}
                data-testid={`emergency-severity-${sev.value}`}
              >
                {sev.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Emergency Reason */}
        <div>
          <Label>Emergency Reason / Chief Complaint</Label>
          <Input
            value={emergencyForm.emergency_reason || ''}
            onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_reason: e.target.value })}
            placeholder="Brief description of emergency"
            className="border-red-200"
            data-testid="emergency-reason-input"
          />
        </div>

        {/* Patient Info (if not found) */}
        {!foundEmergencyPatient && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Patient Name *</Label>
              <Input
                value={emergencyForm.patient_name}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_name: e.target.value })}
                placeholder="Patient name"
                className="border-red-200"
                data-testid="emergency-patient-name"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={emergencyForm.patient_phone}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_phone: e.target.value })}
                placeholder="Phone number"
                className="border-red-200"
                data-testid="emergency-patient-phone"
              />
            </div>
          </div>
        )}

        {/* Emergency Fee Notice */}
        <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Emergency Fee: ₹600 (Code: E1)
          </p>
          <p className="text-xs text-red-600 mt-1">
            Patient will be added to priority queue immediately
          </p>
        </div>

        <Button
          onClick={handleBookEmergency}
          disabled={localLoading || !emergencyForm.patient_name || !emergencyForm.patient_phone}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          data-testid="emergency-book-btn"
        >
          {localLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Create Emergency Appointment
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default EmergencyTab;
