// Discount utility for Nevika Cura
// 15% flat discount is already applied in DB (sale_price = MRP * 0.85)
// No coupons. Checkout uses DB prices directly.

const DRUG_FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'drops', 'liquid', 'expectorant'];

export const VERIFIED_BRANDS = [
  'cipla', 'sun pharmaceutical', 'sun pharma', "dr. reddy's", 'dr reddy', 'dr. reddys',
  'lupin', 'torrent', 'zydus', 'alkem', 'aurobindo', 'biocon', 'abbott',
  'mankind', 'anthem', 'covaxyl', 'winovulation',
];

export const isVerifiedBrand = (manufacturer) => {
  if (!manufacturer) return false;
  const m = manufacturer.toLowerCase().trim();
  return VERIFIED_BRANDS.some(b => m.includes(b));
};

export const isPrescriptionRequired = (form) => isDrug(form);

export const isDrug = (form) => {
  const f = (form || '').toLowerCase();
  return DRUG_FORMS.some(d => f.includes(d));
};

export const getDiscountPercent = () => 15;

export const getDiscountedPrice = (mrp) => {
  if (!mrp || mrp <= 0) return mrp;
  return Math.round(mrp * 0.85 * 100) / 100;
};

export const getDiscountLabel = () => 'Flat 15% Off';

// Delivery zones
const PRIMARY_PINCODES = ['401101','401104','401105','401107','401201','401202','401203','401207','401208','401304'];

const SECONDARY_PINCODES = [
  ...Array.from({length: 89}, (_, i) => String(400001 + i).padStart(6, '0')),
  '401203','401209','401303','401305',
];

export const getDeliveryZone = (pincode) => {
  const p = String(pincode).trim();
  if (PRIMARY_PINCODES.includes(p)) return { zone: 'primary', express: 49, nextDay: 0, label: 'Primary Zone' };
  if (SECONDARY_PINCODES.includes(p)) return { zone: 'secondary', express: 99, nextDay: 49, label: 'Secondary Zone' };
  return { zone: 'unserviceable', express: null, nextDay: null, label: 'Not Serviceable' };
};

export const getDeliveryEstimate = (pincode) => {
  const zone = getDeliveryZone(pincode);
  if (zone.zone === 'unserviceable') return null;
  const now = new Date();
  const hour = now.getHours();
  if (hour < 15) {
    return { expressBy: 'Today, within 3 hours', freeBy: 'Tomorrow', cutoff: false };
  }
  return { expressBy: 'Today, within 3 hours', freeBy: 'Day after tomorrow', cutoff: true };
};

// No coupons — removed per user request
export const getCouponDiscount = () => ({ percent: 0, label: null });

export const calculateOrderTotal = (items, pincode, isExpress = false) => {
  let itemTotal = 0;  // sum of MRP
  let discountTotal = 0;

  items.forEach(item => {
    const mrp = item.mrp || item.price || 0;
    const salePrice = item.price || item.sale_price || getDiscountedPrice(mrp);
    const qty = item.quantity || 1;
    itemTotal += mrp * qty;
    discountTotal += (mrp - salePrice) * qty;
  });

  const subtotal = itemTotal - discountTotal;

  const zone = getDeliveryZone(pincode);
  let deliveryFee = 0;
  if (zone.zone !== 'unserviceable') {
    if (isExpress) {
      deliveryFee = zone.express;
    } else {
      deliveryFee = subtotal >= 1000 ? 0 : zone.nextDay;
    }
  }

  return {
    itemTotal: Math.round(itemTotal * 100) / 100,
    flatDiscount: Math.round(discountTotal * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    coupon: { percent: 0, label: null },
    couponAmount: 0,
    afterCoupon: Math.round(subtotal * 100) / 100,
    deliveryFee,
    total: Math.round((subtotal + deliveryFee) * 100) / 100,
    zone,
  };
};
