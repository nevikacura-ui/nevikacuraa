import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Pill, TestTube, AlertTriangle, Video, Heart } from 'lucide-react';

const QuickActions = ({ className = '' }) => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'book-doctor',
      label: 'Book Doctor',
      icon: Calendar,
      path: '/diagyn',
      gradient: 'from-teal-500 to-cyan-500',
      shadowColor: 'shadow-teal-500/30'
    },
    {
      id: 'order-meds',
      label: 'Order Meds',
      icon: Pill,
      path: '/pharmacy',
      gradient: 'from-orange-500 to-amber-500',
      shadowColor: 'shadow-orange-500/30'
    },
    {
      id: 'lab-test',
      label: 'Lab Test',
      icon: TestTube,
      path: '/proton',
      gradient: 'from-blue-500 to-indigo-500',
      shadowColor: 'shadow-blue-500/30'
    },
    {
      id: 'teleconsult',
      label: 'Video Call',
      icon: Video,
      path: '/teleconsultation',
      gradient: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/30'
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
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r ${action.gradient} text-white font-medium text-sm shadow-lg ${action.shadowColor} hover:scale-105 active:scale-95 transition-all duration-200 ${action.pulse ? 'animate-pulse' : ''}`}
            data-testid={`quick-action-${action.id}`}
          >
            <action.icon className="w-4 h-4" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
