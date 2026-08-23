import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Stethoscope, TestTube, Pill, Building2, ArrowRight, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { doctors } from '@/pages/diagyn/data';

const API = process.env.REACT_APP_BACKEND_URL;

const SERVICES = [
  { name: 'Book Doctor Appointment', type: 'service', path: '/diagyn', keywords: 'doctor appointment consultation obgy diabetes physician' },
  { name: 'Order Medicines', type: 'service', path: '/pharmacy', keywords: 'pharmacy medicine prescription drug tablet' },
  { name: 'Book Lab Tests', type: 'service', path: '/mango', keywords: 'lab test blood pathology report' },
  { name: 'Ultrasound / ECG', type: 'service', path: '/mango/ultrasound', keywords: 'ultrasound ecg sonography proton scan' },
  { name: 'Genetic Testing', type: 'service', path: '/nexugene', keywords: 'genetic prenatal cancer genomics nexugene' },
  { name: 'Diabetes Management', type: 'service', path: '/glydex', keywords: 'diabetes sugar glucose hba1c insulin glydex' },
  { name: 'Pregnancy Care', type: 'service', path: '/aanya', keywords: 'pregnancy anc antenatal maternity baby aanya' },
  { name: 'Skin & Hair Care', type: 'service', path: '/reneu', keywords: 'skin hair derma reneu cosmetic' },
  { name: 'Mental Wellness', type: 'service', path: '/evara', keywords: 'mental health stress anxiety wellness evara' },
  { name: 'CuraPay Wallet', type: 'service', path: '/cura-wallet', keywords: 'wallet pay balance curapay money' },
];

const DOCTORS = doctors.map(d => ({
  name: d.name,
  type: 'doctor',
  specialty: `${d.specialty} · ${d.experience}`,
  path: '/diagyn',
  keywords: [d.name, d.specialty, ...d.specializations].join(' ').toLowerCase(),
}));

const TRENDING_SEARCHES = [
  { text: 'Paracetamol', type: 'medicine' },
  { text: 'CBC Test', type: 'test' },
  { text: 'Thyroid Profile', type: 'test' },
  { text: 'Vitamin D', type: 'medicine' },
  { text: 'Blood Sugar', type: 'test' },
  { text: 'Azithromycin', type: 'medicine' },
];

const IconForType = ({ type, className }) => {
  switch (type) {
    case 'doctor': return <Stethoscope className={className} />;
    case 'test': return <TestTube className={className} />;
    case 'medicine': return <Pill className={className} />;
    case 'service': return <Building2 className={className} />;
    default: return <Search className={className} />;
  }
};

const typeColors = {
  doctor: 'text-teal-400',
  test: 'text-lime-400',
  medicine: 'text-orange-400',
  service: 'text-cyan-400',
};

const typeLabels = {
  doctor: 'Doctor',
  test: 'Lab Test',
  medicine: 'Medicine',
  service: 'Service',
};

