import React from 'react';
import { featuredDoctors } from '@/data/homeData';

const FeaturedDoctors = () => {
  return (
    <div className="mb-16" data-testid="featured-doctors">
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1.5 bg-blue-500/20 backdrop-blur rounded-full text-blue-400 text-sm font-medium mb-3 border border-blue-500/30">
          Our Experts
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Meet Our Doctors</h2>
        <p className="text-gray-400 mt-2">Experienced specialists dedicated to your health</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {featuredDoctors.map((doctor) => (
          <div 
            key={doctor.id}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-white/20 hover:bg-white/10 shadow-xl hover:shadow-2xl transition-all overflow-hidden group"
          >
            {/* Doctor Avatar with Glass Effect */}
            <div className={`h-36 bg-gradient-to-br ${doctor.color} flex items-center justify-center relative`}>
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
              <div className="relative w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center text-white text-3xl font-bold border-4 border-white/30 shadow-xl">
                {doctor.avatar}
              </div>
            </div>
            
            {/* Doctor Info */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-white">{doctor.name}</h3>
                  <p className={`text-sm font-medium ${doctor.textColor}`}>{doctor.specialty}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${doctor.badgeColor}`}>
                  {doctor.badge}
                </span>
              </div>
              
              <p className="text-sm text-gray-400 mb-4">{doctor.experience}</p>
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-400">{doctor.patients} patients</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400">★</span>
                  <span className="text-gray-400">{doctor.rating} rating</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedDoctors;
