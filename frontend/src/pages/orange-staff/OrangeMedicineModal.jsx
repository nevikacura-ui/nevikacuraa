import React from 'react';
import { useOrangeStaff } from './OrangeStaffContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeImageUrl, salePrice } from './OrangeProductCard';
import { X, Loader2, Save, Plus, Camera, Upload, Trash2, IndianRupee } from 'lucide-react';

const CATEGORIES = [
  'All', 'Antibiotics', 'Pain Relief & Anti-inflammatory', 'Diabetes', 'Cardiac & BP',
  'Gastro & Digestive', 'Women\'s Health', 'Respiratory & Allergy', 'Vitamins & Supplements',
  'Skin & Dermatology', 'Neuro & CNS', 'Eye & ENT', 'Urology & Kidney', 'Bones & Joints',
  'Hormones & Thyroid', 'Liver Care', 'General & OTC', 'General'
];
const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Drops', 'Injection', 'Cream', 'Ointment', 'Gel', 'Powder', 'Spray', 'Lotion', 'Suspension', 'Liquid', 'Other'];

const OrangeMedicineModal = () => {
  const s = useOrangeStaff();
  if (!s.showAddForm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }} onClick={() => { s.setShowAddForm(false); s.setEditingMed(null); }}>
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto shadow-2xl" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(249,115,22,0.15)' }} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between sticky top-0 z-10" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 className="font-bold text-base text-gray-900">{s.editingMed ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={() => { s.setShowAddForm(false); s.setEditingMed(null); }}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Image Gallery */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 mb-2 block">Product Images</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {s.editingMed?.images?.length > 0 ? (
                s.editingMed.images.map((img, idx) => (
                  <div key={img.id || idx} className="w-16 h-16 rounded-xl overflow-hidden relative border border-gray-200 flex-shrink-0">
                    <img src={normalizeImageUrl(img.url || img.storage_path)} alt="" className="w-full h-full object-cover" />
                    <button onClick={async () => { await s.removeImage(s.editingMed.id, img.id); }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center" data-testid={`remove-img-${idx}`}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))
              ) : s.medForm.image_url ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden relative border border-gray-200 flex-shrink-0">
                  <img src={s.medForm.image_url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => s.setMedForm(p => ({ ...p, image_url: '' }))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                </div>
              ) : null}
              <button onClick={() => s.triggerFileUpload(s.editingMed?.id)}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-orange-400 hover:bg-orange-50 transition-colors"
                data-testid="add-more-images-btn">
                <Plus className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => s.triggerCameraUpload(s.editingMed?.id)} className="flex-1 h-8 rounded-xl text-[10px] font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"><Camera className="w-3 h-3 mr-1" /> Camera</Button>
              <Button onClick={() => s.triggerFileUpload(s.editingMed?.id)} className="flex-1 h-8 rounded-xl text-[10px] font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"><Upload className="w-3 h-3 mr-1" /> Gallery</Button>
            </div>
          </div>

          <div className="relative">
            <Input value={s.medForm.name} onChange={e => { s.setMedForm(p => ({ ...p, name: e.target.value })); if (!s.editingMed) s.debouncedFetchSuggestions(e.target.value); }}
              onFocus={() => { if (s.suggestions.length > 0) s.setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => s.setShowSuggestions(false), 200)}
              placeholder="Medicine name..." className="h-11 rounded-xl bg-gray-50 border-gray-200 text-gray-900" data-testid="med-form-name" />
            {s.showSuggestions && s.suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {s.suggestions.map((sg, i) => (
                  <button key={sg.id || i} onClick={() => s.applySuggestion(sg)} className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{sg.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{sg.manufacturer} {sg.mrp ? `· Rs${sg.mrp}` : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select value={s.medForm.unit} onChange={e => s.setMedForm(p => ({ ...p, unit: e.target.value }))} className="h-11 rounded-xl px-3 text-sm bg-gray-50 border border-gray-200 text-gray-700">
              {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={s.medForm.category} onChange={e => s.setMedForm(p => ({ ...p, category: e.target.value }))} className="h-11 rounded-xl px-3 text-sm bg-gray-50 border border-gray-200 text-gray-700">
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-semibold text-gray-500 mb-1 block">MRP *</label><Input value={s.medForm.mrp} onChange={e => s.setMedForm(p => ({ ...p, mrp: e.target.value }))} placeholder="0" type="number" className="h-11 rounded-xl bg-gray-50 border-gray-200" data-testid="med-form-mrp" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 mb-1 block">Discount %</label><Input value={s.medForm.discount_percent} onChange={e => s.setMedForm(p => ({ ...p, discount_percent: e.target.value }))} placeholder="0" type="number" className="h-11 rounded-xl bg-gray-50 border-gray-200" /></div>
          </div>

          {s.medForm.mrp && s.medForm.discount_percent > 0 && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between">
              <span className="text-xs text-green-700">Sale Price</span>
              <span className="text-sm font-bold text-green-700"><IndianRupee className="w-3 h-3 inline" />{salePrice(s.medForm.mrp, s.medForm.discount_percent)}</span>
            </div>
          )}

          <Input value={s.medForm.manufacturer} onChange={e => s.setMedForm(p => ({ ...p, manufacturer: e.target.value }))} placeholder="Company / Manufacturer" className="h-11 rounded-xl bg-gray-50 border-gray-200" data-testid="med-form-manufacturer" />
          <Input value={s.medForm.composition} onChange={e => s.setMedForm(p => ({ ...p, composition: e.target.value }))} placeholder="Composition" className="h-11 rounded-xl bg-gray-50 border-gray-200" data-testid="med-form-composition" />
          <Input value={s.medForm.generic_name} onChange={e => s.setMedForm(p => ({ ...p, generic_name: e.target.value }))} placeholder="Generic Name" className="h-11 rounded-xl bg-gray-50 border-gray-200" data-testid="med-form-generic" />
          <textarea value={s.medForm.uses} onChange={e => s.setMedForm(p => ({ ...p, uses: e.target.value }))} placeholder="Uses (e.g. fever, pain relief, cold...)" rows={2} className="w-full rounded-xl px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 resize-none" data-testid="med-form-uses" />
          <textarea value={s.medForm.side_effects} onChange={e => s.setMedForm(p => ({ ...p, side_effects: e.target.value }))} placeholder="Side Effects (e.g. nausea, drowsiness...)" rows={2} className="w-full rounded-xl px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 resize-none" data-testid="med-form-side-effects" />

          <Button onClick={s.saveMedicine} disabled={s.savingMed} className="w-full h-12 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200" data-testid="med-form-save">
            {s.savingMed ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {s.editingMed ? 'Update Product' : 'Add Product'}
          </Button>

          {s.editingMed && (
            <Button onClick={() => { s.deleteMedicine(s.editingMed.id); s.setShowAddForm(false); s.setEditingMed(null); }}
              className="w-full h-10 rounded-xl font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete Product
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrangeMedicineModal;
