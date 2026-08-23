import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, AlertTriangle, ScanLine, HeartPulse, Upload, FileText, CalendarDays, Home, Camera, Mic } from 'lucide-react';

const WHATSAPP_NUMBER = '918108888330';
const PHONE_NUMBER = '+918108888330';

const QuickActions = ({ className = '' }) => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'voice-book',
      label: 'Voice Book',
      icon: Mic,
      path: '/voice-booking',
      gradient: 'from-teal-500 to-emerald-500',
      shadowColor: 'shadow-teal-500/30'
    },
    {
      id: 'scan-rx',
      label: 'Scan Rx',
      icon: Camera,
      path: '/prescription-scanner',
      gradient: 'from-violet-500 to-purple-500',
      shadowColor: 'shadow-violet-500/30'
    },
    {
      id: 'book-call',
      label: 'Book via Call',
      icon: Phone,
      action: () => { window.location.href = `tel:${PHONE_NUMBER}`; },
      gradient: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/30'
    },
    {
      id: 'book-whatsapp',
      label: 'Book via WhatsApp',
      icon: MessageCircle,
      action: () => { window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I want to book an appointment at Nevika Cura`, '_blank'); },
      gradient: 'from-green-500 to-emerald-500',
      shadowColor: 'shadow-green-500/30'
    },
    {
      id: 'upload-rx',
      label: 'Upload Rx',
      icon: Upload,
      path: '/pharmacy?upload=true',
      gradient: 'from-pink-500 to-rose-500',
      shadowColor: 'shadow-pink-500/30'
    },
    {
      id: 'my-prescriptions',
      label: 'My Rx',
      icon: FileText,
      path: '/prescriptions',
      gradient: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/30'
    },
    {
      id: 'apt-calendar',
      label: 'Calendar',
      icon: CalendarDays,
      path: '/appointment-calendar',
      gradient: 'from-teal-500 to-cyan-500',
      shadowColor: 'shadow-teal-500/30'
    },
    {
      id: 'home-test',
      label: 'Home Test',
      icon: Home,
      path: '/appointment-calendar?hometest=true',
      gradient: 'from-indigo-500 to-violet-500',
      shadowColor: 'shadow-indigo-500/30'
    },
    {
      id: 'sonography',
      label: 'Sonography',
      icon: ScanLine,
      path: '/mango?section=sonography',
      gradient: 'from-purple-500 to-violet-500',
      shadowColor: 'shadow-purple-500/30'
    },
    {
      id: 'ecg',
      label: 'Book ECG',
      icon: HeartPulse,
      path: '/mango?section=ecg',
      gradient: 'from-pink-500 to-rose-500',
      shadowColor: 'shadow-pink-500/30'
    },
    {
      id: 'emergency',
      label: 'Emergency',
      icon: AlertTriangle,
      path: '/emergency',
      gradient: 'from-red-500 to-rose-500',
      shadowColor: 'shadow-red-500/30',
      pulse: true
    }
  ];

  return (
    <div className={`${className}`}>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => action.action ? action.action() : navigate(action.path)}
            className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r ${action.gradient} text-white font-semibold text-sm shadow-lg ${action.shadowColor} hover:scale-105 active:scale-95 transition-all duration-200 ${action.pulse ? 'animate-pulse' : ''}`}
            data-testid={`quick-action-${action.id}`}
          >
            <action.icon className="w-5 h-5" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
