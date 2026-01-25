import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Stethoscope, Pill, TestTube, Calendar, User, Heart, Baby, Activity, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

const GlobalSearch = ({ className = '' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Search categories and items
  const searchData = [
    // Doctors
    { type: 'doctor', name: 'Dr. Vikas Jha', subtitle: 'Diabetologist & Physician', icon: Stethoscope, path: '/diagyn', keywords: ['diabetes', 'physician', 'doctor', 'vikas'] },
    { type: 'doctor', name: 'Dr. Neha Patel', subtitle: 'OBGYN Specialist', icon: Stethoscope, path: '/diagyn', keywords: ['obgyn', 'women', 'pregnancy', 'neha'] },
    
    // Services
    { type: 'service', name: 'Book Appointment', subtitle: 'Schedule a doctor visit', icon: Calendar, path: '/diagyn', keywords: ['appointment', 'book', 'doctor', 'visit', 'schedule'] },
    { type: 'service', name: 'Order Medicines', subtitle: 'Pharmacy & prescriptions', icon: Pill, path: '/pharmacy', keywords: ['medicine', 'pharmacy', 'order', 'prescription', 'drug'] },
    { type: 'service', name: 'Lab Tests', subtitle: 'Book diagnostic tests', icon: TestTube, path: '/proton', keywords: ['lab', 'test', 'diagnostic', 'blood', 'report'] },
    { type: 'service', name: 'Teleconsultation', subtitle: 'Video call with doctor', icon: User, path: '/teleconsultation', keywords: ['video', 'call', 'online', 'teleconsult', 'virtual'] },
    
    // Specialty Services
    { type: 'specialty', name: 'Diabetes Care', subtitle: 'Glydex - Sugar management', icon: Activity, path: '/glydex', keywords: ['diabetes', 'sugar', 'glydex', 'glucose'] },
    { type: 'specialty', name: "Women's Health", subtitle: 'Evara - Complete care', icon: Heart, path: '/evara', keywords: ['women', 'evara', 'pregnancy', 'gynec'] },
    { type: 'specialty', name: "Kids Health", subtitle: 'Alyne - Pediatric care', icon: Baby, path: '/alyne', keywords: ['kids', 'child', 'pediatric', 'alyne', 'baby'] },
    
    // Tests
    { type: 'test', name: 'Full Body Checkup', subtitle: 'Complete health screening', icon: TestTube, path: '/proton', keywords: ['full body', 'checkup', 'complete', 'health'] },
    { type: 'test', name: 'Thyroid Profile', subtitle: 'T3, T4, TSH tests', icon: TestTube, path: '/proton', keywords: ['thyroid', 't3', 't4', 'tsh'] },
    { type: 'test', name: 'Pregnancy Test', subtitle: 'Beta HCG & more', icon: TestTube, path: '/proton', keywords: ['pregnancy', 'hcg', 'beta'] },
    { type: 'test', name: 'Diabetes Panel', subtitle: 'HbA1c, Fasting glucose', icon: TestTube, path: '/proton', keywords: ['diabetes', 'hba1c', 'glucose', 'sugar'] },
  ];

  // Filter results based on query
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = searchData.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.subtitle.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(k => k.includes(lowerQuery))
    ).slice(0, 6);

    setResults(filtered);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    navigate(item.path);
    setQuery('');
    setIsOpen(false);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'doctor': return 'bg-teal-100 text-teal-700';
      case 'service': return 'bg-blue-100 text-blue-700';
      case 'specialty': return 'bg-purple-100 text-purple-700';
      case 'test': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'doctor': return 'Doctor';
      case 'service': return 'Service';
      case 'specialty': return 'Specialty';
      case 'test': return 'Test';
      default: return '';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search doctors, medicines, tests..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-12 pr-10 py-3 h-12 rounded-full border-slate-200 bg-white/80 backdrop-blur-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-base"
          data-testid="global-search-input"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {results.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                data-testid={`search-result-${idx}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(item.type)}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-slate-800 group-hover:text-teal-600 transition-colors">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.subtitle}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(item.type)}`}>
                  {getTypeLabel(item.type)}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Suggestions when focused but no query */}
      {isOpen && query.length < 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {['Book Doctor', 'Order Medicines', 'Blood Test', 'Diabetes', 'Pregnancy'].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 rounded-full text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
