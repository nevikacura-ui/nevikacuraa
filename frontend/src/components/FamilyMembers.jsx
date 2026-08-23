import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, Plus, Edit2, Trash2, User, Heart, Baby, 
  UserPlus, X, Check, Loader2, AlertCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RELATIONS = [
  { value: 'self', label: 'Self', icon: User },
  { value: 'spouse', label: 'Spouse', icon: Heart },
  { value: 'child', label: 'Child', icon: Baby },
  { value: 'parent', label: 'Parent', icon: Users },
  { value: 'sibling', label: 'Sibling', icon: Users },
  { value: 'other', label: 'Other', icon: User }
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const FamilyMembers = () => {
  const { user, token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    relation: 'child',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    phone: '',
    medical_conditions: []
  });

  useEffect(() => {
    if (user?.id) {
      fetchFamilyMembers();
    }
  }, [user]);

  const fetchFamilyMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/health-records/family/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(response.data.family_members || []);
    } catch (error) {
      console.error('Failed to fetch family members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter name');
      return;
    }
    
    setSaving(true);
    try {
      if (editingMember) {
        await axios.put(`${API}/health-records/family/${editingMember.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Family member updated');
      } else {
        await axios.post(`${API}/health-records/family/${user.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Family member added');
      }
      
      fetchFamilyMembers();
      setShowAddDialog(false);
      setEditingMember(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to save family member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Remove this family member?')) return;
    
    try {
      await axios.delete(`${API}/health-records/family/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Family member removed');
      fetchFamilyMembers();
    } catch (error) {
      toast.error('Failed to remove family member');
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      relation: member.relation,
      date_of_birth: member.date_of_birth || '',
      gender: member.gender || '',
      blood_group: member.blood_group || '',
      phone: member.phone || '',
      medical_conditions: member.medical_conditions || []
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relation: 'child',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      phone: '',
      medical_conditions: []
    });
  };

  const getRelationIcon = (relation) => {
    const rel = RELATIONS.find(r => r.value === relation);
    const Icon = rel?.icon || User;
    return <Icon className="w-5 h-5" />;
  };

  const getRelationLabel = (relation) => {
    return RELATIONS.find(r => r.value === relation)?.label || relation;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Family Members
            </h2>
            <p className="text-sm text-slate-500">{members.length}/5 members added</p>
          </div>
        </div>
        <Button
          onClick={() => { resetForm(); setEditingMember(null); setShowAddDialog(true); }}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl"
          disabled={members.length >= 5}
          data-testid="add-family-member-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          {members.length >= 5 ? 'Limit Reached' : 'Add Member'}
        </Button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 border-dashed border-2 border-slate-200 rounded-2xl">
          <UserPlus className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Family Members Yet</h3>
          <p className="text-slate-500 mb-4">Add family members to manage their health profiles</p>
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="outline"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Member
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card 
              key={member.id} 
              className="p-5 rounded-2xl border-slate-100 hover:shadow-lg transition-shadow group"
              data-testid={`family-member-${member.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    member.relation === 'spouse' ? 'bg-pink-100 text-pink-600' :
                    member.relation === 'child' ? 'bg-blue-100 text-blue-600' :
                    member.relation === 'parent' ? 'bg-purple-100 text-purple-600' :
                    'bg-teal-100 text-teal-600'
                  }`}>
                    {getRelationIcon(member.relation)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{member.name}</h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {getRelationLabel(member.relation)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(member)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(member.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {member.blood_group && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-medium text-red-500">🩸</span>
                    <span>{member.blood_group}</span>
                  </div>
                )}
                {member.date_of_birth && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>🎂</span>
                    <span>{new Date(member.date_of_birth).toLocaleDateString()}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>📱</span>
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.medical_conditions?.length > 0 && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span className="text-xs">{member.medical_conditions.join(', ')}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              {editingMember ? 'Edit Family Member' : 'Add Family Member'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                className="mt-1 rounded-xl"
                data-testid="family-name-input"
              />
            </div>
            
            <div>
              <Label>Relation *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {RELATIONS.filter(r => r.value !== 'self').map((rel) => (
                  <button
                    key={rel.value}
                    onClick={() => setFormData({ ...formData, relation: rel.value })}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      formData.relation === rel.value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <rel.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">{rel.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Blood Group</Label>
                <select
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3"
                >
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit"
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => { setShowAddDialog(false); setEditingMember(null); resetForm(); }}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !formData.name.trim()}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl"
                data-testid="save-family-member-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {editingMember ? 'Update' : 'Add'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyMembers;
