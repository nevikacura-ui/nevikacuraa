import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PatientLookup } from '@/components/PatientRegistration';
import { Search, User, X, AlertTriangle, Loader2 } from 'lucide-react';
import { 
  CLINICS, formatIndianDate, getDayName, getIndianDate 
} from '@/pages/staff/staffUtils';

const EmergencyTab = ({
  staffInfo,
  activeClinic,
  emergencyForm,
  setEmergencyForm,
  foundEmergencyPatient,
  setFoundEmergencyPatient,
  setPatientRegisterMobile,
  setPatientRegisterType,
  setShowPatientRegisterDialog,
  emergencyCounts,
  loading,
  handleEmergencyBooking
}) => {
  // Use activeClinic for multi-clinic staff, otherwise use staffInfo.clinic
  const currentClinic = activeClinic || staffInfo?.clinic;
  const clinicDoctors = CLINICS[currentClinic] || [];

  return (
    <Card className="p-6 max-w-lg" data-testid="emergency-tab-content">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <h2 className="font-semibold text-lg">Book Emergency Appointment - {currentClinic}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Emergency appointments do NOT require a time slot. Maximum 10 per doctor per day.
      </p>
      
      {/* Patient Lookup Section */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
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
              patient_email: patient.email || '',
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
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 mb-4">
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
              {foundEmergencyPatient.blood_group && `Blood: ${foundEmergencyPatient.blood_group} • `}
              {foundEmergencyPatient.total_visits > 0 && `${foundEmergencyPatient.total_visits} previous visits`}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setFoundEmergencyPatient(null);
              setEmergencyForm(prev => ({ ...prev, patient_name: '', patient_phone: '', patient_email: '' }));
            }}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Show current emergency count */}
      {emergencyCounts[emergencyForm.doctor] && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm">
            <span className="font-medium">{emergencyForm.doctor}:</span>{' '}
            <span className={emergencyCounts[emergencyForm.doctor].count >= 10 ? 'text-red-600 font-bold' : 'text-gray-700'}>
              {emergencyCounts[emergencyForm.doctor].count} / {emergencyCounts[emergencyForm.doctor].max} emergency slots used today
            </span>
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Doctor *</Label>
            <select
              value={emergencyForm.doctor}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, doctor: e.target.value })}
              className="w-full p-2 border rounded-lg"
              data-testid="emergency-doctor"
            >
              {clinicDoctors.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <Label>Date <span className="text-gray-500 text-xs font-normal">({formatIndianDate(emergencyForm.date)} - {getDayName(emergencyForm.date)})</span></Label>
            <Input
              type="date"
              value={emergencyForm.date}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, date: e.target.value })}
              min={getIndianDate()}
              data-testid="emergency-date"
            />
          </div>
        </div>
        
        {/* Manual patient entry - only if not found via lookup */}
        {!foundEmergencyPatient && (
          <>
            <div>
              <Label>Patient Name *</Label>
              <Input
                value={emergencyForm.patient_name}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_name: e.target.value })}
                placeholder="Enter patient name"
                data-testid="emergency-name"
              />
            </div>
            
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={emergencyForm.patient_phone}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit mobile number"
                data-testid="emergency-phone"
              />
            </div>
            
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={emergencyForm.patient_email}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_email: e.target.value })}
                placeholder="patient@email.com"
                data-testid="emergency-email"
              />
            </div>
          </>
        )}
        
        <Button 
          onClick={handleEmergencyBooking} 
          disabled={loading || (emergencyCounts[emergencyForm.doctor]?.count >= 10)} 
          className="w-full bg-red-500 hover:bg-red-600"
          data-testid="emergency-submit"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
          Book Emergency Appointment
        </Button>
      </div>
    </Card>
  );
};

export default EmergencyTab;
