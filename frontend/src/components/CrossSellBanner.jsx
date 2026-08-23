import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, ChevronRight, X, FlaskConical, Pill, Stethoscope } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const serviceIcons = {
  mango: FlaskConical,
  pharmacy: Pill,
  diagyn: Stethoscope,
};

const serviceColors = {
  mango: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  pharmacy: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  diagyn: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
};

export const CrossSellBanner = ({ context, sourceService, patientId, compact = false }) => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (context) fetchSuggestions();
    else setLoading(false);
  }, [context, sourceService]);

  const fetchSuggestions = async () => {
    try {
      const res = await axios.post(`${API}/cross-sell/suggestions`, {
        context,
        source_service: sourceService,
        patient_id: patientId || ''
      });
      setSuggestions(res.data.suggestions || []);
      // Track impressions
      for (const s of (res.data.suggestions || [])) {
        trackAction(s, 'shown');
      }
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const trackAction = async (suggestion, action) => {
    try {
      await axios.post(`${API}/cross-sell/track`, {
        patient_id: patientId || '',
        rule_id: suggestion.rule_id,
        suggestion_title: suggestion.title,
        action,
        source_service: sourceService
      });
    } catch (e) { /* silent */ }
  };

  const handleClick = (suggestion) => {
    trackAction(suggestion, 'clicked');
    if (suggestion.cta_route) {
      navigate(suggestion.cta_route);
    }
  };

  const handleDismiss = (suggestion) => {
    trackAction(suggestion, 'dismissed');
    setDismissed(prev => new Set([...prev, suggestion.title]));
  };

  const visible = suggestions.filter(s => !dismissed.has(s.title));
  if (loading || visible.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-2" data-testid="cross-sell-compact">
        {visible.slice(0, 2).map((s, i) => {
          const Icon = serviceIcons[s.service] || Sparkles;
          const colors = serviceColors[s.service] || serviceColors.mango;
          return (
            <button key={i} onClick={() => handleClick(s)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl ${colors.light} ${colors.border} border transition-all hover:shadow-sm`}
              data-testid={`cross-sell-item-${i}`}>
              <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{s.title}</p>
                <p className="text-[10px] text-gray-500 truncate">{s.description}</p>
              </div>
              <span className={`text-xs font-bold ${colors.text} whitespace-nowrap`}>Rs.{s.price}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 shadow-lg" data-testid="cross-sell-banner">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white">Recommended for you</h3>
      </div>

      <div className="space-y-2">
        {visible.slice(0, 3).map((s, i) => {
          const Icon = serviceIcons[s.service] || Sparkles;
          const colors = serviceColors[s.service] || serviceColors.mango;
          return (
            <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3"
              data-testid={`cross-sell-card-${i}`}>
              <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                <p className="text-xs text-white/60 truncate">{s.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleClick(s)}
                  className={`px-3 py-1.5 ${colors.bg} text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity`}
                  data-testid={`cross-sell-cta-${i}`}>
                  Rs.{s.price}
                </button>
                <button onClick={() => handleDismiss(s)} className="text-white/30 hover:text-white/60"
                  data-testid={`cross-sell-dismiss-${i}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrossSellBanner;
