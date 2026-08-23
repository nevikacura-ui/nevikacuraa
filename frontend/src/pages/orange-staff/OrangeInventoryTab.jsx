import React from 'react';
import { useOrangeStaff } from './OrangeStaffContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import OrangeProductCard from './OrangeProductCard';
import { Search, Plus, Loader2, Pill } from 'lucide-react';

const OrangeInventoryTab = () => {
  const s = useOrangeStaff();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={s.searchInput} onChange={s.handleSearchChange} placeholder="Search medicines..."
            className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm" data-testid="search-medicines" />
        </div>
        <select value={s.categoryFilter} onChange={e => { s.setCategoryFilter(e.target.value); s.setMedPage(1); }}
          className="h-10 rounded-xl px-3 text-sm border border-gray-200 bg-white text-gray-700 max-w-[200px]" data-testid="category-filter">
          {s.CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={s.openAddForm}
          className="h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm gap-1.5" data-testid="add-medicine-btn">
          <Plus className="w-4 h-4" /> Add Medicine
        </Button>
      </div>
      <div className="text-xs text-gray-500 font-medium">{s.medTotal.toLocaleString()} medicines</div>
      {s.loadingMeds ? (
        <div className="space-y-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(0,0,0,0.04)' }} />)}</div>
      ) : s.medicines.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Pill className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No medicines found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {s.medicines.map(med => (
            <OrangeProductCard key={med.id} med={med} onEdit={s.openEditForm} onImageClick={s.openImageUpload}
              inlineEdit={s.inlineEdits[med.id]} onInlineChange={s.handleInlineChange} onInlineSave={s.saveInlineEdit} onInlineCancel={s.cancelInlineEdit} />
          ))}
        </div>
      )}
      {s.medPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button onClick={() => s.setMedPage(p => Math.max(1, p - 1))} disabled={s.medPage === 1} variant="outline" className="h-8 text-xs rounded-lg">Prev</Button>
          <span className="text-sm text-gray-500 py-1">Page {s.medPage} of {s.medPages}</span>
          <Button onClick={() => s.setMedPage(p => Math.min(s.medPages, p + 1))} disabled={s.medPage === s.medPages} variant="outline" className="h-8 text-xs rounded-lg">Next</Button>
        </div>
      )}
    </div>
  );
};

export default OrangeInventoryTab;
