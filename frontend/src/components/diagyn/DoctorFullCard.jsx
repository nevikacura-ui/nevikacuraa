import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { selectionTap } from '@/utils/haptics';
import { 
  User, Stethoscope, GraduationCap, Heart, Star, Users, 
  Calendar, CalendarCheck, MessageCircle 
} from 'lucide-react';

const DoctorFullCard = ({ doctor, onBookAppointment }) => {
  return (
    <div 
      className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl hover:shadow-[0_0_60px_rgba(59,130,246,0.15)] hover:border-blue-500/30 transition-all duration-300"
      data-testid={`doctor-card-${doctor.id}`}
    >
      {/* Top Section: Photo and Basic Info */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Large Doctor Photo */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="relative">
              <img 
                src={doctor.image} 
                alt={doctor.name}
                className="w-36 h-36 md:w-44 md:h-44 rounded-2xl object-cover ring-4 ring-blue-500/30 shadow-xl shadow-blue-500/20"
                data-testid={`doctor-image-${doctor.id}`}
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-[#0D0D0D] flex items-center justify-center shadow-lg shadow-green-500/30">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Name, Specialty, Rating */}
          <div className="flex-1 text-center md:text-left">
            <Badge className="bg-blue-500/20 text-blue-400 rounded-full px-4 py-1.5 text-xs font-semibold border border-blue-500/30 mb-3 inline-flex items-center gap-1.5 backdrop-blur">
              <Stethoscope className="w-3.5 h-3.5" />
              {doctor.specialty}
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {doctor.name}
            </h2>
            
            {/* Rating Row */}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <div className="flex items-center gap-1.5 bg-yellow-500/20 px-3 py-1.5 rounded-full border border-yellow-500/30 backdrop-blur">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold">{doctor.rating}</span>
              </div>
              <span className="text-gray-400 text-sm">• Excellent Rating</span>
            </div>
            
            {/* Stats Row - 4 columns */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2.5 bg-white/5 backdrop-blur rounded-xl border border-white/10">
                <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{doctor.patients}</p>
                <p className="text-[10px] text-gray-400">Patients</p>
              </div>
              <div className="text-center p-2.5 bg-white/5 backdrop-blur rounded-xl border border-white/10">
                <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{doctor.experience}</p>
                <p className="text-[10px] text-gray-400">Experience</p>
              </div>
              <div className="text-center p-2.5 bg-white/5 backdrop-blur rounded-xl border border-white/10">
                <Star className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{doctor.rating}</p>
                <p className="text-[10px] text-gray-400">Rating</p>
              </div>
              <div className="text-center p-2.5 bg-white/5 backdrop-blur rounded-xl border border-white/10">
                <MessageCircle className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{doctor.reviews}</p>
                <p className="text-[10px] text-white">Reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <div className="px-6 py-4 border-t border-white/10">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          About Doctor
        </h3>
        <p className="text-gray-300 text-sm leading-relaxed">
          {doctor.about}
        </p>
      </div>
      
      {/* Qualifications Section */}
      <div className="px-6 py-4 border-t border-white/10">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-400" />
          Qualifications
        </h3>
        <p className="text-white font-medium text-sm">{doctor.qualifications}</p>
      </div>
      
      {/* Specialties Section */}
      <div className="px-6 py-4 border-t border-white/10">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-blue-400" />
          Specialties
        </h3>
        <div className="flex flex-wrap gap-2">
          {doctor.specializations.map((spec, i) => (
            <Badge 
              key={i}
              className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur"
            >
              {spec}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Book Appointment Button */}
      <div className="p-6 border-t border-white/10 bg-white/[0.02]">
        <Button
          onClick={() => {
            selectionTap();
            onBookAppointment(doctor.id);
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 rounded-2xl text-base font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
          data-testid={`book-appointment-${doctor.id}`}
        >
          <CalendarCheck className="w-5 h-5" />
          Book Appointment
        </Button>
      </div>
    </div>
  );
};

export default DoctorFullCard;
