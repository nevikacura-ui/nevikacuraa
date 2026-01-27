import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, User, Heart, Calendar, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API = process.env.REACT_APP_BACKEND_URL;

// Family Health Hub (#4)
const FamilyHub = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newMember, setNewMember] = useState({
    name: '',
    relation: '',
    dob: '',
    phone: '',
    bloodGroup: ''
  });

  const relations = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/patient/family`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFamilyMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch family members:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFamilyMember = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/patient/family`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        fetchFamilyMembers();
        setShowAddMember(false);
        setNewMember({ name: '', relation: '', dob: '', phone: '', bloodGroup: '' });
      }
    } catch (error) {
      console.error('Failed to add family member:', error);
    }
  };

  const getRelationIcon = (relation) => {
    switch (relation?.toLowerCase()) {
      case 'spouse': return '💑';
      case 'child': return '👶';
      case 'parent': return '👨‍👩‍👦';
      case 'sibling': return '👫';
      default: return '👤';
    }
  };

  const getAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="family-hub">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-teal-600" />
          Family Members
        </h2>
        <Button size="sm" onClick={() => setShowAddMember(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Family Members List */}
      {familyMembers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No family members added yet</p>
            <p className="text-sm text-gray-400 mb-4">Add family members to book appointments for them</p>
            <Button onClick={() => setShowAddMember(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {familyMembers.map((member) => (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center text-2xl">
                    {getRelationIcon(member.relation)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{member.name}</h3>
                      <Badge variant="outline" className="text-xs">{member.relation}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      {member.dob && <span>{getAge(member.dob)}</span>}
                      {member.bloodGroup && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-500" />
                          {member.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Calendar className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    Book Appointment
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    View Records
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    Prescriptions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Family Health Summary */}
      {familyMembers.length > 0 && (
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              Family Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-teal-600">{familyMembers.length}</p>
                <p className="text-xs text-gray-500">Members</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-teal-600">12</p>
                <p className="text-xs text-gray-500">Total Visits</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-teal-600">2</p>
                <p className="text-xs text-gray-500">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Add Family Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Full Name</Label>
              <Input
                placeholder="Enter name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Relation</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {relations.map((rel) => (
                  <Button
                    key={rel}
                    type="button"
                    variant={newMember.relation === rel ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewMember({ ...newMember, relation: rel })}
                  >
                    {rel}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={newMember.dob}
                onChange={(e) => setNewMember({ ...newMember, dob: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="Enter phone number"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Blood Group</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {bloodGroups.map((bg) => (
                  <Button
                    key={bg}
                    type="button"
                    variant={newMember.bloodGroup === bg ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewMember({ ...newMember, bloodGroup: bg })}
                  >
                    {bg}
                  </Button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={addFamilyMember}>
              Add Family Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyHub;
