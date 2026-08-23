import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCartAnimation } from './AddToCartAnimation';
import { ChevronRight, X } from 'lucide-react';

const FREE_DELIVERY_THRESHOLD = 1000;

const getFormIcon = (form) => {
  const f = (form || '').toLowerCase();
  if (f.includes('tab') || f.includes('cap')) return 'fa-solid fa-pills';
  if (f.includes('syrup') || f.includes('liquid')) return 'fa-solid fa-bottle-droplet';
  if (f.includes('cream') || f.includes('oint') || f.includes('gel')) return 'fa-solid fa-pump-medical';
  if (f.includes('drop')) return 'fa-solid fa-eye-dropper';
  return 'fa-solid fa-capsules';
};

/* Shared 3D glossy layers for both capsule and vial */
const GlossyTop = ({ tint = '255,255,255' }) => (
  <div className="absolute pointer-events-none z-20"
    style={{
      top: '1px', left: '10%', right: '14%', height: '48%',
      borderRadius: '999px 999px 60% 60%',
      background: `linear-gradient(180deg, rgba(${tint},0.60) 0%, rgba(${tint},0.18) 50%, transparent 100%)`,
    }}
  />
);

const GlossyBottom = ({ tint = '255,255,255' }) => (
  <div className="absolute pointer-events-none z-20"
    style={{
      bottom: '2px', left: '14%', right: '18%', height: '14%',
      borderRadius: '50% 50% 999px 999px',
      background: `linear-gradient(0deg, rgba(${tint},0.22) 0%, transparent 100%)`,
    }}
  />
);

/* ─── CAPSULE PILL (Orange Pharmacy) — Brand Icon + Pill paired ─── */
const CapsuleCart = ({ totalCount, lastItem, onClick }) => (
  <button onClick={onClick} data-testid="sticky-cart-bar"
    className="relative flex items-center transition-transform active:scale-[0.96]"
    style={{
      height: '48px', minWidth: '200px', borderRadius: '24px',
      boxShadow:
        '0 4px 18px rgba(234,88,12,0.30),' +
        '0 1px 4px rgba(0,0,0,0.14),' +
        '0 8px 22px -4px rgba(0,0,0,0.08)',
    }}
  >
    {/* Outer shell */}
    <div className="absolute inset-0 rounded-[24px] pointer-events-none"
      style={{
        border: '1.5px solid rgba(255,255,255,0.50)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.08)',
      }}
    />

    {/* LEFT 50% — Light orange-tinged glassmorphism cap */}
    <div className="relative h-full flex items-center justify-center gap-[5px] z-10 overflow-hidden"
      style={{
        width: '50%', borderRadius: '24px 4px 4px 24px',
        background: 'linear-gradient(155deg, rgba(255,237,213,0.45) 0%, rgba(255,213,170,0.35) 50%, rgba(251,191,136,0.30) 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.45)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.06)',
      }}
    >
      {/* Frosted shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        borderRadius: 'inherit',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, transparent 45%, rgba(249,115,22,0.06) 100%)',
      }} />
      <GlossyTop />
      {/* Logo + pill icons */}
      <img src="/orange-icon.png" alt="" className="relative z-30 w-[26px] h-[26px] object-contain"
        style={{ filter: 'brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.35))' }} />
      <div className="relative z-30 w-[1px] h-[16px] bg-white/30" />
      {lastItem ? (
        <i className={`${getFormIcon(lastItem.form)} text-[18px] text-white relative z-30`} style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))' }} />
      ) : (
        <i className="fa-solid fa-capsules text-[18px] text-white relative z-30" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))' }} />
      )}
    </div>

    {/* Center seam */}
    <div className="h-full z-20" style={{ width: '2.5px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.45), rgba(160,160,160,0.3) 40%, rgba(140,140,140,0.25) 60%, rgba(255,255,255,0.35))' }}
    />

    {/* RIGHT 50% — View Cart + Count */}
    <div className="relative h-full flex items-center justify-center z-10 overflow-hidden"
      style={{
        width: '50%', borderRadius: '4px 24px 24px 4px',
        background: 'linear-gradient(155deg, #FFFFFF 0%, #FAFAFA 30%, #F0F0F0 65%, #E4E4E4 90%, #D6D6D6 100%)',
      }}
    >
      <GlossyTop />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 'inherit',
          boxShadow: 'inset -3px 0 6px rgba(0,0,0,0.06), inset 3px 0 6px rgba(255,255,255,0.15)',
        }}
      />
      <div className="relative z-30 flex items-center gap-1 px-2.5">
        <div className="text-left">
          <p className="font-bold text-[12px] leading-tight text-gray-800">View cart</p>
          <p className="text-[9px] leading-tight text-gray-500">{totalCount} item{totalCount > 1 ? 's' : ''}</p>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
      </div>
    </div>
  </button>
);

