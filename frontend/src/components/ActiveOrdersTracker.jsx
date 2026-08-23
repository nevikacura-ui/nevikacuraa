import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, Package, TestTube, Stethoscope, 
  ChevronRight, MapPin, CheckCircle2, Circle,
  Truck, Home, ClipboardCheck, UserCheck, Pill,
  Heart
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Compact Animated Progress Step with glassmorphism
const ProgressStep = ({ step, isActive, isCompleted, gradientFrom, gradientTo, isLast, index }) => {
  return (
    <div className="flex flex-col items-center flex-1 relative">
      <div className="flex items-center w-full">
        <div className="h-[3px] flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className={`h-full transition-all duration-1000 ease-out rounded-full ${isCompleted ? 'w-full' : 'w-0'}`}
            style={{
              background: isCompleted ? `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` : 'transparent',
              boxShadow: isCompleted ? `0 0 8px ${gradientFrom}50` : 'none'
            }}
          />
        </div>
        <div className="relative">
          {isActive && (
            <div className="absolute -inset-1 rounded-full" style={{ background: `radial-gradient(circle, ${gradientFrom}30, transparent)`, animation: 'slowBlink 2s ease-in-out infinite' }} />
          )}
          <div
            className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500`}
            style={{
              background: (isCompleted || isActive)
                ? `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
                : 'rgba(255,255,255,0.06)',
              boxShadow: (isCompleted || isActive) ? `0 2px 10px ${gradientFrom}35` : 'none'
            }}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            ) : isActive ? (
              <step.icon className="w-3.5 h-3.5 text-white" />
            ) : (
              <step.icon className="w-3.5 h-3.5 text-white/30" />
            )}
          </div>
        </div>
        <div className="h-[3px] flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className={`h-full transition-all duration-1000 ease-out delay-300 rounded-full ${isCompleted && !isLast ? 'w-full' : 'w-0'}`}
            style={{
              background: (isCompleted && !isLast) ? `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` : 'transparent',
              boxShadow: (isCompleted && !isLast) ? `0 0 8px ${gradientFrom}50` : 'none'
            }}
          />
        </div>
      </div>
      <span className={`text-[10px] mt-1.5 font-medium text-center transition-all duration-500 ${isCompleted ? 'text-white/90' : isActive ? 'text-white font-semibold' : 'text-white/30'}`}>
        {step.label}
      </span>
    </div>
  );
};

const TRACKER_STYLES = `
@keyframes slowBlink {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.5; }
}
`;

// Status message for each step
const getStatusMessage = (status, type) => {
  const messages = {
    diagyn: {
      'Booked': { text: 'Appointment confirmed! See you soon', emoji: '📅' },
      'CheckedIn': { text: 'You\'re checked in! Please wait', emoji: '✅' },
      'WithDoctor': { text: 'Doctor is seeing you now', emoji: '👨‍⚕️' },
      'Completed': { text: 'Visit complete. Take care!', emoji: '💚' }
    },
    pharmacy: {
      'booked': { text: 'Order confirmed! Preparing soon', emoji: '📦' },
      'packing': { text: 'Pharmacist is packing your order', emoji: '💊' },
      'out_for_delivery': { text: 'On the way to you!', emoji: '🚚' },
      'completed': { text: 'Delivered! Stay healthy', emoji: '🏠' }
    },
    lab: {
      'booked': { text: 'Booking confirmed!', emoji: '🧪' },
      'sample_collected': { text: 'Sample collected successfully', emoji: '✅' },
      'processing': { text: 'Lab is processing your sample', emoji: '🔬' },
      'completed': { text: 'Report ready!', emoji: '📋' }
    }
  };
  return messages[type]?.[status] || { text: 'In progress...', emoji: '⏳' };
};

