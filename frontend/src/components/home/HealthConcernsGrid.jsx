import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Shop by Health Concerns Grid
 * Based on reference screenshot showing Diabetes, Heart Care, etc.
 */
const HealthConcernsGrid = () => {
  const navigate = useNavigate();

  const healthConcerns = [
    {
      id: 'diabetes',
      name: 'Diabetes',
      icon: '🩸',
      path: '/glydex',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'heart-care',
      name: 'Heart Care',
      icon: '❤️',
      path: '/mango?category=cardiac',
      color: 'from-red-500 to-rose-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 'stomach-care',
      name: 'Stomach Care',
      icon: '💊',
      path: '/pharmacy?category=digestive',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: 'liver-care',
      name: 'Liver Care',
      icon: '🫀',
      path: '/mango?category=liver',
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-50'
    },
    {
      id: 'bone-joint',
      name: 'Bone & Joint',
      icon: '🦴',
      path: '/pharmacy?category=pain',
      color: 'from-slate-500 to-gray-600',
      bgColor: 'bg-slate-50'
    },
    {
      id: 'kidney-care',
      name: 'Kidney Care',
      icon: '🫘',
      path: '/mango?category=kidney',
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'skin-care',
      name: 'Skin Care',
      icon: '✨',
      path: '/pharmacy?category=derma',
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50'
    },
    {
      id: 'respiratory',
      name: 'Respiratory',
      icon: '🫁',
      path: '/pharmacy?category=respiratory',
      color: 'from-cyan-500 to-teal-600',
      bgColor: 'bg-cyan-50'
    },
    {
      id: 'eye-care',
      name: 'Eye Care',
      icon: '👁️',
      path: '/pharmacy?category=eye',
      color: 'from-sky-500 to-blue-600',
      bgColor: 'bg-sky-50'
    }
  ];

  return (
    <div className="py-6" data-testid="health-concerns-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Shop by Health Concerns</h2>
        <button className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
          See All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {healthConcerns.map((concern) => (
          <button
            key={concern.id}
            onClick={() => navigate(concern.path)}
            className={`relative overflow-hidden rounded-xl ${concern.bgColor} border border-white/50 p-3 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-md group`}
            data-testid={`health-concern-${concern.id}`}
          >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${concern.color} flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform`}>
              <span className="text-xl">{concern.icon}</span>
            </div>
            
            {/* Name */}
            <span className="text-xs font-medium text-slate-700 text-center leading-tight">{concern.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HealthConcernsGrid;
