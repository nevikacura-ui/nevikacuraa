import React from 'react';
import { useMangoStaff } from './MangoStaffContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Save } from 'lucide-react';

const MangoTestFormModal = () => {
  const s = useMangoStaff();
  if (!s.showTestForm) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-[#141428] w-full max-h-[90vh] rounded-t-2xl overflow-hidden">
        <div className="bg-teal-500 text-white p-4 flex items-center justify-between">
          <h2 className="font-bold">{s.editingTest ? 'Edit Test' : 'Add Test'}</h2>
          <button onClick={() => { s.setShowTestForm(false); s.setEditingTest(null); }}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Test Name *</label>
              <Input value={s.testForm.name} onChange={(e) => s.setTestForm({ ...s.testForm, name: e.target.value })} placeholder="e.g., Complete Blood Count" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Test Code</label>
              <Input value={s.testForm.code} onChange={(e) => s.setTestForm({ ...s.testForm, code: e.target.value.toUpperCase() })} placeholder="e.g., CBC" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Category</label>
              <select value={s.testForm.category} onChange={(e) => s.setTestForm({ ...s.testForm, category: e.target.value })} className="w-full h-10 px-3 border rounded-lg">
                <option value="">Select</option>
                <option value="Hematology">Hematology</option>
                <option value="Biochemistry">Biochemistry</option>
                <option value="Endocrine">Endocrine</option>
                <option value="Immunology">Immunology</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Pathology">Pathology</option>
                <option value="Radiology">Radiology</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="bg-teal-50 p-3 rounded-lg space-y-3">
            <h3 className="font-semibold text-teal-700">Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Price *</label>
                <Input type="number" value={s.testForm.price} onChange={(e) => s.setTestForm({ ...s.testForm, price: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Home Collection</label>
                <Input type="number" value={s.testForm.home_collection_price} onChange={(e) => s.setTestForm({ ...s.testForm, home_collection_price: e.target.value })} placeholder="0" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Sample Type</label>
              <select value={s.testForm.sample_type} onChange={(e) => s.setTestForm({ ...s.testForm, sample_type: e.target.value })} className="w-full h-10 px-3 border rounded-lg">
                <option value="">Select</option>
                <option value="Blood">Blood</option>
                <option value="Urine">Urine</option>
                <option value="Stool">Stool</option>
                <option value="Swab">Swab</option>
                <option value="Serum">Serum</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Turnaround Time</label>
              <select value={s.testForm.turnaround_time} onChange={(e) => s.setTestForm({ ...s.testForm, turnaround_time: e.target.value })} className="w-full h-10 px-3 border rounded-lg">
                <option value="">Select</option>
                <option value="Same Day">Same Day</option>
                <option value="24 Hours">24 Hours</option>
                <option value="48 Hours">48 Hours</option>
                <option value="3-5 Days">3-5 Days</option>
                <option value="1 Week">1 Week</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fasting" checked={s.testForm.fasting_required} onChange={(e) => s.setTestForm({ ...s.testForm, fasting_required: e.target.checked })} className="w-4 h-4 accent-teal-500" />
            <label htmlFor="fasting" className="text-sm text-slate-600">Fasting Required</label>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Preparation Instructions</label>
            <textarea value={s.testForm.preparation_instructions} onChange={(e) => s.setTestForm({ ...s.testForm, preparation_instructions: e.target.value })} className="w-full h-20 px-3 py-2 border rounded-lg resize-none" placeholder="e.g., 12 hours fasting required..." />
          </div>
        </div>
        <div className="p-4 border-t">
          <Button onClick={s.saveTest} disabled={s.loading} className="w-full bg-teal-500 hover:bg-teal-600">
            {s.loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {s.editingTest ? 'Update Test' : 'Add Test'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MangoTestFormModal;
