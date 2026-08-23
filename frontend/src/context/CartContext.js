import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [pharmacyCart, setPharmacyCart] = useState(() => {
    const saved = localStorage.getItem('pharmacyCart');
    return saved ? JSON.parse(saved) : [];
  });

  const [labCart, setLabCart] = useState(() => {
    const saved = localStorage.getItem('labCart');
    return saved ? JSON.parse(saved) : [];
  });

  const [labMembers, setLabMembers] = useState(() => {
    const saved = localStorage.getItem('labMembers');
    return saved ? JSON.parse(saved) : [{ id: 'self', name: '', age: '', isDefault: true }];
  });

  const [labTestAssignments, setLabTestAssignments] = useState(() => {
    const saved = localStorage.getItem('labTestAssignments');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => { localStorage.setItem('pharmacyCart', JSON.stringify(pharmacyCart)); }, [pharmacyCart]);
  useEffect(() => { localStorage.setItem('labCart', JSON.stringify(labCart)); }, [labCart]);
  useEffect(() => { localStorage.setItem('labMembers', JSON.stringify(labMembers)); }, [labMembers]);
  useEffect(() => { localStorage.setItem('labTestAssignments', JSON.stringify(labTestAssignments)); }, [labTestAssignments]);

  // ── Pharmacy cart ──────────────────────────────
  const addToPharmacyCart = (item) => {
    setPharmacyCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) {
        return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i);
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeFromPharmacyCart = (itemName) => {
    setPharmacyCart(prev => prev.filter(i => i.name !== itemName));
  };

  const updatePharmacyQuantity = (itemName, quantity) => {
    if (quantity <= 0) { removeFromPharmacyCart(itemName); return; }
    setPharmacyCart(prev => prev.map(i => i.name === itemName ? { ...i, quantity } : i));
  };

  const clearPharmacyCart = () => {
    setPharmacyCart([]);
    localStorage.removeItem('pharmacyCart');
  };

  // ── Lab cart ───────────────────────────────────
  const addToLabCart = (test) => {
    setLabCart(prev => {
      const existing = prev.find(t => t.name === test.name);
      if (existing) return prev;
      return [...prev, test];
    });
  };

  const removeFromLabCart = (testName) => {
    setLabCart(prev => prev.filter(t => t.name !== testName));
  };

  const clearLabCart = () => {
    setLabCart([]);
    setLabTestAssignments({});
    localStorage.removeItem('labCart');
    localStorage.removeItem('labTestAssignments');
  };

  // ── Lab members ────────────────────────────────
  const addLabMember = () => {
    const newMember = { id: `member_${Date.now()}`, name: '', age: '', isDefault: false };
    setLabMembers(prev => [...prev, newMember]);
    return newMember.id;
  };

  const updateLabMember = (memberId, field, value) => {
    setLabMembers(prev => prev.map(m => m.id === memberId ? { ...m, [field]: value } : m));
  };

  const removeLabMember = (memberId) => {
    setLabMembers(prev => prev.filter(m => m.id !== memberId));
    setLabTestAssignments(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(testName => {
        if (updated[testName] === memberId) updated[testName] = 'self';
      });
      return updated;
    });
  };

  const assignTestToMember = (testName, memberId) => {
    setLabTestAssignments(prev => ({ ...prev, [testName]: memberId }));
  };

  const assignAllTestsToMember = (memberId) => {
    const assignments = {};
    labCart.forEach(t => { assignments[t.name] = memberId; });
    setLabTestAssignments(assignments);
  };

  const getTestMember = (testName) => labTestAssignments[testName] || 'self';
  const getMemberById = (memberId) => labMembers.find(m => m.id === memberId) || labMembers[0];

  // ── Consultation cart ──────────────────────────
  const [consultationCart, setConsultationCart] = useState([]);

  const addToConsultationCart = (consultation) => {
    setConsultationCart(prev => {
      const existing = prev.find(c => c.id === consultation.id);
      if (existing) return prev;
      return [...prev, consultation];
    });
  };

  const removeFromConsultationCart = (id) => {
    setConsultationCart(prev => prev.filter(c => c.id !== id));
  };

  const clearConsultationCart = () => setConsultationCart([]);
  const getConsultationTotal = () => consultationCart.reduce((sum, c) => sum + (c.fee || 0), 0);
  const getConsultationCartCount = () => consultationCart.length;

  // ── Totals (simple — no coupons, no coins, no loyalty) ──
  const getPharmacyTotal = () => {
    return pharmacyCart.reduce((sum, item) => sum + ((item.price || item.mrp || 0) * item.quantity), 0);
  };

  const getLabTotal = () => labCart.reduce((sum, test) => sum + (test.price || 0), 0);

  // No discounts — just sale price
  const calculateDiscount = () => 0;

  // Delivery: ₹49 for pharmacy orders < ₹1000, free for >= ₹1000
  // Lab tests always have FREE home collection
  const getDeliveryCharge = () => {
    const pharmTotal = getPharmacyTotal();
    if (pharmTotal > 0 && pharmTotal < 1000) return 49;
    return 0;
  };

  const getDeliveryLabel = () => {
    const pharmTotal = getPharmacyTotal();
    if (pharmTotal > 0 && pharmTotal < 1000) return 'Delivery (₹49)';
    if (pharmTotal >= 1000) return 'FREE Delivery';
    return 'FREE Home Collection';
  };

  // Cart counts
  const getPharmacyCartCount = () => pharmacyCart.reduce((sum, item) => sum + item.quantity, 0);
  const getLabCartCount = () => labCart.length;
  const getTotalCartCount = () => getPharmacyCartCount() + getLabCartCount() + getConsultationCartCount();

  // Grand total = items + delivery (no discounts)
  const getGrandTotal = () => getPharmacyTotal() + getLabTotal() + getConsultationTotal() + getDeliveryCharge();

  // Stubs for backward compatibility (some components may still reference these)
  const appliedCoupon = null;
  const applyCoupon = () => ({ success: false, message: 'Coupons are not available' });
  const removeCoupon = () => {};
  const getCouponDiscount = () => 0;
  const getCouponInfo = () => null;
  const hasEligibleItems = () => false;
  const curaCoins = 0;
  const setCuraCoins = () => {};
  const coinsToRedeem = 0;
  const setCoinsToRedeem = () => {};
  const getCoinsDiscount = () => 0;
  const loyaltyPoints = 0;
  const setLoyaltyPoints = () => {};
  const pointsToUse = 0;
  const setPointsToUse = () => {};
  const deliveryOption = 'standard';
  const setDeliveryOption = () => {};

  const value = {
    pharmacyCart, addToPharmacyCart, removeFromPharmacyCart, updatePharmacyQuantity,
    clearPharmacyCart, getPharmacyTotal, getPharmacyCartCount,
    labCart, addToLabCart, removeFromLabCart, clearLabCart, getLabTotal, getLabCartCount,
    labMembers, setLabMembers, addLabMember, updateLabMember, removeLabMember,
    labTestAssignments, assignTestToMember, assignAllTestsToMember, getTestMember, getMemberById,
    consultationCart, addToConsultationCart, removeFromConsultationCart, clearConsultationCart,
    getConsultationTotal, getConsultationCartCount,
    getTotalCartCount, getGrandTotal,
    deliveryOption, setDeliveryOption, getDeliveryCharge, getDeliveryLabel,
    appliedCoupon, applyCoupon, removeCoupon, calculateDiscount, getCouponDiscount, getCouponInfo, hasEligibleItems,
    curaCoins, setCuraCoins, coinsToRedeem, setCoinsToRedeem, getCoinsDiscount,
    loyaltyPoints, setLoyaltyPoints, pointsToUse, setPointsToUse,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
