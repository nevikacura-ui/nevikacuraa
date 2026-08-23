import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Upload, Crown, Gift, HeartPulse } from 'lucide-react';

/**
 * Quick Action Cards - White cards on dark background
 */
const QuickActionCards = () => {
  const navigate = useNavigate();
  
  const WHATSAPP_NUMBER = '918108888330';
  const PHONE_NUMBER = '+918108888330';

  const actions = [
    {
      id: 'nevika-one',
      title: 'Nevika Cura',
      subtitle: 'ONE',
      icon: Crown,
      path: '/one',
      gradient: 'from-amber-500 to-orange-500',
      badge: 'NEW'
    },
    {
      id: 'book-call',
      title: 'Book via',
      subtitle: 'Call',
      icon: Phone,
      action: () => window.location.href = `tel:${PHONE_NUMBER}`,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'book-whatsapp',
      title: 'Book via',
      subtitle: 'WhatsApp',
      icon: MessageCircle,
      action: () => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I want to book an appointment at Nevika Cura`, '_blank'),
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      id: 'upload-rx',
      title: 'Upload',
      subtitle: 'Prescription',
      icon: Upload,
      path: '/pharmacy?upload=true',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      id: 'gift-health',
      title: 'Gift',
      subtitle: 'Health',
      icon: Gift,
      path: '/gift-cards',
      gradient: 'from-purple-500 to-violet-500',
      badge: 'NEW'
    },
    {
      id: 'care-programs',
      title: 'Care',
      subtitle: 'Programs',
      icon: HeartPulse,
      path: '/care-programs',
      gradient: 'from-red-500 to-rose-500',
      badge: 'SAVE 40%'
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
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            className="relative overflow-hidden rounded-2xl bg-white shadow-lg p-3 flex flex-col items-center justify-center min-h-[110px] transition-all duration-300 hover:scale-105 hover:shadow-xl group"
            data-testid={`quick-action-${action.id}`}
          >
            {/* Badge */}
            {action.badge && (
              <div className="absolute top-1.5 right-1.5">
                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold rounded-full animate-pulse">
                  {action.badge}
                </span>
              </div>
            )}
            
            {/* Icon */}
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            
            {/* Text */}
            <span className="text-[10px] font-medium text-slate-500 leading-tight">{action.title}</span>
            <span className="text-xs font-bold text-slate-800">{action.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionCards;
