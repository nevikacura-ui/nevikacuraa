import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WishlistContext = createContext();
const STORAGE_KEY = 'nc_wishlist';

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be inside WishlistProvider');
  return ctx;
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = useCallback((item) => {
    setWishlist(prev => {
      const key = item.id || item.name;
      if (prev.some(w => (w.id || w.name) === key)) return prev;
      return [...prev, {
        id: item.id,
        name: item.name,
        mrp: item.mrp,
        sale_price: item.sale_price || item.price,
        image_url: item.image_url,
        form: item.form,
        manufacturer: item.manufacturer,
      }];
    });
  }, []);

  const removeFromWishlist = useCallback((itemId) => {
    setWishlist(prev => prev.filter(w => (w.id || w.name) !== itemId));
  }, []);

  const isInWishlist = useCallback((itemId) => {
    return wishlist.some(w => (w.id || w.name) === itemId);
  }, [wishlist]);

  const toggleWishlist = useCallback((item) => {
    const key = item.id || item.name;
    if (isInWishlist(key)) {
      removeFromWishlist(key);
      return false;
    } else {
      addToWishlist(item);
      return true;
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist, wishlistCount: wishlist.length }}>
      {children}
    </WishlistContext.Provider>
  );
};
