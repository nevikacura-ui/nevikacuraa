import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, Clock, Filter, Heart, ChevronLeft, Phone, Calendar, Award, Stethoscope, X, CheckCircle, IndianRupee, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SPECIALTIES = [
  { id: 'all', label: 'All', color: '#1F4F46' },
  { id: 'gynecology', label: 'Gynecology', color: '#E91E63' },
  { id: 'cardiology', label: 'Cardiology', color: '#F44336' },
  { id: 'orthopedic', label: 'Orthopedic', color: '#2196F3' },
  { id: 'dermatology', label: 'Dermatology', color: '#9C27B0' },
  { id: 'neurology', label: 'Neurology', color: '#FF9800' },
  { id: 'pediatrics', label: 'Pediatrics', color: '#4CAF50' },
  { id: 'ent', label: 'ENT', color: '#00BCD4' },
];

const FEE_RANGES = [
  { id: 0, label: 'Any', min: 0, max: Infinity },
  { id: 1, label: 'Under 500', min: 0, max: 500 },
  { id: 2, label: '500-1000', min: 500, max: 1000 },
  { id: 3, label: '1000+', min: 1000, max: Infinity },
];

const DoctorCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(31,79,70,0.08)' }}>
    <div className="p-4">
      <div className="flex gap-3.5">
        <div className="w-20 h-20 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-3 mt-1">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-20 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

