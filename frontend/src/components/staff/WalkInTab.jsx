import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Clock, Loader2, X, Search, IndianRupee } from 'lucide-react';
import { PatientLookup, PatientRegistrationDialog } from '@/components/PatientRegistration';
import { 
  API, CLINICS, DOCTOR_SCHEDULES, FEE_CODES,
  getIndianDate, getDayName, getAvailableTimeSlots, getAuthHeaders, generateTimeSlots 
} from '@/pages/staff/staffUtils';

const WalkInTab = ({ 
  staffInfo, 
  walkInForm, 
  setWalkInForm,
  foundWalkInPatient,
  setFoundWalkInPatient,
  setPatientRegisterMobile,
  setPatientRegisterType,
  setShowPatientRegisterDialog,
  fetchAppointments,
  fetchAvailableSlots,
  availableSlots,
  bookedSlots
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedFeeCode, setSelectedFeeCode] = useState('G1');

  // Get clinic doctors
  const clinicDoctors = staffInfo?.clinic ? (CLINICS[staffInfo.clinic] || []) : [];

  // Get available time slots for selected doctor and date
  const getTimeSlots = () => {
    if (!walkInForm.doctor || !walkInForm.date) return [];
    
    const doctor = walkInForm.doctor;
    const dayName = getDayName(walkInForm.date);
    const schedule = DOCTOR_SCHEDULES[doctor];
    
    if (!schedule || !schedule[walkInForm.clinic] || !schedule[walkInForm.clinic][dayName]) {
      return [];
    }
    
    const daySchedule = schedule[walkInForm.clinic][dayName];
    let slots = [];
    
    daySchedule.forEach(({ start, end }) => {
      const generated = generateTimeSlots(start, end, 15);
      slots = [...slots, ...generated];
    });
    
    // Filter out booked slots
    const bookedTimes = bookedSlots.map(s => s.time);
    return slots.filter(slot => !bookedTimes.includes(slot));
  };

  const handleBookWalkIn = async () => {
    if (!walkInForm.doctor || !walkInForm.time || !walkInForm.patient_name || !walkInForm.patient_phone) {
      toast.error('Please fill all required fields');
      return;
    }

    setLocalLoading(true);
    try {
      const response = await axios.post(`${API}/appointments/walk-in`, {
        ...walkInForm,
        clinic: staffInfo.clinic,
        staff_name: staffInfo.name,
        fee_code: selectedFeeCode,
        fee_amount: FEE_CODES[selectedFeeCode]?.amount || 0
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success('Walk-in appointment booked successfully');
      
      // Reset form
      setWalkInForm({
        doctor: clinicDoctors[0] || '',
        clinic: staffInfo.clinic,
        date: getIndianDate(),
        time: '',
        patient_name: '',
        patient_phone: '',
        patient_id: ''
      });
      setFoundWalkInPatient(null);
      setSelectedFeeCode('G1');
      
      if (fetchAppointments) fetchAppointments();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setLocalLoading(false);
    }
  };

  // Update clinic in form when staffInfo changes
  useEffect(() => {
    if (staffInfo?.clinic && walkInForm.clinic !== staffInfo.clinic) {
      const clinicDocs = CLINICS[staffInfo.clinic] || [];
      setWalkInForm(prev => ({
        ...prev,
        clinic: staffInfo.clinic,
        doctor: clinicDocs[0] || ''
      }));
    }
  }, [staffInfo]);

  // Fetch available slots when doctor/date changes
  useEffect(() => {
    if (walkInForm.doctor && walkInForm.date && fetchAvailableSlots) {
      fetchAvailableSlots(walkInForm.doctor, staffInfo?.clinic, walkInForm.date);
    }
  }, [walkInForm.doctor, walkInForm.date]);

  const timeSlots = getTimeSlots();

  return (
    <Card className="p-6 max-w-lg" data-testid="walkin-tab">
      <h2 className="font-semibold text-lg mb-4">Book Walk-in Appointment - {staffInfo?.clinic}</h2>
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
                setWalkInForm(prev => ({ ...prev, patient_name: '', patient_phone: '', patient_id: '' }));
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
              data-testid="walkin-doctor-select"
            >
              {clinicDoctors.map(doc => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={walkInForm.date}
              onChange={(e) => setWalkInForm({ ...walkInForm, date: e.target.value, time: '' })}
              min={getIndianDate()}
              data-testid="walkin-date-input"
            />
          </div>
        </div>

        <div>
          <Label>Time Slot</Label>
          <div className="grid grid-cols-4 gap-2 mt-2 max-h-40 overflow-y-auto">
            {timeSlots.length > 0 ? (
              timeSlots.map(slot => (
                <Button
                  key={slot}
                  variant={walkInForm.time === slot ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWalkInForm({ ...walkInForm, time: slot })}
                  className={walkInForm.time === slot ? 'bg-teal-600' : ''}
                  data-testid={`walkin-slot-${slot}`}
                >
                  {slot}
                </Button>
              ))
            ) : (
              <p className="col-span-4 text-center text-slate-500 py-2">
                No slots available for this doctor/date
              </p>
            )}
          </div>
        </div>

        {/* Fee Selection */}
        <div>
          <Label>Consultation Fee</Label>
          <select
            value={selectedFeeCode}
            onChange={(e) => setSelectedFeeCode(e.target.value)}
            className="w-full p-2 border rounded-lg"
            data-testid="walkin-fee-select"
          >
            {Object.entries(FEE_CODES).map(([code, { label, amount }]) => (
              <option key={code} value={code}>
                {label} - ₹{amount}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
            <IndianRupee className="w-3 h-3" />
            Selected: {FEE_CODES[selectedFeeCode]?.label} - ₹{FEE_CODES[selectedFeeCode]?.amount}
          </p>
        </div>

        {/* Patient Info (if not found) */}
        {!foundWalkInPatient && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Patient Name</Label>
              <Input
                value={walkInForm.patient_name}
                onChange={(e) => setWalkInForm({ ...walkInForm, patient_name: e.target.value })}
                placeholder="Patient name"
                data-testid="walkin-patient-name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={walkInForm.patient_phone}
                onChange={(e) => setWalkInForm({ ...walkInForm, patient_phone: e.target.value })}
                placeholder="Phone number"
                data-testid="walkin-patient-phone"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleBookWalkIn}
          disabled={localLoading || !walkInForm.time || !walkInForm.patient_name}
          className="w-full bg-teal-600 hover:bg-teal-700"
          data-testid="walkin-book-btn"
        >
          {localLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Book Walk-in Appointment'}
        </Button>
      </div>
    </Card>
  );
};

export default WalkInTab;
