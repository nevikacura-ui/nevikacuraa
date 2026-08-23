import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save, X } from 'lucide-react';

const AdminEditModal = ({ open, onOpenChange, editType, editItem, formData, setFormData, onSave, saving }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit' : 'Add'} {editType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {editType === 'clinic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>ID</Label><Input value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="pushpa_clinic" /></div>
                <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Pushpa Clinic" /></div>
              </div>
              <div><Label>Address</Label><Input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                <div><Label>Phone</Label><Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              <div><Label>Hours</Label><Input value={formData.hours || ''} onChange={e => setFormData({...formData, hours: e.target.value})} placeholder="11:30 AM - 2 PM, 6 PM - 10 PM" /></div>
              <div><Label>Services (comma-separated)</Label><Input value={(formData.services || []).join(', ')} onChange={e => setFormData({...formData, services: e.target.value.split(',').map(s => s.trim())})} /></div>
              <div><Label>Doctors (comma-separated)</Label><Input value={(formData.doctors || []).join(', ')} onChange={e => setFormData({...formData, doctors: e.target.value.split(',').map(s => s.trim())})} /></div>
            </>
          )}
          {editType === 'doctor' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>ID</Label><Input value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="dr_vikas_jha" /></div>
                <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Dr. Vikas Jha" /></div>
              </div>
              <div><Label>Specialization</Label><Input value={formData.specialization || ''} onChange={e => setFormData({...formData, specialization: e.target.value})} /></div>
              <div><Label>Qualification</Label><Input value={formData.qualification || ''} onChange={e => setFormData({...formData, qualification: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Avatar (2 letters)</Label><Input value={formData.avatar || ''} onChange={e => setFormData({...formData, avatar: e.target.value})} maxLength={2} placeholder="VJ" /></div>
                <div><Label>Color</Label><Input value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="from-teal-400 to-emerald-500" /></div>
              </div>
            </>
          )}
          {editType === 'fee' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="G1" /></div>
                <div><Label>Amount ({'\u20B9'})</Label><Input type="number" value={formData.amount || 0} onChange={e => setFormData({...formData, amount: parseInt(e.target.value)})} /></div>
              </div>
              <div><Label>Label</Label><Input value={formData.label || ''} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="General - First" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Type</Label><select className="w-full border rounded-md p-2" value={formData.type || 'consultation'} onChange={e => setFormData({...formData, type: e.target.value})}><option value="consultation">Consultation</option><option value="scan">Scan</option></select></div>
                <div><Label>Category</Label><Input value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="general" /></div>
              </div>
              <div><Label>Color Classes</Label><Input value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="bg-gray-100 text-gray-800" /></div>
            </>
          )}
          {editType === 'service' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>ID</Label><Input value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="diagyn" /></div>
                <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="DiaGyn Healthcare" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div><Label>Logo URL</Label><Input value={formData.logo || ''} onChange={e => setFormData({...formData, logo: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Path</Label><Input value={formData.path || ''} onChange={e => setFormData({...formData, path: e.target.value})} placeholder="/diagyn" /></div>
                <div><Label>BG Color</Label><Input value={formData.bg_color || ''} onChange={e => setFormData({...formData, bg_color: e.target.value})} placeholder="#ffffff" /></div>
              </div>
            </>
          )}
          {editType === 'testimonial' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><Label>Location</Label><Input value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Avatar (2 letters)</Label><Input value={formData.avatar || ''} onChange={e => setFormData({...formData, avatar: e.target.value})} maxLength={2} /></div>
                <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={formData.rating || 5} onChange={e => setFormData({...formData, rating: parseInt(e.target.value)})} /></div>
              </div>
              <div><Label>Service</Label><Input value={formData.service || ''} onChange={e => setFormData({...formData, service: e.target.value})} placeholder="DiaGyn Healthcare" /></div>
              <div><Label>Testimonial Text</Label><Textarea value={formData.text || ''} onChange={e => setFormData({...formData, text: e.target.value})} rows={3} /></div>
            </>
          )}
          {editType === 'healthTip' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Icon (emoji)</Label><Input value={formData.icon || ''} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="tip icon" /></div>
                <div><Label>Category</Label><Input value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Nutrition" /></div>
              </div>
              <div><Label>Tip Text</Label><Textarea value={formData.tip || ''} onChange={e => setFormData({...formData, tip: e.target.value})} rows={3} /></div>
            </>
          )}
          {editType === 'certification' && (
            <>
              <div><Label>Short Name</Label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="ISO 9001" /></div>
              <div><Label>Full Name</Label><Input value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Quality Management Certified" /></div>
              <div><Label>Color Classes</Label><Input value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="bg-teal-100 text-teal-700" /></div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEditModal;
