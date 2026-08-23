import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Trash2, Wallet, Coins, Loader2, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FamilyWallet = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('userPhone') || '';
  const [wallet, setWallet] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');

  const fetchData = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const [fwRes, memRes] = await Promise.all([
        axios.get(`${API}/wallet/family/${phone}`).catch(() => ({ data: { wallet: null, family_members: [] } })),
        axios.get(`${API}/family/members/${phone}`).catch(() => ({ data: { members: [] } })),
      ]);
      setWallet(fwRes.data.wallet);
      setFamilyMembers(fwRes.data.family_members || []);
      setAllMembers(memRes.data.members || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [phone]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addToWallet = async (memberPhone) => {
    try {
      await axios.post(`${API}/wallet/family/add`, { primary_phone: phone, member_phone: memberPhone });
      toast.success('Member added to Family Wallet!');
      setShowAdd(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to add');
    }
  };

  const removeFromWallet = async (memberPhone) => {
    try {
      await axios.delete(`${API}/wallet/family/remove?primary_phone=${phone}&member_phone=${memberPhone}`);
      toast.success('Member removed');
      fetchData();
    } catch { toast.error('Failed to remove'); }
  };

  // Members not yet in wallet
  const availableMembers = allMembers.filter(
    m => m.phone && !familyMembers.find(f => f.phone === m.phone)
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#050510' }}>
      <Loader2 className="w-6 h-6 animate-spin text-white/20" />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }} data-testid="family-wallet-page">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Family Wallet</h1>
            <p className="text-[10px] text-white/25">Shared wallet for your family</p>
          </div>
          {availableMembers.length > 0 && (
            <button onClick={() => setShowAdd(true)} data-testid="add-family-member-btn"
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <UserPlus className="w-4 h-4 text-teal-400" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-3">
        {/* Primary Wallet Card */}
        <div className="rounded-3xl p-5 mb-5 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(99,102,241,0.08))',
          border: '1px solid rgba(20,184,166,0.15)',
        }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20" style={{ background: '#14b8a6' }} />
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-teal-400" />
            <span className="text-white/40 text-xs font-medium">Your Wallet Balance</span>
          </div>
          <p className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {'\u20B9'}{wallet?.balance?.toFixed(2) || '0.00'}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold">{wallet?.coins || 0} CuraX</span>
            </div>
            <span className="text-white/15">|</span>
            <span className="text-white/25 text-xs">{familyMembers.length} family member{familyMembers.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Family Members */}
        <p className="text-white/40 text-xs uppercase tracking-widest font-light mb-3">Family Members</p>

        {familyMembers.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Users className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No family members in wallet</p>
            <p className="text-white/15 text-xs mt-1">Add family members from your profile first</p>
            <button onClick={() => navigate('/patient-profile/family')} data-testid="go-add-family-btn"
              className="mt-3 px-4 py-2 rounded-xl text-xs font-medium text-teal-400"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
              Add Family Members
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {familyMembers.map((m, i) => (
              <div key={i} className="rounded-2xl p-4 flex items-center gap-3" data-testid={`family-member-${i}`}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-sm font-semibold">{m.name || m.phone}</p>
                  <p className="text-white/25 text-[10px]">{m.phone}</p>
                </div>
                <div className="text-right mr-2">
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 text-xs font-bold">{m.coins || 0}</span>
                  </div>
                </div>
                <button onClick={() => removeFromWallet(m.phone)} data-testid={`remove-member-${i}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button onClick={() => navigate('/cura-wallet')} data-testid="go-wallet-btn"
            className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.12)' }}>
            <Wallet className="w-5 h-5 mx-auto mb-1.5 text-teal-400" />
            <p className="text-white/50 text-[10px] font-medium">Cura Wallet</p>
          </button>
          <button onClick={() => navigate('/cura-coins')} data-testid="go-coins-btn"
            className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
            <Coins className="w-5 h-5 mx-auto mb-1.5 text-amber-400" />
            <p className="text-white/50 text-[10px] font-medium">CuraX Coins</p>
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{ background: '#0c0c1a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Add to Family Wallet</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            {availableMembers.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">All family members are already in your wallet</p>
            ) : (
              <div className="space-y-2">
                {availableMembers.map((m, i) => (
                  <button key={i} onClick={() => addToWallet(m.phone)} data-testid={`select-member-${i}`}
                    className="w-full rounded-2xl p-4 flex items-center gap-3 text-left"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)' }}>
                      <Plus className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-semibold">{m.name}</p>
                      <p className="text-white/25 text-[10px]">{m.relation} | {m.phone || 'No phone'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyWallet;
