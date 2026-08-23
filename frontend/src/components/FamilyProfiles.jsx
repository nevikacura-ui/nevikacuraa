import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Heart, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RELATIONS = ['Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const FamilyProfiles = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const phone = user?.phone || localStorage.getItem('userPhone') || '';
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', relation: 'Spouse', age: '', gender: '', blood_group: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !phone) return;
    const clean = phone.replace(/\D/g, '').slice(-10);
    axios.get(`${API}/family/members/${clean}`)
      .then(res => setMembers(res.data.members || []))
      .catch(() => {});
  }, [isOpen, phone]);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      const clean = phone.replace(/\D/g, '').slice(-10);
      const res = await axios.post(`${API}/family/members?phone=${clean}`, {
        ...form, age: form.age ? parseInt(form.age) : null
      });
      setMembers(prev => [...prev, res.data.member]);
      setForm({ name: '', relation: 'Spouse', age: '', gender: '', blood_group: '' });
      setShowAdd(false);
      toast.success(`${form.name} added to family`);
    } catch (err) {
      toast.error('Failed to add member');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    try {
      await axios.delete(`${API}/family/members/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success(`${name} removed`);
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] border-white/10 text-white max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-teal-400" />
            Family Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto" data-testid="family-profiles">
          <button onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1" data-testid="add-family-btn">
            {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAdd ? 'Cancel' : 'Add Member'}
          </button>

          {showAdd && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <Input value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))}
                placeholder="Name" className="bg-white/5 border-white/10 text-white" data-testid="family-name-input" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.relation} onChange={(e) => setForm(p => ({...p, relation: e.target.value}))}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                  {RELATIONS.map(r => <option key={r} value={r} className="bg-[#1a1a2e]">{r}</option>)}
                </select>
                <Input value={form.age} onChange={(e) => setForm(p => ({...p, age: e.target.value}))}
                  placeholder="Age" type="number" className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.gender} onChange={(e) => setForm(p => ({...p, gender: e.target.value}))}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                  <option value="" className="bg-[#1a1a2e]">Gender</option>
                  <option value="Male" className="bg-[#1a1a2e]">Male</option>
                  <option value="Female" className="bg-[#1a1a2e]">Female</option>
                </select>
                <select value={form.blood_group} onChange={(e) => setForm(p => ({...p, blood_group: e.target.value}))}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                  <option value="" className="bg-[#1a1a2e]">Blood Group</option>
                  {BLOOD_GROUPS.map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
                </select>
              </div>
              <Button onClick={handleAdd} disabled={loading} className="w-full bg-teal-500 text-white rounded-xl" data-testid="save-family-btn">
                {loading ? 'Saving...' : 'Add Member'}
              </Button>
            </div>
          )}

          {members.length === 0 && !showAdd && (
            <p className="text-gray-500 text-sm text-center py-6">No family members added yet. Tap "Add Member" to get started.</p>
          )}

          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10" data-testid={`family-member-${m.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.name}</p>
                    <p className="text-[11px] text-gray-400">{m.relation}{m.age ? ` · ${m.age} yrs` : ''}{m.blood_group ? ` · ${m.blood_group}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id, m.name)} className="p-1.5 hover:bg-white/10 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FamilyProfiles;
