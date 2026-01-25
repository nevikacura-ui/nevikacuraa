/**
 * Staff Portal Utilities
 * Shared constants, helpers and API functions for StaffPortal and its components
 */

// API Base URL
export const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Clinic to Doctors mapping
export const CLINICS = {
  'Pushpa Clinic': ['Dr. Vikas Jha', 'Dr. Neha Patel'],
  'Amnion Clinic': ['Dr. Vikas Jha', 'Dr. Neha Patel']
};

// Doctor schedules with time slots
export const DOCTOR_SCHEDULES = {
  'Dr. Vikas Jha': {
    'Pushpa Clinic': [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], time: '09:00 AM - 12:00 PM' },
      { days: ['Saturday'], time: '09:00 AM - 01:00 PM' }
    ],
    'Amnion Clinic': [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], time: '05:00 PM - 08:00 PM' },
      { days: ['Saturday'], time: '04:00 PM - 07:00 PM' }
    ]
  },
  'Dr. Neha Patel': {
    'Pushpa Clinic': [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '10:00 AM - 01:00 PM' },
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], time: '05:00 PM - 08:00 PM' }
    ],
    'Amnion Clinic': [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '10:00 AM - 01:00 PM' },
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], time: '05:00 PM - 08:00 PM' }
    ]
  }
};

// Fee codes for consultations
export const FEE_CODES = {
  'NF': { label: 'No Fees (Staff/Follow-up)', amount: 0 },
  'G1': { label: 'General - First Visit', amount: 150 },
  'G2': { label: 'General - Follow-up', amount: 100 },
  'S1': { label: 'Speciality - First Visit', amount: 300 },
  'S2': { label: 'Speciality - Follow-up', amount: 200 },
  'D1': { label: 'Diabetes - First Visit', amount: 500 },
  'D2': { label: 'Diabetes - Follow-up', amount: 400 },
  'D3': { label: 'Diabetes - Follow-up (2nd)', amount: 300 },
  'O1': { label: 'OBGY - First Visit', amount: 500 },
  'O2': { label: 'OBGY - Follow-up', amount: 400 },
  'O3': { label: 'OBGY - Follow-up (2nd)', amount: 300 },
  'E1': { label: 'Emergency', amount: 600 }
};

// Scan/Test fees
export const SCAN_FEES = {
  'US1': { label: 'USG Abdomen', amount: 800 },
  'US2': { label: 'USG Pelvis', amount: 800 },
  'US3': { label: 'USG Obstetric', amount: 1000 },
  'US4': { label: 'USG Anomaly Scan', amount: 2000 },
  'US5': { label: 'NT Scan', amount: 2500 },
  'US6': { label: 'Doppler', amount: 1500 }
};

// Day names mapping
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get current date in Indian timezone (YYYY-MM-DD format)
 */
export const getIndianDate = () => {
  const now = new Date();
  const indianTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return indianTime.toISOString().split('T')[0];
};

/**
 * Get day name from date string
 */
export const getDayName = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[date.getDay()];
};

/**
 * Format date for display (e.g., "25 Jan 2026")
 */
export const formatIndianDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Generate time slots between start and end time
 */
export const generateTimeSlots = (startTime, endTime, intervalMins = 15) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentMins = startHour * 60 + startMin;
  const endMins = endHour * 60 + endMin;
  
  while (currentMins < endMins) {
    const hours = Math.floor(currentMins / 60);
    const mins = currentMins % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    slots.push(`${displayHours}:${mins.toString().padStart(2, '0')} ${period}`);
    currentMins += intervalMins;
  }
  
  return slots;
};

/**
 * Get available time slots for a doctor at a clinic on a given day
 */
export const getAvailableTimeSlots = (doctor, clinic, dateStr) => {
  const dayName = getDayName(dateStr);
  const schedule = DOCTOR_SCHEDULES[doctor]?.[clinic];
  
  if (!schedule) return [];
  
  let slots = [];
  schedule.forEach(slot => {
    if (slot.days.includes(dayName)) {
      // Parse time range like "09:00 AM - 12:00 PM"
      const [startStr, endStr] = slot.time.split(' - ');
      
      // Convert to 24-hour format for calculation
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [hours, mins] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };
      
      const startTime = parseTime(startStr);
      const endTime = parseTime(endStr);
      
      slots = [...slots, ...generateTimeSlots(startTime, endTime, 15)];
    }
  });
  
  return slots;
};

/**
 * Check if doctor is available at clinic on given day
 */
export const isDoctorAvailableOnDay = (doctor, clinic, dateStr) => {
  const dayName = getDayName(dateStr);
  const schedule = DOCTOR_SCHEDULES[doctor]?.[clinic];
  
  if (!schedule) return false;
  
  return schedule.some(slot => slot.days.includes(dayName));
};

/**
 * Get auth headers from localStorage
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Role checking utilities
 */
export const isClinicStaff = (role) => ['clinic_staff_pushpa', 'clinic_staff_amnion', 'super_admin'].includes(role);
export const isDoctor = (role) => ['doctor', 'doctor_pushpa', 'doctor_amnion', 'super_admin'].includes(role);
export const isPharmacyStaff = (role) => ['pharmacy_staff', 'super_admin'].includes(role);
export const isDiagnosticsStaff = (role) => ['diagnostics_staff', 'super_admin'].includes(role);

/**
 * Format currency for display
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Get status color class for appointment/order status badges
 */
export const getStatusColor = (status) => {
  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-800',
    'Confirmed': 'bg-green-100 text-green-800',
    'Checked-In': 'bg-purple-100 text-purple-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-gray-100 text-gray-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'No-Show': 'bg-orange-100 text-orange-800',
    'Walk-In': 'bg-teal-100 text-teal-800',
    'Emergency': 'bg-red-100 text-red-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Processing': 'bg-blue-100 text-blue-800',
    'Dispatched': 'bg-purple-100 text-purple-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Ready': 'bg-green-100 text-green-800',
    'Collected': 'bg-gray-100 text-gray-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export default {
  API,
  CLINICS,
  DOCTOR_SCHEDULES,
  FEE_CODES,
  SCAN_FEES,
  getIndianDate,
  getDayName,
  formatIndianDate,
  generateTimeSlots,
  getAvailableTimeSlots,
  isDoctorAvailableOnDay,
  getAuthHeaders,
  isClinicStaff,
  isDoctor,
  isPharmacyStaff,
  isDiagnosticsStaff,
  formatCurrency,
  getStatusColor
};
