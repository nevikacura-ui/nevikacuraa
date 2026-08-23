import React from 'react';
import { Trophy, Users, Clock, Shield, Calendar, Stethoscope, Heart } from 'lucide-react';
import { whyChooseUs } from '@/data/homeData';

const iconMap = {
  Trophy,
  Users,
  Clock,
  Shield,
  Calendar,
  Stethoscope,
  Heart
};

const WhyChooseUs = () => {
  return (
    <div className="mb-16" data-testid="why-choose-us">
      <h2 className="text-2xl font-bold text-white mb-8 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>Why Choose Nevika Cura?</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {whyChooseUs.map((item, idx) => {
          const IconComponent = iconMap[item.icon] || Trophy;
          return (
            <div 
              key={idx}
              className="relative group p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/10 shadow-xl transition-all text-center overflow-hidden"
            >
              <div className={`absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br ${item.color} opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity`}></div>
              <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <IconComponent className="w-7 h-7 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <p className="text-sm text-gray-400">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WhyChooseUs;