const GlobalSearch = ({ isDarkMode = true }) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nc_recent_searches') || '[]');
      setRecentSearches(saved.slice(0, 6));
    } catch { setRecentSearches([]); }
  }, []);

  const saveSearch = (text) => {
    try {
      const saved = JSON.parse(localStorage.getItem('nc_recent_searches') || '[]');
      const updated = [text, ...saved.filter(s => s !== text)].slice(0, 8);
      localStorage.setItem('nc_recent_searches', JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 6));
    } catch {}
  };

  const clearRecent = () => {
    localStorage.removeItem('nc_recent_searches');
    setRecentSearches([]);
  };

  const searchMedicines = useCallback(async (q) => {
    if (q.length < 2) { setMedicines([]); return; }
    try {
      const res = await fetch(`${API}/api/pharmacy/search?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setMedicines((data.medicines || []).slice(0, 5).map(m => ({
          name: m.name || m.medicine_name,
          type: 'medicine',
          path: '/pharmacy',
          detail: [m.form || m.unit, m.price ? `₹${m.price}` : null].filter(Boolean).join(' · '),
        })));
      }
    } catch { setMedicines([]); }
  }, []);

  const searchLabTests = useCallback(async (q) => {
    if (q.length < 2) { setLabTests([]); return; }
    try {
      const res = await fetch(`${API}/api/mango/test-catalog?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setLabTests((data.tests || []).slice(0, 6).map(t => ({
          name: t.name,
          type: 'test',
          path: '/mango',
          detail: [t.category, t.price ? `₹${t.price}` : null].filter(Boolean).join(' · '),
        })));
      }
    } catch { setLabTests([]); }
  }, []);

  const doSearch = useCallback((q) => {
    if (!q || q.length < 2) { setResults([]); setMedicines([]); setLabTests([]); return; }
    const lower = q.toLowerCase();
    const found = [];
    DOCTORS.forEach(d => {
      if (d.name.toLowerCase().includes(lower) || d.keywords.includes(lower)) found.push(d);
    });
    SERVICES.forEach(s => {
      if (s.name.toLowerCase().includes(lower) || s.keywords.includes(lower)) found.push(s);
    });
    setResults(found.slice(0, 10));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchMedicines(q);
      searchLabTests(q);
    }, 300);
  }, [searchMedicines, searchLabTests]);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allResults = [...results, ...medicines, ...labTests];
  const showResults = focused && query.length >= 2 && allResults.length > 0;
  const showEmpty = focused && query.length >= 2 && allResults.length === 0;
  const showSuggestions = focused && query.length < 2;

  const handleSelect = (item) => {
    saveSearch(item.name);
    setFocused(false);
    setQuery('');
    navigate(item.path);
  };

  const handleTrendingClick = (text) => {
    setQuery(text);
    saveSearch(text);
  };

  return (
    <div ref={containerRef} className="relative w-full" data-testid="global-search">
      {/* Search Input */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all duration-200 ${
        focused
          ? isDarkMode ? 'border-teal-500/50 bg-white/10 shadow-lg shadow-teal-500/10' : 'border-teal-400 bg-white shadow-lg shadow-teal-200/40'
          : isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
      }`}>
        <Search className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search doctors, tests, medicines..."
          className={`flex-1 bg-transparent outline-none text-sm ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-gray-900 placeholder:text-gray-400'}`}
          data-testid="global-search-input"
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="p-0.5" data-testid="global-search-clear">
            <X className={`w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      {/* Full-Screen Suggestions (when focused but no query) */}
      {showSuggestions && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border overflow-hidden z-50 max-h-[70vh] overflow-y-auto ${
            isDarkMode ? 'bg-[#111118] border-white/10' : 'bg-white border-gray-200 shadow-xl'
          }`}
          data-testid="search-suggestions"
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className={`px-4 py-2.5 flex items-center justify-between ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-white/30' : 'text-gray-400'}`}>
                  <Clock className="w-3 h-3" /> Recent Searches
                </span>
                <button onClick={clearRecent} className="text-[10px] text-red-400 font-medium" data-testid="clear-recent-searches">Clear</button>
              </div>
              {recentSearches.map((text, i) => (
                <button key={i} onClick={() => handleTrendingClick(text)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                  data-testid={`recent-search-${i}`}
                >
                  <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? 'text-white/20' : 'text-gray-300'}`} />
                  <span className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-700'}`}>{text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          <div>
            <div className={`px-4 py-2.5 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-white/30' : 'text-gray-400'}`}>
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map((item, i) => (
                <button key={i} onClick={() => handleTrendingClick(item.text)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all active:scale-[0.95] ${
                    isDarkMode 
                      ? 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10' 
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                  data-testid={`trending-search-${i}`}
                >
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  {item.text}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`px-4 py-2.5 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white/30' : 'text-gray-400'}`}>Quick Actions</span>
          </div>
          {SERVICES.slice(0, 4).map((s, i) => (
            <button key={i} onClick={() => handleSelect(s)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
              data-testid={`quick-action-${i}`}
            >
              <Building2 className={`w-4 h-4 flex-shrink-0 text-cyan-400`} />
              <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>{s.name}</span>
              <ArrowRight className={`w-3 h-3 ml-auto ${isDarkMode ? 'text-white/20' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border overflow-hidden z-50 max-h-[60vh] overflow-y-auto ${
            isDarkMode ? 'bg-[#111118] border-white/10' : 'bg-white border-gray-200 shadow-xl'
          }`}
          data-testid="global-search-results"
        >
          {['doctor', 'service', 'test', 'medicine'].map(type => {
            const items = allResults.filter(r => r.type === type);
            if (items.length === 0) return null;
            return (
              <div key={type}>
                <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? 'text-white/30 bg-white/5' : 'text-gray-400 bg-gray-50'
                }`}>
                  {typeLabels[type]}s
                </div>
                {items.map((item, idx) => (
                  <button
                    key={`${type}-${idx}`}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                    data-testid={`search-result-${type}-${idx}`}
                  >
                    <IconForType type={type} className={`w-4 h-4 flex-shrink-0 ${typeColors[type]}`} />
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm truncate ${isDarkMode ? 'text-white/90' : 'text-gray-900'}`}>{item.name}</p>
                      {(item.specialty || item.detail) && (
                        <p className={`text-xs truncate ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>{item.specialty || item.detail}</p>
                      )}
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? 'text-white/20' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* No results */}
      {showEmpty && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border p-6 text-center z-50 ${
          isDarkMode ? 'bg-[#111118] border-white/10' : 'bg-white border-gray-200 shadow-xl'
        }`}>
          <Search className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={`text-sm ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>No results for "{query}"</p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/20' : 'text-gray-400'}`}>Try searching for medicines, tests, or doctors</p>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
