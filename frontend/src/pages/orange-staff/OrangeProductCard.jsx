import React, { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Camera, Edit2, IndianRupee, Check, X } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const normalizeImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const pathMatch = url.match(/(\/api\/pharmacy\/medicines\/.+)/);
  if (pathMatch) return `${API}${pathMatch[1]}`;
  return url;
};

const salePrice = (mrp, disc) => Math.round((parseFloat(mrp) || 0) * (1 - (parseFloat(disc) || 0) / 100));

const OrangeProductCard = memo(({ med, onEdit, onImageClick, inlineEdit, onInlineChange, onInlineSave, onInlineCancel }) => (
  <div className={`rounded-2xl p-3.5 transition-all hover:shadow-lg hover:scale-[1.01] ${!med.image_url ? 'border-amber-200/60' : 'border-white/60'}`}
    style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${med.image_url ? 'rgba(255,255,255,0.7)' : 'rgba(251,191,36,0.3)'}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
    data-testid={`product-card-${med.id}`}>
    <div className="flex gap-3">
      <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
        style={{ background: med.image_url ? '#fff' : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', border: '1px solid rgba(0,0,0,0.06)' }}
        onClick={() => onImageClick(med.id, med.name)} data-testid={`product-image-${med.id}`}>
        {med.image_url ? (
          <img src={normalizeImageUrl(med.image_url)} alt={med.name} className="w-full h-full object-cover rounded-lg" loading="lazy" decoding="async" />
        ) : (
          <Camera className="w-5 h-5 text-orange-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-800 truncate">{med.name}</p>
            <p className="text-[10px] text-stone-500 mt-0.5">
              {med.category && med.category !== 'General' ? `${med.category} · ` : ''}{med.unit || med.form || 'Unit'} {med.manufacturer ? `· ${med.manufacturer}` : ''}
            </p>
            {med.composition && <p className="text-[9px] text-stone-400 mt-0.5 truncate">{med.composition}</p>}
          </div>
          <button onClick={() => onEdit(med)} className="p-1.5 rounded-xl transition-colors flex-shrink-0" style={{ background: 'rgba(59,130,246,0.08)' }} data-testid={`edit-${med.id}`}>
            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
          </button>
        </div>
        {inlineEdit ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Input value={inlineEdit.mrp} onChange={e => onInlineChange(med.id, 'mrp', e.target.value)}
              className="h-7 w-[70px] text-[11px] rounded-lg pl-1.5 bg-orange-50 border-orange-200 font-semibold" type="number" />
            <Input value={inlineEdit.discount_percent} onChange={e => onInlineChange(med.id, 'discount_percent', e.target.value)}
              className="h-7 w-[55px] text-[11px] rounded-lg pl-1.5 bg-orange-50 border-orange-200" type="number" placeholder="%" />
            <button onClick={() => onInlineSave(med.id)} className="p-1 rounded-lg bg-green-100 hover:bg-green-200"><Check className="w-3.5 h-3.5 text-green-600" /></button>
            <button onClick={() => onInlineCancel(med.id)} className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200"><X className="w-3.5 h-3.5 text-gray-500" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-bold text-stone-800"><IndianRupee className="w-3 h-3 inline text-stone-400" />{med.mrp || 0}</span>
            {(med.discount_percent || 0) > 0 && (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-emerald-700" style={{ background: 'rgba(16,185,129,0.1)' }}>{med.discount_percent}% off</span>
                <span className="text-[10px] text-stone-400">Sale: <IndianRupee className="w-2.5 h-2.5 inline" />{salePrice(med.mrp, med.discount_percent)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
));
OrangeProductCard.displayName = 'OrangeProductCard';

export default OrangeProductCard;
export { normalizeImageUrl, salePrice };
