import React from 'react';
import { useMango } from './MangoContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { X, Heart, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import CashfreeCheckout from '@/components/CashfreeCheckout';
import TestDetailSheet from '@/components/TestDetailSheet';

const MangoModals = () => {
  const m = useMango();

  return (
    <>
      {/* Wishlist Dialog */}
      {m.showWishlist && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => m.setShowWishlist(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] p-5 text-white relative">
              <button onClick={() => m.setShowWishlist(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3"><Heart className="w-6 h-6 fill-white" /><h2 className="text-xl font-bold">My Wishlist</h2></div>
              <p className="text-white/80 text-sm mt-1">{m.wishlist.length} saved tests</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4">
              {m.wishlist.length === 0 ? (
                <div className="text-center py-10">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-[#6F7B77]">No tests saved yet</p>
                  <p className="text-xs text-slate-400 mt-1">Tap the heart icon on any test to save it</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {m.wishlist.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#F7F9F8] rounded-xl">
                      <div className="flex-1"><p className="font-medium text-[#2B2B2B] text-sm">{item.name}</p><p className="text-xs text-[#6F7B77]">{item.category}</p></div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">₹{item.price}</span>
                        <button onClick={() => { m.setSelectedTests([item.name]); m.setCurrentStep(1); m.setShowWishlist(false); toast.success(`${item.name} added to cart!`); }}
                          className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600">Add</button>
                        <button onClick={() => m.toggleWishlist(item)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {m.wishlist.length > 0 && (
              <div className="p-4 border-t border-[#D2DAD7]">
                <Button onClick={() => { m.setSelectedTests(m.wishlist.map(w => w.name)); m.setCurrentStep(1); m.setShowWishlist(false); toast.success('All wishlist items added to cart!'); }}
                  className="w-full bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] text-white font-bold py-3 rounded-xl">
                  Add All to Cart ({m.wishlist.length} items)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cashfree Payment Dialog */}
      <CashfreeCheckout
        open={m.showPaymentDialog} onOpenChange={m.setShowPaymentDialog}
        orderDetails={{ type: 'lab_test', amount: m.orderTotal, productId: `LAB_${Date.now()}`, customerName: m.patientInfo.name, customerEmail: m.patientInfo.email, customerPhone: m.patientInfo.phone }}
        onPaymentSuccess={m.handlePaymentSuccess} allowCOD={true} returnPath="/mango"
      />

      {/* Test Details Sheet */}
      {m.selectedTestDetails && (
        <TestDetailSheet test={{ ...m.selectedTestDetails, onAdd: () => m.handleTestSelect(m.selectedTestDetails) }}
          onClose={() => m.setSelectedTestDetails(null)} source="mango" />
      )}

      {/* AI-Powered Rich Test Details */}
      {m.detailsModal && (() => {
        const safe = (val) => {
          if (!val) return null;
          if (typeof val === 'string') return val;
          if (Array.isArray(val)) return val.join(', ');
          if (typeof val === 'object') return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('; ');
          return String(val);
        };
        const catStyle = m.getCategoryStyle(m.detailsModal.name);
        const isInCart = m.selectedTests.includes(m.detailsModal.name);
        return (
        <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0a0a1a' }} data-testid="test-details-page">
          <div className="relative pt-12 pb-8 px-5" style={{ background: catStyle.gradient }}>
            <button onClick={() => m.setDetailsModal(null)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm" data-testid="details-back-btn">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[11px] font-bold text-white border border-white/25 mb-3 backdrop-blur-sm">{catStyle.label}</span>
            <h1 className="text-2xl font-bold text-white drop-shadow-sm leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{m.detailsModal.name}</h1>
            {m.detailsModal.price != null && <span className="text-3xl font-black text-white mt-2 block">₹{m.detailsModal.price}</span>}
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32 space-y-5">
            {m.detailsModal.description && (
              <div><h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">About This Test</h4><p className="text-sm text-white/70 leading-relaxed">{safe(m.detailsModal.description)}</p></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {m.detailsModal.sample_type && (
                <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] font-bold text-white/30 uppercase">Sample Type</p>
                  <p className="text-sm font-semibold text-white/80 mt-1">{safe(m.detailsModal.sample_type || m.detailsModal.sampleType)}</p>
                </div>
              )}
              {m.detailsModal.report_time && (
                <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] font-bold text-white/30 uppercase">Report Time</p>
                  <p className="text-sm font-semibold text-white/80 mt-1">{safe(m.detailsModal.report_time || m.detailsModal.reportTime)}</p>
                </div>
              )}
              {m.detailsModal.fasting && (
                <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] font-bold text-white/30 uppercase">Fasting</p>
                  <p className="text-sm font-semibold text-white/80 mt-1">{safe(m.detailsModal.fasting)}</p>
                </div>
              )}
              {m.detailsModal.tests_included && (
                <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] font-bold text-white/30 uppercase">Tests Included</p>
                  <p className="text-sm font-semibold text-white/80 mt-1">{safe(m.detailsModal.tests_included || m.detailsModal.testsIncluded)}</p>
                </div>
              )}
            </div>
            {m.detailsModal.preparation && (
              <div><h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Preparation</h4><p className="text-sm text-white/70 leading-relaxed">{safe(m.detailsModal.preparation)}</p></div>
            )}
            {m.detailsModal.who_should_test && (
              <div><h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Who Should Get This Test</h4><p className="text-sm text-white/70 leading-relaxed">{safe(m.detailsModal.who_should_test)}</p></div>
            )}
            {m.detailsModal.normal_range && (
              <div><h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Normal Range</h4><p className="text-sm text-white/70 leading-relaxed">{safe(m.detailsModal.normal_range)}</p></div>
            )}
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(180deg, transparent, #0a0a1a 30%)' }}>
            <div className="flex gap-3 max-w-lg mx-auto">
              <Button variant="outline" className="flex-1 rounded-xl border-white/20 text-white hover:bg-white/10" onClick={() => m.setDetailsModal(null)}>Close</Button>
              <Button className={`flex-1 rounded-xl font-bold shadow-lg ${isInCart ? 'bg-green-500 hover:bg-green-600' : ''}`}
                style={!isInCart ? { background: 'linear-gradient(135deg, #F59E0B, #F97316)' } : {}}
                onClick={() => { if (!isInCart) { m.toggleTest(m.detailsModal.name); toast.success(`${m.detailsModal.name} added to cart!`); } m.setDetailsModal(null); }}>
                {isInCart ? (<><CheckCircle2 className="w-4 h-4 mr-2" /> In Cart</>) : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
};

export default MangoModals;
