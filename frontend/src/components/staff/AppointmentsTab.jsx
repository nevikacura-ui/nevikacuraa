import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Scan, AlertTriangle, CheckCircle2, XCircle, Clock, 
  Calendar, Loader2, Plus, Edit2
} from 'lucide-react';
import { getStatusColor } from '@/pages/staff/staffUtils';

const AppointmentsTab = ({
  staffInfo,
  selectedDate,
  setSelectedDate,
  appointments,
  dailyCollection,
  emergencyCounts,
  loading,
  setShowSonographyModal,
  openAppointmentDetails,
  handleCheckIn,
  handleEditPatient,
  openSonographyFromAppointment,
  FEE_CODES
}) => {
  return (
    <Card className="p-3 sm:p-4" data-testid="appointments-tab-content">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold text-lg">{staffInfo?.clinic || 'Clinic'} - Appointments</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSonographyModal && setShowSonographyModal(true)}
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
            data-testid="book-sonography-btn"
          >
            <Scan className="w-4 h-4 mr-1" />
            Book Sonography
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
            data-testid="date-picker"
          />
        </div>
      </div>
      
      {/* Daily Collection Summary */}
      {dailyCollection && dailyCollection.total_collection > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              💰 Today&apos;s Collection
            </h3>
            <span className="text-2xl font-bold text-green-600">₹{dailyCollection.total_collection}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dailyCollection.by_category?.general?.count > 0 && (
              <CollectionCard label="General" amount={dailyCollection.by_category.general.amount} count={dailyCollection.by_category.general.count} color="gray" />
            )}
            {dailyCollection.by_category?.speciality?.count > 0 && (
              <CollectionCard label="Speciality" amount={dailyCollection.by_category.speciality.amount} count={dailyCollection.by_category.speciality.count} color="blue" />
            )}
            {dailyCollection.by_category?.diabetes?.count > 0 && (
              <CollectionCard label="Diabetes" amount={dailyCollection.by_category.diabetes.amount} count={dailyCollection.by_category.diabetes.count} color="purple" />
            )}
            {dailyCollection.by_category?.obgyn?.count > 0 && (
              <CollectionCard label="OBGY" amount={dailyCollection.by_category.obgyn.amount} count={dailyCollection.by_category.obgyn.count} color="pink" />
            )}
          </div>
          {dailyCollection.total_patients > 0 && (
            <p className="text-xs text-green-600 mt-2 text-center">
              {dailyCollection.total_patients} completed consultations
            </p>
          )}
        </div>
      )}
      
      {/* Emergency Count Display */}
      {Object.keys(emergencyCounts || {}).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 mb-2">Emergency Appointments Today:</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(emergencyCounts).map(([doctor, data]) => (
              <span key={doctor} className="text-sm">
                <span className="font-medium">{doctor}:</span>{' '}
                <span className={data.count >= 10 ? 'text-red-600 font-bold' : 'text-gray-700'}>
                  {data.count}/{data.max}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Appointments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No appointments for this date</p>
        ) : (
          appointments.map((appt) => (
            <AppointmentCard 
              key={appt.id || appt.appointment_id} 
              appt={appt}
              staffInfo={staffInfo}
              handleCheckIn={handleCheckIn}
              handleEditPatient={handleEditPatient}
              openAppointmentDetails={openAppointmentDetails}
              openSonographyFromAppointment={openSonographyFromAppointment}
              FEE_CODES={FEE_CODES}
            />
          ))
        )}
      </div>
    </Card>
  );
};

// Collection card sub-component
const CollectionCard = ({ label, amount, count, color }) => {
  const colorClasses = {
    gray: 'text-gray-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    pink: 'text-pink-500'
  };
  const amountColorClasses = {
    gray: 'text-gray-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    pink: 'text-pink-700'
  };

  return (
    <div className="bg-white p-2 rounded-lg text-center">
      <span className={`text-xs ${colorClasses[color]}`}>{label}</span>
      <p className={`font-bold ${amountColorClasses[color]}`}>₹{amount}</p>
      <p className="text-xs text-gray-400">{count} patients</p>
    </div>
  );
};

