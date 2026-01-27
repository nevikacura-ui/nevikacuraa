import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Upload, Package } from 'lucide-react';

/**
 * Quick Action Cards - Book via Call, WhatsApp, Upload Prescription, Full Body Packages
 * WhatsApp: 9403890429
 */
const QuickActionCards = () => {
  const navigate = useNavigate();
  
  // WhatsApp number for Nevika Cura
  const WHATSAPP_NUMBER = '919403890429';
  const PHONE_NUMBER = '+919403890429';

  const actions = [
    {
      id: 'full-body',
      title: 'Full body',
      subtitle: 'Packages',
      icon: Package,
      path: '/health-packages',
      gradient: 'from-purple-400 to-violet-500',
      bgGradient: 'from-purple-100 to-violet-50'
    },
    {
      id: 'book-call',
      title: 'Book via',
      subtitle: 'Call',
      icon: Phone,
      action: () => window.location.href = `tel:${PHONE_NUMBER}`,
      gradient: 'from-blue-400 to-cyan-500',
      bgGradient: 'from-blue-100 to-cyan-50'
    },
    {
      id: 'book-whatsapp',
      title: 'Book via',
      subtitle: 'WhatsApp',
      icon: MessageCircle,
      action: () => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I want to book an appointment at Nevika Cura`, '_blank'),
      gradient: 'from-green-400 to-emerald-500',
      bgGradient: 'from-green-100 to-emerald-50'
    },
    {
      id: 'upload-rx',
      title: 'Upload',
      subtitle: 'Prescription',
      icon: Upload,
      path: '/pharmacy?upload=true',
      gradient: 'from-pink-400 to-rose-500',
      bgGradient: 'from-pink-100 to-rose-50'
    }
  ];

  const handleClick = (action) => {
    if (action.action) {
      action.action();
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="py-4" data-testid="quick-action-cards-section">
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${action.bgGradient} border border-white/50 p-3 flex flex-col items-center justify-center min-h-[100px] transition-all duration-300 hover:scale-105 hover:shadow-lg group`}
            data-testid={`quick-action-${action.id}`}
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            
            {/* Text */}
            <span className="text-[10px] font-medium text-slate-600 leading-tight">{action.title}</span>
            <span className="text-xs font-bold text-slate-800">{action.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionCards;
