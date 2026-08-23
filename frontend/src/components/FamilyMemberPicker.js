import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, Check, X } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Family Member Picker - drop into any booking/checkout form
 * Props: phone (user phone), onSelect (callback with member data), className
 */
const FamilyMemberPicker = ({ phone, onSelect, className = '' }) => {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!phone) return;
    axios.get(`${API}/family/members/${phone}`)
      .then(r => setMembers(r.data.members || []))
      .catch(() => {});
  }, [phone]);

  if (members.length === 0) return null;

  const handleSelect = (member) => {
    setSelected(member);
    setOpen(false);
    if (onSelect) onSelect(member);
  };

  const handleSelf = () => {
    setSelected(null);
    setOpen(false);
    if (onSelect) onSelect(null);
  };

  return (
    <div className={className} data-testid="family-member-picker">
      <p className="text-[10px] text-white/25 uppercase tracking-wide mb-1.5 font-medium">Booking For</p>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 p-3 rounded-xl transition-all"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Users className="w-4 h-4 text-purple-400/60" />
        <span className="flex-1 text-left text-sm text-white/70 font-medium">
          {selected ? `${selected.name} (${selected.relation})` : 'Self'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl overflow-hidden" style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <button onClick={handleSelf} className="w-full flex items-center gap-2.5 p-3 hover:bg-white/[0.03] transition-colors" data-testid="pick-self">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)' }}>
              <Check className="w-3.5 h-3.5 text-teal-400" style={{ opacity: selected ? 0.2 : 1 }} />
            </div>
            <span className="text-white/70 text-xs font-medium">Self</span>
          </button>
          {members.map(m => (
            <button key={m.id} onClick={() => handleSelect(m)} className="w-full flex items-center gap-2.5 p-3 hover:bg-white/[0.03] transition-colors" data-testid={`pick-${m.id}`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                {selected?.id === m.id ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Users className="w-3.5 h-3.5 text-purple-400/30" />}
              </div>
              <div className="flex-1 text-left">
                <span className="text-white/70 text-xs font-medium">{m.name}</span>
                <span className="text-white/20 text-[10px] ml-1.5 capitalize">{m.relation}{m.age ? ` · ${m.age}y` : ''}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FamilyMemberPicker;
