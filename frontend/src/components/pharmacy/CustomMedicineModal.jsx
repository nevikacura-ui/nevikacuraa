import React from 'react';
import { X, Plus, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CustomMedicineModal = ({
  show,
  onClose,
  customMedicineName,
  setCustomMedicineName,
  customMedicineQty,
  setCustomMedicineQty,
  onAddCustomMedicine,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-zinc-700 animate-slide-up" onClick={(e) => e.stopPropagation()} data-testid="custom-medicine-modal">
        <div className="w-12 h-1 bg-zinc-600 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Add Medicine</h3>
            <p className="text-xs text-zinc-400">Type the name and we'll source it for you</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Medicine Name</label>
            <input
              type="text"
              value={customMedicineName}
              onChange={(e) => setCustomMedicineName(e.target.value)}
              placeholder="e.g. Crocin Advance 500mg"
              className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
              data-testid="custom-medicine-name"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCustomMedicineQty(Math.max(1, customMedicineQty - 1))}
                className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold text-lg flex items-center justify-center hover:bg-zinc-700"
              >-</button>
              <span className="text-white font-bold text-xl w-12 text-center" data-testid="custom-medicine-qty">{customMedicineQty}</span>
              <button
                onClick={() => setCustomMedicineQty(customMedicineQty + 1)}
                className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold text-lg flex items-center justify-center hover:bg-zinc-700"
              >+</button>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
            Price will be confirmed by the pharmacist before delivery.
          </p>

          <Button
            onClick={onAddCustomMedicine}
            disabled={!customMedicineName.trim()}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold text-white"
            data-testid="add-custom-medicine-submit"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomMedicineModal;
