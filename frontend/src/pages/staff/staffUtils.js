/**
 * Staff Portal Utility Functions and Constants
 */

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Clinic configuration with clinic IDs
export const CLINICS = {
  "Pushpa Clinic": ["Dr. Neha Patel", "Dr. Vikas Jha"],
  "Amnion Clinic": ["Dr. Vikas Jha", "Dr. Neha Patel"]
};

// Doctor schedules - matching DiaGyn clinic availability
export const DOCTOR_SCHEDULES = {
  "Dr. Vikas Jha": {
    "Pushpa Clinic": [
      { days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }
    ],
    "Amnion Clinic": [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:00-14:00' },
      { days: ['Tuesday', 'Thursday', 'Saturday'], time: '18:00-22:00' }
    ]
  },
  "Dr. Neha Patel": {
    "Amnion Clinic": [
      { days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }
    ],
    "Pushpa Clinic": [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:00-14:00' },
      { days: ['Tuesday', 'Thursday', 'Saturday'], time: '18:00-22:00' }
    ]
  }
};

// Fee codes for appointment completion
export const FEE_CODES = {
  "NF": { label: "No Fees", amount: 0, color: "bg-gray-50 text-gray-600" },
  "G1": { label: "General - First", amount: 150, color: "bg-gray-100 text-gray-800" },
  "G2": { label: "General - Follow up", amount: 100, color: "bg-gray-100 text-gray-800" },
  "S1": { label: "Speciality - First", amount: 300, color: "bg-blue-100 text-blue-800" },
  "S2": { label: "Speciality - Follow up", amount: 200, color: "bg-blue-100 text-blue-800" },
  "D1": { label: "Diabetes - First", amount: 500, color: "bg-purple-100 text-purple-800" },
  "D2": { label: "Diabetes - Follow up", amount: 400, color: "bg-purple-100 text-purple-800" },
  "D3": { label: "Diabetes - Follow up", amount: 300, color: "bg-purple-100 text-purple-800" },
  "O1": { label: "OBGY - First", amount: 500, color: "bg-pink-100 text-pink-800" },
  "O2": { label: "OBGY - Follow up", amount: 400, color: "bg-pink-100 text-pink-800" },
  "O3": { label: "OBGY - Follow up", amount: 300, color: "bg-pink-100 text-pink-800" },
  "E1": { label: "Emergency", amount: 600, color: "bg-red-100 text-red-800" },
};

// Scan/Ultrasound fees (Dr. Neha - OBGY)
export const SCAN_FEES = {
  "ES": { label: "Early Scan", amount: 1000, color: "bg-cyan-100 text-cyan-800" },
  "NT": { label: "NT Scan", amount: 1200, color: "bg-cyan-100 text-cyan-800" },
  "GS": { label: "Growth Scan", amount: 1500, color: "bg-cyan-100 text-cyan-800" },
  "FL": { label: "Follicular", amount: 200, color: "bg-teal-100 text-teal-800" },
  "UP": { label: "USG Pelvis", amount: 1000, color: "bg-teal-100 text-teal-800" },
  "UT": { label: "UpT", amount: 100, color: "bg-teal-100 text-teal-800" },
};

// Helper function to generate time slots from schedule (15-minute intervals)
export const generateTimeSlots = (startTime, endTime, interval = 15) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    slots.push(timeStr);
    
    currentMin += interval;
    if (currentMin >= 60) {
      currentHour += 1;
      currentMin = 0;
    }
  }
  
  return slots;
};

// Get current date in Indian timezone (IST - UTC+5:30)
export const getIndianDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + istOffset);
  return istTime.toISOString().split('T')[0];
};

// Get day name from date
export const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Get available time slots for a doctor at a clinic on a specific date
export const getAvailableTimeSlots = (doctor, clinic, dateStr) => {
  if (!doctor || !clinic || !dateStr) return [];
  
  const dayName = getDayName(dateStr);
  const schedule = DOCTOR_SCHEDULES[doctor]?.[clinic];
  
  if (!schedule) return [];
  
  const allSlots = [];
  
  schedule.forEach(slot => {
    if (slot.days.includes(dayName)) {
      const [startTime, endTime] = slot.time.split('-');
      const timeSlots = generateTimeSlots(startTime, endTime);
      allSlots.push(...timeSlots);
    }
  });
  
  return [...new Set(allSlots)].sort();
};

// Get status color for appointments
export const getStatusColor = (status) => {
  const colors = {
    'Booked': 'bg-yellow-100 text-yellow-800',
    'In Clinic': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'No Show': 'bg-gray-100 text-gray-800',
    'Received': 'bg-yellow-100 text-yellow-800',
    'Processing': 'bg-blue-100 text-blue-800',
    'Ready': 'bg-purple-100 text-purple-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Sample Collected': 'bg-blue-100 text-blue-800',
    'Report Ready': 'bg-purple-100 text-purple-800',
    'ORDERED': 'bg-yellow-100 text-yellow-800',
    'SAMPLE_COLLECTED': 'bg-blue-100 text-blue-800',
    'PROCESSING': 'bg-purple-100 text-purple-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'ready': 'bg-green-100 text-green-800',
    'delivered': 'bg-gray-100 text-gray-800',
    'collected': 'bg-purple-100 text-purple-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Get auth headers from localStorage
export const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};
