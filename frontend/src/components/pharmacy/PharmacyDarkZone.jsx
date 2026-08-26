import React from 'react';
import { Upload, Sparkles, Phone, Truck, MessageCircle, PenLine, ShoppingBag, ChevronRight } from 'lucide-react';
import {
  HeroBanner,
  SearchResults,
} from '@/components/pharmacy';
import { ExpressReorder } from '@/components/ExpressReorder';
import SmartReorderWidget from '@/components/SmartReorderWidget';
import { PrescriptionOCRButton } from '@/components/PrescriptionOCR';
import { QuickReorderButton } from '@/components/QuickReorder';
import { clay } from '@/utils/clayStyles';

/**
 * The "dark zone" of the Pharmacy — the top section with dark bg:
 * Logo, Hero search, Prescription upload, Quick action cards,
 * Popular medicines, sticky action bar, free delivery banner, etc.
 */
const PharmacyDarkZone = ({
  isDarkMode,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchLoading,
  totalCount,
  handleSearchSelect,
  handleAddToCart,
  setShowPrescriptionUpload,
  setShowCustomMedicine,
  setShowQuickReorder,
}) => {
  return (
    <>
      {/* Orange Pharmacy Logo */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2" data-testid="orange-pharmacy-logo-section">
        <div className="flex justify-center">
          <img
            src="https://customer-assets.emergentagent.com/job_bca41f8b-595d-4303-b542-29821f425e4e/artifacts/ucdmvm5p_3089-removebg-preview.png"
            alt="Orange Pharmacy"
            className="h-36 w-auto object-contain"
            style={{ filter: 'drop-shadow(0 0 25px rgba(249, 115, 22, 0.4))' }}
            decoding="async"
            fetchPriority="high"
            data-testid="orange-pharmacy-logo"
          />
        </div>
      </div>

      {/* Hero Banner (search bar) */}
      <HeroBanner
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={() => {}}
        totalCount={totalCount}
      />

      {/* Search Results Dropdown */}
      {(searchResults.length > 0 || searchLoading) && searchQuery && (
        <div className="max-w-7xl mx-auto px-4 relative -mt-4">
          <SearchResults
            results={searchResults}
            loading={searchLoading}
            onSelect={handleSearchSelect}
            onAdd={handleAddToCart}
            onClose={() => { setSearchQuery(''); }}
          />
        </div>
      )}

      {/* Prescription Upload CTA Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <button
          onClick={() => setShowPrescriptionUpload(true)}
          className="w-full rounded-2xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.98] group relative overflow-hidden"
          style={isDarkMode
            ? { background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(249,115,22,0.15) 100%)', border: '1px solid rgba(251,191,36,0.25)' }
            : { ...clay.card, background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(249,115,22,0.08) 100%)' }
          }
          data-testid="rx-upload-cta-banner"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)' }}>
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>Upload Prescription & Save</p>
            <p className={`text-[10px] ${isDarkMode ? 'text-amber-400/70' : 'text-amber-600/70'}`}>We'll add medicines & you get the best price</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={isDarkMode ? { background: 'rgba(251,191,36,0.2)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' } : { background: 'rgba(251,191,36,0.15)', color: '#B45309', border: '1px solid rgba(251,191,36,0.3)' }}>Rx</span>
        </button>
      </div>

      {/* Ad Banner (dark mode only) */}
      {isDarkMode !== false && (
      <div className="max-w-7xl mx-auto px-4 pb-2" data-testid="pharmacy-ad-banner">
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <img src="https://customer-assets.emergentagent.com/job_5f77c833-80cb-4ed5-a62e-988f56319661/artifacts/vnz8b3hq_file_00000000d7cc720b80088442d9c28a55.png" alt="Orange Pharmacy" className="w-full h-auto" loading="lazy" />
        </div>
      </div>
      )}

      {/* Quick Action Cards */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setShowPrescriptionUpload(true)}
            className="backdrop-blur rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
            style={isDarkMode ? { background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(249,115,22,0.15)' } : { ...clay.card, borderColor: 'rgba(249,115,22,0.2)' }}
            data-testid="upload-prescription-btn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-stone-800 text-sm">Upload Prescription</p>
                <p className="text-xs text-orange-500 font-medium">We'll add medicines</p>
              </div>
            </div>
          </button>
          <button onClick={() => setShowCustomMedicine(true)}
            className="backdrop-blur rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
            style={isDarkMode ? { background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(139,92,246,0.15)' } : { ...clay.card, borderColor: 'rgba(139,92,246,0.2)' }}
            data-testid="add-custom-medicine-btn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                <PenLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-stone-800 text-sm">Type Medicine</p>
                <p className="text-xs text-violet-500 font-medium">Can't find? Add by name</p>
              </div>
            </div>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <a href="/diagyn"
            className="backdrop-blur rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
            style={isDarkMode ? { background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(16,185,129,0.15)' } : { ...clay.card, borderColor: 'rgba(16,185,129,0.2)' }}
            data-testid="book-consultation-btn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-stone-800 text-sm">Consult a Doctor</p>
                <p className="text-xs text-emerald-500 font-medium">Don't have a prescription?</p>
              </div>
            </div>
          </a>
          <a href="/nutricare"
            className="backdrop-blur rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
            style={isDarkMode ? { background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(6,182,212,0.15)' } : { ...clay.card, borderColor: 'rgba(6,182,212,0.2)' }}
            data-testid="healthplus-switch-btn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-stone-800 text-sm">Health Products</p>
                <p className="text-xs text-cyan-500 font-medium">Devices & wellness</p>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Free Delivery Banner */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 rounded-2xl shadow-xl shadow-orange-500/20 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <Truck className="w-5 h-5 text-white flex-shrink-0" />
            <span className="font-bold text-white text-sm">Free delivery on order ₹1000</span>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/30">FREE</span>
          </div>
        </div>
      </div>

      {/* CuraBonus Loyalty Banner */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <a href="/cura-bonus"
          className="block rounded-2xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.98] overflow-hidden relative"
          style={isDarkMode
            ? { background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(34,197,94,0.08) 100%)', border: '1px solid rgba(249,115,22,0.2)' }
            : { ...clay.banner, background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(34,197,94,0.06) 100%)' }
          }
          data-testid="curabonus-banner">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full border border-orange-500/10" />
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #F97316, #22C55E)', boxShadow: '0 4px 16px rgba(249,115,22,0.25)' }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>CuraBonus Rewards</p>
            <p className={`text-[10px] ${isDarkMode ? 'text-orange-300/60' : 'text-orange-600/60'}`}>Earn coins on every order. Unlock rewards!</p>
          </div>
          <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-orange-400/40' : 'text-orange-500/50'}`} />
        </a>
      </div>

      {/* Express Reorder */}
      <div className="max-w-7xl mx-auto px-4 pb-2">
        <ExpressReorder />
      </div>

      {/* Smart Reorder Widget */}
      <div className="max-w-7xl mx-auto px-4 pb-2">
        <SmartReorderWidget />
      </div>

      {/* Popular Medicines */}
      {!searchQuery && (
        <div className="max-w-7xl mx-auto px-4 pb-4" data-testid="popular-medicines">
          <h3 className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-stone-700'}`}>Popular Medicines</h3>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {['Paracetamol 500mg', 'Crocin Advance', 'Dolo 650', 'Azithromycin', 'Cetirizine', 'Pan-D', 'Shelcal 500', 'Vitamin D3'].map((name, i) => (
              <button key={i}
                onClick={() => { setSearchQuery(name); }}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-medium transition-all active:scale-95 ${isDarkMode ? 'text-white/70 border border-white/8 bg-white/[0.04] hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-300' : 'text-stone-600 bg-white/60 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300'}`}
                style={isDarkMode ? {} : clay.pill}
                data-testid={`popular-med-${i}`}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Action Buttons Bar */}
      <div className="sticky top-0 z-40 py-2 px-4 safe-area-top"
        style={isDarkMode
          ? { background: 'rgba(5,5,16,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }
          : { ...clay.header }
        }>
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <PrescriptionOCRButton className="flex-1 text-sm px-3 py-2.5 justify-center" />
          <QuickReorderButton
            onClick={() => setShowQuickReorder(true)}
            className="flex-1 text-sm px-3 py-2.5 justify-center"
          />
          <a href="https://wa.me/917039030030?text=Hi%2C%20I%20would%20like%20to%20order%20medicines"
            target="_blank" rel="noopener noreferrer"
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
            data-testid="chat-pharmacist-btn">
            <MessageCircle className="w-4 h-4" />Chat
          </a>
          <a href="tel:+917039030030"
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
            data-testid="call-pharmacist-btn">
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Dark → Warm White Transition */}
      <div
        className="w-full"
        style={{ background: isDarkMode ? 'linear-gradient(180deg, #050510 0%, #1a1520 30%, #e8ddd0 70%, #FFF8F0 100%)' : 'linear-gradient(180deg, #F0EBE3 0%, #F5F0E8 50%, #FFF8F0 100%)', height: '120px' }}
        data-testid="theme-transition-gradient"
      />
    </>
  );
};

export default PharmacyDarkZone;