// Appointment card sub-component
const AppointmentCard = ({ 
  appt, 
  staffInfo,
  handleCheckIn,
  handleEditPatient, 
  openAppointmentDetails,
  openSonographyFromAppointment,
  FEE_CODES
}) => {
  const isEmergency = appt.appointment_type === 'EMERGENCY';
  const isWalkIn = appt.booking_type === 'walk_in';
  const isActive = appt.status !== 'Completed' && appt.status !== 'Cancelled';
  const isPending = ['Booked', 'booked', 'pending', 'Pending'].includes(appt.status);
  const isWithDoctor = appt.status === 'In Clinic';
  
  return (
    <div 
      className={`flex items-center justify-between p-4 rounded-lg ${
        isEmergency ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50'
      }`}
      data-testid={`appointment-${appt.id || appt.appointment_id}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{appt.patient_name}</span>
          {appt.booking_id && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-teal-500 text-white">{appt.booking_id}</span>
          )}
          {appt.patient_id && (
            <Badge className="bg-indigo-100 text-indigo-700 text-xs font-normal">{appt.patient_id}</Badge>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(appt.status)}`}>
            {appt.status}
          </span>
          {isEmergency && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              EMERGENCY
            </span>
          )}
          {isWalkIn && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">Walk-in</span>
          )}
          {appt.booked_by && appt.booked_by.includes('Staff') && !isWalkIn && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">Staff Booked</span>
          )}
          {!isWalkIn && !isEmergency && !appt.booked_by?.includes('Staff') && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Online</span>
          )}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          <span>{appt.time || 'No time slot'}</span> • <span>{appt.doctor}</span> • <span>{appt.patient_phone}</span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {/* Add Service button - only before completion */}
        {isActive && openAppointmentDetails && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => openAppointmentDetails(appt)}
            data-testid={`add-service-${appt.id || appt.appointment_id}`}
          >
            <Plus className="w-4 h-4 mr-1" />
            Service
          </Button>
        )}
        
        {/* Edit Patient button */}
        {isActive && handleEditPatient && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleEditPatient(appt)}
            className="border-amber-300 text-amber-600 hover:bg-amber-50"
            data-testid={`edit-patient-${appt.id || appt.appointment_id}`}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
        
        {/* Book Sonography button - for clinic staff */}
        {isActive && staffInfo?.role?.includes('clinic_staff') && openSonographyFromAppointment && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => openSonographyFromAppointment(appt)}
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
            data-testid={`book-sonography-${appt.id || appt.appointment_id}`}
          >
            <Scan className="w-4 h-4 mr-1" />
            Sonography
          </Button>
        )}
        
        {/* Check In button */}
        {isPending && handleCheckIn && (
          <Button 
            size="sm" 
            onClick={() => handleCheckIn(appt.id || appt.appointment_id)} 
            className="bg-blue-500 hover:bg-blue-600"
            data-testid={`checkin-${appt.id || appt.appointment_id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Check In
          </Button>
        )}
        
        {/* With Doctor status indicator */}
        {isWithDoctor && (
          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-sm flex items-center gap-1">
            <Clock className="w-4 h-4" />
            With Doctor
          </span>
        )}
        
        {/* Show fee code when completed */}
        {appt.status === 'Completed' && appt.fee_code && FEE_CODES && (
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${FEE_CODES[appt.fee_code]?.color || 'bg-green-100 text-green-800'}`}>
            {appt.fee_code} • ₹{appt.fee_amount}
          </span>
        )}
        
        {/* Follow-up date */}
        {appt.status === 'Completed' && appt.follow_up_date && (
          <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Follow-up: {appt.follow_up_date}
          </span>
        )}
      </div>
    </div>
  );
};

export default AppointmentsTab;