const DoctorCard = ({ doctor, onBook, isFav, onToggleFav }) => {
  const isAvailable = doctor.available_days?.includes(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );

  return (
    <div 
      className="relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)',
        border: '1px solid rgba(31,79,70,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
      data-testid={`doctor-card-${doctor.id}`}
    >
      {/* Available Now Badge */}
      {isAvailable && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Available Now
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-3.5">
          {/* Avatar with rating ring */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: `linear-gradient(135deg, #1F4F46, #2E6B5F)` }}>
              {doctor.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            {/* Rating circle */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
              style={{ background: doctor.rating >= 4.5 ? '#10B981' : doctor.rating >= 4 ? '#F59E0B' : '#EF4444' }}>
              {doctor.rating}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#1A2B28] text-base truncate">{doctor.name}</h3>
            <p className="text-xs text-[#4A6B64] mt-0.5">{doctor.specialization}</p>
            <p className="text-xs text-[#8A9E99] mt-0.5">{doctor.qualification}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-[#4A6B64]">
                <Award className="w-3 h-3" /> {doctor.experience_years}yr exp
              </span>
              <span className="flex items-center gap-1 text-xs text-[#4A6B64]">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {doctor.total_reviews} reviews
              </span>
            </div>
          </div>

          {/* Fav button */}
          <button onClick={(e) => { e.stopPropagation(); onToggleFav(doctor.id); }}
            className="self-start p-1.5 rounded-full transition-all"
            data-testid={`fav-doctor-${doctor.id}`}>
            <Heart className={`w-5 h-5 transition-all ${isFav ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-300'}`} />
          </button>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-[#6B8A83]">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{doctor.clinic}</span>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(31,79,70,0.06)' }}>
          <div>
            <span className="text-lg font-bold text-[#1F4F46]">₹{doctor.consultation_fee}</span>
            <span className="text-xs text-[#8A9E99] ml-1">consultation</span>
          </div>
          <Button 
            onClick={() => onBook(doctor)}
            className="h-9 px-5 rounded-xl text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
            data-testid={`book-doctor-${doctor.id}`}>
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Book
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function DoctorSearch() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [feeRange, setFeeRange] = useState(0);
  const [minExperience, setMinExperience] = useState(0);
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fav_doctors') || '[]'); } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const filterRef = useRef(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await axios.get(`${API}/api/doctors/all`);
      setDoctors(res.data.doctors || []);
    } catch { }
    setLoading(false);
  };

  const toggleFav = (id) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('fav_doctors', JSON.stringify(next));
  };

  const filtered = doctors.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization.toLowerCase().includes(search.toLowerCase());
    const matchSpec = selectedSpecialty === 'all' || d.specialization.toLowerCase().includes(selectedSpecialty.toLowerCase());
    const matchRating = !ratingFilter || (d.rating >= ratingFilter);
    const matchAvail = !onlyAvailable || d.available_days?.includes(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    const feeConfig = FEE_RANGES[feeRange];
    const matchFee = !feeRange || ((d.consultation_fee || 0) >= feeConfig.min && (d.consultation_fee || 0) < feeConfig.max);
    const matchExp = !minExperience || (d.experience_years >= minExperience);
    return matchSearch && matchSpec && matchRating && matchAvail && matchFee && matchExp;
  }).sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'fee_low') return (a.consultation_fee || 0) - (b.consultation_fee || 0);
    if (sortBy === 'fee_high') return (b.consultation_fee || 0) - (a.consultation_fee || 0);
    if (sortBy === 'experience') return (b.experience_years || 0) - (a.experience_years || 0);
    return 0;
  });

  const activeFilterCount = (ratingFilter > 0 ? 1 : 0) + (onlyAvailable ? 1 : 0) + (sortBy !== 'rating' ? 1 : 0) + (feeRange > 0 ? 1 : 0) + (minExperience > 0 ? 1 : 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7FAF9' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(180deg, #1F4F46 0%, #2A6B5E 100%)',
        paddingBottom: '1.25rem',
      }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Find Doctors</h1>
            <p className="text-xs text-white/60">{doctors.length} specialists available</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 mt-1">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, specialty, symptom..."
                className="w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 outline-none border border-white/10 focus:border-white/30"
                data-testid="doctor-search-input"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="relative h-11 px-3.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center" data-testid="filter-toggle">
              <Filter className="w-4.5 h-4.5 text-white/70" />
              {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] text-[9px] text-white font-bold flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mx-4 mt-2 p-3 rounded-xl bg-white/8 border border-white/10 space-y-3" data-testid="advanced-filters">
            <div>
              <p className="text-[10px] text-white/50 font-semibold uppercase mb-1.5">Min Rating</p>
              <div className="flex gap-1.5">
                {[0, 3, 3.5, 4, 4.5].map(r => (
                  <button key={r} onClick={() => setRatingFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${ratingFilter === r ? 'bg-[#10B981] text-white' : 'bg-white/8 text-white/50'}`}
                    data-testid={`rating-${r}`}>
                    {r === 0 ? 'Any' : `${r}+`} {r > 0 && <Star className="w-3 h-3 inline ml-0.5" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/50 font-semibold uppercase mb-1.5">Fee Range</p>
              <div className="flex gap-1.5">
                {FEE_RANGES.map(f => (
                  <button key={f.id} onClick={() => setFeeRange(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${feeRange === f.id ? 'bg-[#10B981] text-white' : 'bg-white/8 text-white/50'}`}
                    data-testid={`fee-${f.id}`}>
                    {f.label}{f.id > 0 && <IndianRupee className="w-3 h-3 inline ml-0.5" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/50 font-semibold uppercase mb-1.5">Min Experience</p>
              <div className="flex gap-1.5">
                {[0, 3, 5, 10, 15].map(y => (
                  <button key={y} onClick={() => setMinExperience(y)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${minExperience === y ? 'bg-[#10B981] text-white' : 'bg-white/8 text-white/50'}`}
                    data-testid={`exp-${y}`}>
                    {y === 0 ? 'Any' : `${y}yr+`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/50 font-semibold uppercase">Available Today Only</p>
              <button onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`w-10 h-5 rounded-full transition-all ${onlyAvailable ? 'bg-[#10B981]' : 'bg-white/15'}`}
                data-testid="avail-toggle">
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all`} style={{ marginLeft: onlyAvailable ? '22px' : '2px' }} />
              </button>
            </div>
            <div>
              <p className="text-[10px] text-white/50 font-semibold uppercase mb-1.5">Sort By</p>
              <div className="flex gap-1.5 flex-wrap">
                {[{ id: 'rating', label: 'Rating' }, { id: 'name', label: 'Name' }, { id: 'fee_low', label: 'Fee: Low' }, { id: 'fee_high', label: 'Fee: High' }, { id: 'experience', label: 'Experience' }].map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${sortBy === s.id ? 'bg-[#1F4F46] text-white' : 'bg-white/8 text-white/50'}`}
                    data-testid={`sort-${s.id}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => { setRatingFilter(0); setFeeRange(0); setMinExperience(0); setOnlyAvailable(false); setSortBy('rating'); }}
                className="w-full py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                data-testid="clear-filters">
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Specialty chips */}
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto no-scrollbar" ref={filterRef}>
          {SPECIALTIES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSpecialty(s.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                selectedSpecialty === s.id ? 'text-white scale-105 shadow-lg' : 'text-white/70 bg-white/8 hover:bg-white/15'
              }`}
              style={selectedSpecialty === s.id ? { background: s.color, boxShadow: `0 4px 12px ${s.color}40` } : {}}
              data-testid={`filter-${s.id}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <DoctorCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Stethoscope className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No doctors found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
          </div>
        ) : (
          filtered.map(d => (
            <DoctorCard
              key={d.id}
              doctor={d}
              isFav={favorites.includes(d.id)}
              onToggleFav={toggleFav}
              onBook={(doc) => navigate(`/diagyn?doctor=${doc.id}`)}
            />
          ))
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
