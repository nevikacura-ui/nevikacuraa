import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PatientLookup } from '@/components/PatientRegistration';
import { Search, User, X, Clock, AlertTriangle, UserPlus, Loader2 } from 'lucide-react';
import { 
  CLINICS, DOCTOR_SCHEDULES, 
  formatIndianDate, getDayName, getIndianDate 
} from '@/pages/staff/staffUtils';

const WalkInTab = ({
  staffInfo,
  activeClinic,
  walkInForm,
  setWalkInForm,
  foundWalkInPatient,
  setFoundWalkInPatient,
  setPatientRegisterMobile,
  setPatientRegisterType,
  setShowPatientRegisterDialog,
  availableTimeSlots,
  bookedSlots,
  loadingSlots,
  isFormReady,
  isDoctorAvailable,
  loading,
  handleWalkInBooking
}) => {
  // Use activeClinic for multi-clinic staff, otherwise use staffInfo.clinic
  const currentClinic = activeClinic || staffInfo?.clinic;
  const clinicDoctors = CLINICS[currentClinic] || [];

  return (
    <Card className="p-6 max-w-lg" data-testid="walkin-tab-content">
      <h2 className="font-semibold text-lg mb-4">Book Walk-in Appointment - {currentClinic}</h2>
      <div className="space-y-4">
        {/* Patient Lookup Section */}
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <Label className="text-teal-800 font-medium mb-2 block">
            <Search className="w-4 h-4 inline mr-2" />
            Find or Register Patient
          </Label>
          <PatientLookup
            onPatientFound={(patient) => {
              setFoundWalkInPatient(patient);
              setWalkInForm(prev => ({
                ...prev,
                patient_name: patient.name,
                patient_phone: patient.mobile,
                patient_id: patient.patient_id
              }));
            }}
            onNewPatient={(mobile) => {
              setPatientRegisterMobile(mobile);
              setPatientRegisterType('walk-in');
              setShowPatientRegisterDialog(true);
            }}
            initialMobile={walkInForm.patient_phone}
          />
        </div>
        
        {/* Show patient info if found */}
        {foundWalkInPatient && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-800">{foundWalkInPatient.name}</span>
                <Badge className="bg-green-600 text-white text-xs">{foundWalkInPatient.patient_id}</Badge>
              </div>
              <p className="text-xs text-green-700">
                {foundWalkInPatient.age && `${foundWalkInPatient.age} yrs • `}
                {foundWalkInPatient.total_visits > 0 && `${foundWalkInPatient.total_visits} previous visits`}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFoundWalkInPatient(null);
                setWalkInForm(prev => ({ ...prev, patient_name: '', patient_phone: '' }));
              }}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Doctor</Label>
            <select
              value={walkInForm.doctor}
              onChange={(e) => setWalkInForm({ ...walkInForm, doctor: e.target.value, time: '' })}
              className="w-full p-2 border rounded-lg"
              data-testid="walkin-doctor"
            >
              {clinicDoctors.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <Label>Date <span className="text-gray-500 text-xs font-normal">(Today Only)</span></Label>
            <Input
              type="date"
              value={getIndianDate()}
              disabled
              className="bg-gray-100"
              data-testid="walkin-date"
            />
            <p className="text-xs text-gray-500 mt-1">Walk-in is for same-day only. Use "Advance Booking" for future dates.</p>
          </div>
        </div>
        
        {/* Doctor availability notice */}
        {isFormReady && walkInForm.date && !isDoctorAvailable && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            <strong>{walkInForm.doctor}</strong> is not available at {currentClinic} on {formatIndianDate(walkInForm.date)} ({getDayName(walkInForm.date)}). 
            Please select a different date or doctor.
          </div>
        )}
        
        {/* Show schedule info */}
        {walkInForm.doctor && DOCTOR_SCHEDULES[walkInForm.doctor]?.[currentClinic] && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <Clock className="w-4 h-4 inline mr-2" />
            <strong>{walkInForm.doctor}</strong> schedule at {currentClinic}:
            <ul className="mt-1 ml-6 list-disc">
              {DOCTOR_SCHEDULES[walkInForm.doctor][currentClinic].map((slot, idx) => (
                <li key={idx}>{slot.days.join(', ')}: {slot.time}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div>
          <Label>Time Slot * 
            {loadingSlots ? (
              <span className="text-gray-500 text-xs ml-1"><Loader2 className="w-3 h-3 animate-spin inline" /> Loading...</span>
            ) : availableTimeSlots.length > 0 ? (
              <span className="text-gray-500 text-xs ml-1">({availableTimeSlots.length} slots available{bookedSlots.length > 0 ? `, ${bookedSlots.length} booked` : ''})</span>
            ) : null}
          </Label>
          <select
            value={walkInForm.time}
            onChange={(e) => setWalkInForm({ ...walkInForm, time: e.target.value })}
            className="w-full p-2 border rounded-lg"
            data-testid="walkin-time"
            disabled={!isFormReady || !isDoctorAvailable || loadingSlots}
          >
            <option value="">
              {!isFormReady ? 'Loading...' : loadingSlots ? 'Loading slots...' : isDoctorAvailable ? 'Select time' : 'No slots available'}
            </option>
            {availableTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        
        {/* Manual patient entry - only if not found via lookup */}
        {!foundWalkInPatient && (
          <>
            <div>
              <Label>Patient Name *</Label>
              <Input
                value={walkInForm.patient_name}
                onChange={(e) => setWalkInForm({ ...walkInForm, patient_name: e.target.value })}
                placeholder="Enter patient name"
                data-testid="walkin-name"
              />
            </div>
            
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={walkInForm.patient_phone}
                onChange={(e) => setWalkInForm({ ...walkInForm, patient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit mobile number"
                data-testid="walkin-phone"
              />
            </div>
          </>
        )}
        
        <Button 
          onClick={handleWalkInBooking} 
          disabled={loading || !isDoctorAvailable} 
          className="w-full bg-teal-500 hover:bg-teal-600" 
          data-testid="walkin-submit"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Book Walk-in Appointment
        </Button>
      </div>
    </Card>
  );
};

export default WalkInTab;