// DiaGyn Card — deep navy-indigo-teal glassmorphism
const DiaGynCard = ({ appointment, onClick }) => {
  const steps = [
    { key: 'Booked', label: 'Booked', icon: ClipboardCheck },
    { key: 'CheckedIn', label: 'Checked In', icon: UserCheck },
    { key: 'WithDoctor', label: 'Consulting', icon: Stethoscope },
    { key: 'Completed', label: 'Done', icon: Heart }
  ];
  
  const currentStepIndex = steps.findIndex(s => s.key === appointment.status);
  const statusMsg = getStatusMessage(appointment.status, 'diagyn');
  
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-3.5 cursor-pointer transition-all duration-300 hover:scale-[1.01] relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 30%, #134E4A 65%, #0C4A6E 100%)',
        border: '1px solid rgba(99,102,241,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(129,140,248,0.08)',
      }}
      data-testid="diagyn-tracker-card"
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 65%)' }} />
      <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 15%, rgba(129,140,248,0.12) 50%, transparent 85%)' }} />

      <div className="flex items-start justify-between mb-2.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Stethoscope className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">DiaGyn Appointment</p>
            <p className="text-indigo-300/70 text-xs">{appointment.doctor}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(129,140,248,0.12)' }}>
            <p className="text-indigo-200 font-bold text-xs">{appointment.time}</p>
          </div>
          <p className="text-teal-300/50 text-[10px] mt-0.5">{appointment.date}</p>
        </div>
      </div>

      <div className="mb-2.5 px-3 py-1.5 rounded-lg relative z-10" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(129,140,248,0.08)' }}>
        <p className="text-white text-xs flex items-center gap-1.5">
          <span>{statusMsg.emoji}</span>
          <span className="font-medium">{statusMsg.text}</span>
        </p>
      </div>

      <div className="flex items-start py-2 pb-4 relative z-10">
        {steps.map((step, idx) => (
          <ProgressStep key={step.key} step={step} index={idx} isActive={idx === currentStepIndex} isCompleted={idx < currentStepIndex} gradientFrom="#818CF8" gradientTo="#2DD4BF" isLast={idx === steps.length - 1} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 relative z-10" style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
        <div className="flex items-center gap-1.5 text-teal-300/60 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>{appointment.clinic}</span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-200/70 text-xs font-medium">
          <span>#{appointment.booking_id}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

// Pharmacy Card — warm amber-burgundy-copper glassmorphism
const PharmacyCard = ({ order, onClick }) => {
  const steps = [
    { key: 'booked', label: 'Confirmed', icon: ClipboardCheck },
    { key: 'packing', label: 'Packed', icon: Package },
    { key: 'out_for_delivery', label: 'Delivery', icon: Truck },
    { key: 'completed', label: 'Delivered', icon: Home }
  ];
  
  const statusMap = {
    'pending': 0, 'booked': 0, 'pharmacist_call': 0,
    'packing': 1, 'packed': 1,
    'out_for_delivery': 2, 'dispatched': 2,
    'completed': 3, 'delivered': 3
  };
  
  const currentStepIndex = statusMap[order.status?.toLowerCase()] ?? 0;
  const currentStatus = Object.keys(statusMap).find(k => statusMap[k] === currentStepIndex) || 'booked';
  const statusMsg = getStatusMessage(currentStatus, 'pharmacy');
  
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-3.5 cursor-pointer transition-all duration-300 hover:scale-[1.01] relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1C1917 0%, #78350F 30%, #92400E 60%, #451A03 100%)',
        border: '1px solid rgba(245,158,11,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(251,191,36,0.08)',
      }}
      data-testid="pharmacy-tracker-card"
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)' }} />
      <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 15%, rgba(251,191,36,0.12) 50%, transparent 85%)' }} />

      <div className="flex items-start justify-between mb-2.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.12)' }}>
            <Pill className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Orange Pharmacy</p>
            <p className="text-amber-300/70 text-xs">{order.medicines?.length || 0} medicine(s)</p>
          </div>
        </div>
        <div className="text-right">
          <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.12)' }}>
            <p className="text-amber-200 font-bold text-xs">Rs.{order.total_amount || order.total || 0}</p>
          </div>
          <p className="text-amber-300/50 text-[10px] mt-0.5">{order.payment_status || 'COD'}</p>
        </div>
      </div>

      <div className="mb-2.5 px-3 py-1.5 rounded-lg relative z-10" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.08)' }}>
        <p className="text-white text-xs flex items-center gap-1.5">
          <span>{statusMsg.emoji}</span>
          <span className="font-medium">{statusMsg.text}</span>
        </p>
      </div>

      <div className="flex items-start py-2 pb-4 relative z-10">
        {steps.map((step, idx) => (
          <ProgressStep key={step.key} step={step} index={idx} isActive={idx === currentStepIndex} isCompleted={idx < currentStepIndex} gradientFrom="#FBBF24" gradientTo="#F59E0B" isLast={idx === steps.length - 1} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 relative z-10" style={{ borderTop: '1px solid rgba(251,191,36,0.1)' }}>
        <div className="flex items-center gap-1.5 text-amber-300/60 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Est. {order.estimated_delivery || 'Today'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-200/70 text-xs font-medium">
          <span>#{order.id?.slice(-8) || 'Order'}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

// Labs Card — emerald-sapphire-forest glassmorphism
const LabsCard = ({ order, onClick }) => {
  const steps = [
    { key: 'booked', label: 'Booked', icon: ClipboardCheck },
    { key: 'sample_collected', label: 'Collected', icon: TestTube },
    { key: 'processing', label: 'Processing', icon: Circle },
    { key: 'completed', label: 'Report', icon: CheckCircle2 }
  ];
  
  const statusMap = {
    'booked': 0, 'pending': 0, 'confirmed': 0,
    'sample_collected': 1, 'collected': 1,
    'processing': 2, 'in_progress': 2,
    'completed': 3, 'report_ready': 3
  };
  
  const currentStepIndex = statusMap[order.status?.toLowerCase()] ?? 0;
  const currentStatus = Object.keys(statusMap).find(k => statusMap[k] === currentStepIndex) || 'booked';
  const statusMsg = getStatusMessage(currentStatus, 'lab');
  
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-3.5 cursor-pointer transition-all duration-300 hover:scale-[1.01] relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #021A17 0%, #042F2E 30%, #0A3D3B 60%, #03302E 100%)',
        border: '1px solid rgba(52,211,153,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      data-testid="lab-tracker-card"
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)' }} />
      <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 15%, rgba(110,231,183,0.12) 50%, transparent 85%)' }} />

      <div className="flex items-start justify-between mb-2.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.12)' }}>
            <TestTube className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Mango Labs</p>
            <p className="text-emerald-300/70 text-xs">{order.tests?.length || 1} test(s)</p>
          </div>
        </div>
        <div className="text-right">
          <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(110,231,183,0.12)' }}>
            <p className="text-emerald-200 font-bold text-xs">{order.preferred_time || 'Morning'}</p>
          </div>
          <p className="text-cyan-300/50 text-[10px] mt-0.5">{order.preferred_date}</p>
        </div>
      </div>

      <div className="mb-2.5 px-3 py-1.5 rounded-lg relative z-10" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(110,231,183,0.08)' }}>
        <p className="text-white text-xs flex items-center gap-1.5">
          <span>{statusMsg.emoji}</span>
          <span className="font-medium">{statusMsg.text}</span>
        </p>
      </div>

      <div className="flex items-start py-2 pb-4 relative z-10">
        {steps.map((step, idx) => (
          <ProgressStep key={step.key} step={step} index={idx} isActive={idx === currentStepIndex} isCompleted={idx < currentStepIndex} gradientFrom="#6EE7B7" gradientTo="#22D3EE" isLast={idx === steps.length - 1} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 relative z-10" style={{ borderTop: '1px solid rgba(52,211,153,0.1)' }}>
        <div className="flex items-center gap-1.5 text-emerald-300/60 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>{order.collection_type === 'home' ? 'Home Collection' : 'Lab Visit'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-200/70 text-xs font-medium">
          <span>#{order.order_id?.slice(-6) || order.id?.slice(-6) || 'Test'}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

// Main Component
const ActiveOrdersTracker = ({ phone }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (phone) {
      fetchAllOrders();
    } else {
      setLoading(false);
    }
  }, [phone]);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      
      const [guestRes] = await Promise.all([
        fetch(`${API}/api/guest/orders?phone=${cleanPhone}`).then(r => r.json()).catch(() => ({}))
      ]);
      
      // Filter active orders only
      const now = new Date();
      const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

      // DiaGyn: hide if appointment date has passed
      const activeAppointments = (guestRes.appointments || [])
        .filter(a => {
          if (!['Booked', 'CheckedIn', 'WithDoctor'].includes(a.status)) return false;
          // Parse appointment date and check if it's still today or future
          const aptDate = a.date ? new Date(a.date) : null;
          if (aptDate) {
            const endOfAptDay = new Date(aptDate);
            endOfAptDay.setHours(23, 59, 59, 999);
            if (now > endOfAptDay) return false;
          }
          return true;
        })
        .slice(0, 2);
      
      // Pharmacy: hide 48 hours after order creation
      const activePharmacy = (guestRes.pharmacy_orders || [])
        .filter(o => {
          if (['completed', 'delivered', 'cancelled'].includes(o.status?.toLowerCase())) return false;
          const created = o.created_at ? new Date(o.created_at) : null;
          if (created && (now - created) > FORTY_EIGHT_HOURS) return false;
          return true;
        })
        .slice(0, 2);
      
      // Labs: hide 48 hours after order creation
      const activeLabs = (guestRes.diagnostic_orders || [])
        .filter(o => {
          if (['completed', 'report_ready', 'cancelled'].includes(o.status?.toLowerCase())) return false;
          const created = o.created_at ? new Date(o.created_at) : null;
          if (created && (now - created) > FORTY_EIGHT_HOURS) return false;
          return true;
        })
        .slice(0, 2);
      
      setAppointments(activeAppointments);
      setPharmacyOrders(activePharmacy);
      setLabOrders(activeLabs);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalActive = appointments.length + pharmacyOrders.length + labOrders.length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-32 rounded-2xl" style={{ background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)' }}></div>
      </div>
    );
  }

  // Show empty state when no active orders - compact & clickable
  if (totalActive === 0) {
    return (
      <div data-testid="active-orders-empty" onClick={() => navigate('/my-appointments')} className="cursor-pointer active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold">All Clear!</p>
            <p className="text-gray-500 text-[11px]">No active appointments or orders</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="active-orders-tracker">
      <style>{TRACKER_STYLES}</style>
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-white">My Tracker</h2>
          <p className="text-xs text-gray-400">{totalActive} active</p>
        </div>
        <button 
          onClick={() => navigate('/my-appointments')}
          className="text-sm text-teal-600 font-medium flex items-center gap-1 hover:text-teal-700"
          data-testid="view-all-orders-btn"
        >
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {appointments.map((apt, idx) => (
          <DiaGynCard 
            key={apt.id || idx}
            appointment={apt}
            onClick={() => navigate('/my-appointments')}
          />
        ))}
        
        {pharmacyOrders.map((order, idx) => (
          <PharmacyCard 
            key={order.id || idx}
            order={order}
            onClick={() => navigate('/track')}
          />
        ))}
        
        {labOrders.map((order, idx) => (
          <LabsCard 
            key={order.id || idx}
            order={order}
            onClick={() => navigate('/track')}
          />
        ))}
      </div>
    </div>
  );
};

export default ActiveOrdersTracker;