/* ─── LAB VIAL (Mango Health Labs) — Brand Icon + Vial paired ─── */
const VialCart = ({ totalCount, onClick }) => (
  <button onClick={onClick} data-testid="sticky-cart-bar"
    className="relative flex items-center transition-transform active:scale-[0.96]"
    style={{
      height: '48px', minWidth: '200px',
      borderRadius: '10px 24px 24px 10px',
      boxShadow:
        '0 4px 18px rgba(16,185,129,0.28),' +
        '0 2px 6px rgba(0,0,0,0.12),' +
        '0 8px 22px -4px rgba(0,0,0,0.06)',
    }}
  >
    {/* LEFT — Light green-tinged glassmorphism screw cap */}
    <div className="relative h-full flex items-center justify-center gap-[4px] z-10 overflow-hidden"
      style={{
        width: '52px',
        borderRadius: '10px 0 0 10px',
        background: 'linear-gradient(180deg, rgba(220,252,231,0.45) 0%, rgba(187,247,208,0.35) 40%, rgba(167,243,195,0.30) 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.45)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.06)',
      }}
    >
      {/* Frosted shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        borderRadius: 'inherit',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, transparent 45%, rgba(34,197,94,0.06) 100%)',
      }} />
      {/* Grip ridges */}
      <div className="absolute inset-0 pointer-events-none" style={{
        borderRadius: 'inherit',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2.5px, rgba(255,255,255,0.08) 2.5px, rgba(255,255,255,0.08) 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 3.5px, transparent 3.5px, transparent 6px)',
      }} />
      {/* Cap highlight */}
      <div className="absolute pointer-events-none z-20" style={{
        top: '2px', left: '12%', right: '18%', height: '42%',
        borderRadius: '999px 999px 60% 60%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)',
      }} />
      {/* Logo + vial icons */}
      <img src="/mango-icon.png" alt="" className="relative z-30 w-[22px] h-[22px] object-contain"
        style={{ filter: 'brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
      <i className="fa-solid fa-vial text-[16px] text-white relative z-30" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
      {/* Flared base ring */}
      <div className="absolute right-0 top-[8%] bottom-[8%] pointer-events-none" style={{
        width: '3px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0.3) 100%)',
      }} />
    </div>

    {/* Neck seam */}
    <div className="h-full z-20" style={{ width: '2px',
      background: 'linear-gradient(180deg, rgba(180,200,180,0.8) 0%, rgba(120,160,120,0.4) 30%, rgba(200,220,200,0.7) 50%, rgba(120,160,120,0.4) 70%, rgba(180,200,180,0.8) 100%)',
    }} />

    {/* CENTER — Cylindrical glass/silver body */}
    <div className="relative h-full flex-1 flex items-center z-10 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #F5F5F5 0%, #E8E8E8 15%, #F0F0F0 35%, #D8D8D8 55%, #E0E0E0 75%, #D0D0D0 100%)',
      }}
    >
      {/* Glass highlight */}
      <div className="absolute pointer-events-none z-20" style={{
        top: '1px', left: '5%', right: '10%', height: '38%',
        borderRadius: '999px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.25) 60%, transparent 100%)',
      }} />
      {/* Inner cylinder shadow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 3px 5px rgba(255,255,255,0.5), inset 0 -3px 5px rgba(0,0,0,0.08), inset -2px 0 4px rgba(0,0,0,0.04)',
      }} />
      {/* Cart info */}
      <div className="relative z-30 flex items-center gap-2 pl-3 pr-2">
        <div className="text-left">
          <p className="font-bold text-[12px] leading-tight text-stone-800">View cart</p>
          <p className="text-[9px] leading-tight text-stone-500">{totalCount} test{totalCount > 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>

    {/* RIGHT — Rounded dome end */}
    <div className="relative h-full z-10 overflow-hidden"
      style={{
        width: '26px',
        borderRadius: '0 24px 24px 0',
        background: 'linear-gradient(180deg, #F0F0F0 0%, #E0E0E0 20%, #D4D4D4 50%, #C8C8C8 80%, #D0D0D0 100%)',
      }}
    >
      {/* Dome highlight */}
      <div className="absolute pointer-events-none z-20" style={{
        top: '3px', left: '0', right: '4px', height: '40%',
        borderRadius: '0 999px 999px 0',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 70%, transparent 100%)',
      }} />
      {/* Dome depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        borderRadius: 'inherit',
        boxShadow: 'inset -4px 0 6px rgba(0,0,0,0.08), inset 0 3px 4px rgba(255,255,255,0.35), inset 0 -3px 4px rgba(0,0,0,0.06)',
      }} />
      <div className="h-full flex items-center justify-center">
        <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
      </div>
    </div>
  </button>
);

const FloatingCartButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalCartCount, getPharmacyTotal, getLabTotal, pharmacyCart } = useCart();
  const { cartBouncing } = useCartAnimation();
  const [visible, setVisible] = useState(false);
  const [showDelivery, setShowDelivery] = useState(true);

  const totalCount = getTotalCartCount();
  const path = location.pathname;

  const hiddenPaths = ['/cart', '/checkout', '/payment', '/payment-success',
    '/pharmacy/checkout', '/mango/checkout', '/diagyn/checkout'];
  const isHiddenPage = hiddenPaths.some(p => path.startsWith(p));

  const isMangoPage = path.startsWith('/mango') || path.startsWith('/proton') || path.startsWith('/nexugene') || path === '/labs' || path === '/lab-reports';
  const isOrangePage = path === '/pharmacy' || path === '/orange-select' || path === '/trusted-formulary' || path === '/nutricare' || path.startsWith('/healthplus') || path.startsWith('/generics');
  const isAllowedPage = isMangoPage || isOrangePage;
  const isFullPage = isAllowedPage;

  useEffect(() => {
    setVisible(totalCount > 0 && !isHiddenPage && isAllowedPage);
  }, [totalCount, isHiddenPage, isAllowedPage]);

  if (!visible || totalCount === 0) return null;

  const total = getPharmacyTotal() + getLabTotal();
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100);
  const lastItem = pharmacyCart?.length > 0 ? pharmacyCart[pharmacyCart.length - 1] : null;
  const handleClick = () => navigate('/cart');

  return (
    <div
      className="fixed left-0 right-0 z-[200] px-4 pb-1 flex flex-col items-center gap-2"
      style={{ bottom: isFullPage ? '14px' : '68px' }}
      data-testid="floating-cart-area"
    >
      {/* Free Delivery Banner (pharmacy only) */}
      {!isMangoPage && showDelivery && remaining > 0 && (
        <div className="w-full bg-white rounded-xl border border-gray-200 shadow-lg px-3 py-2.5 flex items-center gap-3" data-testid="free-delivery-banner">
          <i className="fa-solid fa-truck-fast text-blue-600 text-base shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 text-xs font-bold">Get FREE delivery</p>
            <p className="text-gray-500 text-[10px]">Add products worth &#8377;{remaining.toFixed(0)} more</p>
            <div className="w-full h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setShowDelivery(false); }}
            className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center shrink-0"
            data-testid="dismiss-delivery-banner"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      )}

      {isMangoPage ? (
        <VialCart totalCount={totalCount} onClick={handleClick} />
      ) : (
        <CapsuleCart totalCount={totalCount} lastItem={lastItem} onClick={handleClick} />
      )}
    </div>
  );
};

export default FloatingCartButton;
