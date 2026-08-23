import React from 'react';
import { Award, MapPin, Pill, TestTube } from 'lucide-react';

const statsData = [
  { value: '6+', label: 'Services', icon: Award, color: 'from-violet-500/20 to-purple-500/20', textColor: 'text-purple-400' },
  { value: '2', label: 'Clinic Locations', icon: MapPin, color: 'from-sky-500/20 to-blue-500/20', textColor: 'text-blue-400' },
  { value: '4000+', label: 'Medicines', icon: Pill, color: 'from-orange-500/20 to-amber-500/20', textColor: 'text-orange-400' },
  { value: '100+', label: 'Lab Tests', icon: TestTube, color: 'from-pink-500/20 to-rose-500/20', textColor: 'text-pink-400' }
];

const QuickStats = ({ stats = statsData }) => {
  return (
    <div className="mb-16">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="relative group">
            <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 p-6">
              <div className={`w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
              </div>
              <p className="font-bold text-3xl text-white">{stat.value}</p>
              <p className="text-gray-400 mt-1 text-sm">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickStats;
