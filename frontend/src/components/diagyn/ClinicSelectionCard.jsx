import React from 'react';
import { selectionTap } from '@/utils/haptics';
import { Building2, MapPin, CheckCircle2 } from 'lucide-react';

const ClinicSelectionCard = ({ clinic, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => {
        selectionTap();
        onSelect();
      }}
      data-testid={`clinic-card-${clinic.id}`}
      className={`
        cursor-pointer transition-all duration-300 rounded-3xl overflow-hidden border-2 backdrop-blur-xl
        ${isSelected 
          ? 'border-blue-500 shadow-xl shadow-blue-500/30 scale-[1.02] bg-blue-500/10' 
          : 'border-white/10 hover:border-blue-500/50 shadow-lg hover:shadow-xl bg-white/5 hover:bg-white/10'
        }
      `}
    >
      {/* Clinic Image with Enhanced Gradient */}
      <div className="h-36 overflow-hidden relative">
        <img 
          src={clinic.image} 
          alt={clinic.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/40 to-transparent" />
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold shadow-lg shadow-blue-500/30">
              <CheckCircle2 className="w-4 h-4" />
              Selected
            </div>
          </div>
        )}
        {/* Clinic Name on Image */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-bold text-lg text-white drop-shadow-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {clinic.name}
          </h3>
        </div>
      </div>
      
      {/* Clinic Info with Glass Effect */}
      <div className={`p-5 ${isSelected ? 'bg-blue-500/5' : 'bg-[#121212]'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl ${isSelected ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-white/10 border border-white/10'} flex items-center justify-center flex-shrink-0 backdrop-blur`}>
            <Building2 className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300 leading-relaxed flex items-start gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
              <span>{clinic.address}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicSelectionCard;
