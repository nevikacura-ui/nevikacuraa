import React, { useState, useEffect } from 'react';
import { Users, User, Plus, Check } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const FamilyMemberPicker = ({ phone, onSelect, className = '' }) => {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    setLoading(true);
    axios.get(`${API}/api/health-records/family/${cleanPhone}`)
      .then(res => setMembers(res.data?.members || res.data || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [phone]);

  const handleSelect = (member) => {
    if (selected?.id === member.id) {
      setSelected(null);
      onSelect?.(null);
    } else {
      setSelected(member);
      onSelect?.(member);
    }
  };

  if (loading) {
    return <div className={`flex items-center gap-2 py-2 ${className}`}>
      <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-white/40">Loading family members...</span>
    </div>;
  }

  return (
    <div className={`${className}`} data-testid="family-member-picker">
      {members.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button key={m.id || m._id} onClick={() => handleSelect(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: selected?.id === m.id ? 'rgba(20,184,166,0.2)' : 'rgba(255,255,255,0.06)',
                border: selected?.id === m.id ? '1px solid rgba(20,184,166,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: selected?.id === m.id ? '#5EEAD4' : 'rgba(255,255,255,0.6)',
              }}
              data-testid={`family-member-${m.name?.toLowerCase().replace(/\s/g, '-')}`}>
              {selected?.id === m.id ? <Check className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {m.name}
              {m.relation && <span className="opacity-50">({m.relation})</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-1">
          <p className="text-xs text-white/40">No family members added yet</p>
          <button onClick={() => navigate('/patient-profile/family')}
            className="text-xs text-teal-400 font-medium flex items-center gap-1 hover:text-teal-300"
            data-testid="add-family-member-link">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      )}
    </div>
  );
};

export default FamilyMemberPicker;
