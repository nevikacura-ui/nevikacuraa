import React from 'react';
import { useCart } from '@/context/CartContext';
import { Plus, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Smart Bundle Suggestions
 * Shows "Frequently bought together" suggestions based on cart items
 */

// Bundle rules - items frequently bought together
const BUNDLE_RULES = {
  // Diabetes care bundles
  'metformin': ['glucometer strips', 'vitamin b12', 'alpha lipoic acid'],
  'glimepiride': ['metformin', 'glucometer strips'],
  'insulin': ['glucometer strips', 'alcohol swabs', 'syringes'],
  
  // Pain relief bundles
  'paracetamol': ['vitamin c', 'cold relief', 'throat lozenges'],
  'ibuprofen': ['muscle relaxant', 'pain relief gel'],
  'diclofenac': ['muscle relaxant', 'calcium'],
  
  // Vitamin bundles
  'vitamin d': ['calcium', 'vitamin k2', 'magnesium'],
  'vitamin b12': ['folic acid', 'iron'],
  'multivitamin': ['omega 3', 'probiotics'],
  
  // Digestive care
  'antacid': ['probiotics', 'digestive enzyme'],
  'omeprazole': ['antacid', 'probiotics'],
  
  // Heart health
  'atorvastatin': ['coq10', 'omega 3', 'aspirin'],
  'aspirin': ['atorvastatin', 'multivitamin'],
  
  // Antibiotics
  'amoxicillin': ['probiotics', 'vitamin c'],
  'azithromycin': ['probiotics', 'multivitamin'],
};

// Suggested products with details
const SUGGESTED_PRODUCTS = {
  'glucometer strips': { name: 'Accu-Chek Active Strips (50)', price: 899, discount: 10 },
  'vitamin b12': { name: 'Methylcobalamin 1500mcg', price: 299, discount: 15 },
  'alpha lipoic acid': { name: 'Alpha Lipoic Acid 300mg', price: 450, discount: 20 },
  'vitamin c': { name: 'Vitamin C 1000mg Tablets', price: 199, discount: 10 },
  'cold relief': { name: 'Cold & Flu Relief Tablets', price: 89, discount: 0 },
  'throat lozenges': { name: 'Strepsils Orange (24)', price: 145, discount: 5 },
  'muscle relaxant': { name: 'Thiocolchicoside 8mg', price: 120, discount: 10 },
  'pain relief gel': { name: 'Volini Pain Relief Gel', price: 180, discount: 15 },
  'calcium': { name: 'Calcium + Vitamin D3', price: 250, discount: 20 },
  'vitamin k2': { name: 'Vitamin K2-7 100mcg', price: 499, discount: 15 },
  'magnesium': { name: 'Magnesium Glycinate 400mg', price: 399, discount: 10 },
  'folic acid': { name: 'Folic Acid 5mg', price: 45, discount: 0 },
  'iron': { name: 'Ferrous Sulphate 200mg', price: 65, discount: 5 },
  'omega 3': { name: 'Omega 3 Fish Oil 1000mg', price: 599, discount: 25 },
  'probiotics': { name: 'Probiotics 50 Billion CFU', price: 450, discount: 20 },
  'digestive enzyme': { name: 'Digestive Enzyme Complex', price: 320, discount: 15 },
  'coq10': { name: 'CoQ10 100mg Softgels', price: 699, discount: 20 },
  'aspirin': { name: 'Aspirin 75mg EC', price: 35, discount: 0 },
  'multivitamin': { name: 'Daily Multivitamin', price: 399, discount: 15 },
  'antacid': { name: 'Antacid Tablets (30)', price: 120, discount: 10 },
};

export const SmartBundleSuggestions = ({ className = '' }) => {
  const { pharmacyCart, addToPharmacyCart } = useCart();

  // Find suggestions based on cart items
  const getSuggestions = () => {
    const suggestions = new Set();
    const cartItemNames = pharmacyCart.map(item => item.name?.toLowerCase() || '');

    // Check each cart item against bundle rules
    cartItemNames.forEach(itemName => {
      Object.entries(BUNDLE_RULES).forEach(([key, bundles]) => {
        if (itemName.includes(key)) {
          bundles.forEach(bundle => {
            // Don't suggest items already in cart
            if (!cartItemNames.some(name => name.includes(bundle))) {
              suggestions.add(bundle);
            }
          });
        }
      });
    });

    // Return max 4 suggestions with product details
    return Array.from(suggestions)
      .slice(0, 4)
      .map(key => ({
        key,
        ...SUGGESTED_PRODUCTS[key],
        id: `suggestion-${key.replace(/\s/g, '-')}`,
      }))
      .filter(item => item.name); // Only return items with valid product data
  };

  const suggestions = getSuggestions();

  if (suggestions.length === 0 || pharmacyCart.length === 0) {
    return null;
  }

  const handleAddToCart = (item) => {
    addToPharmacyCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      discountEligible: true,
    });
    toast.success(`${item.name} added to cart!`);
  };

  const handleAddAll = () => {
    suggestions.forEach(item => {
      addToPharmacyCart({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        discountEligible: true,
      });
    });
    toast.success(`${suggestions.length} items added to cart!`);
  };

  const totalSavings = suggestions.reduce((sum, item) => {
    return sum + (item.price * (item.discount / 100));
  }, 0);

  return (
    <div className={`bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Frequently Bought Together</h3>
        </div>
        {suggestions.length > 1 && (
          <Button
            onClick={handleAddAll}
            size="sm"
            className="bg-purple-500 hover:bg-purple-600 text-white text-xs"
          >
            Add All
          </Button>
        )}
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {suggestions.map((item) => (
          <div 
            key={item.key}
            className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800"
          >
            <p className="text-white text-sm font-medium line-clamp-2 mb-1">
              {item.name}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-semibold">₹{item.price}</span>
              {item.discount > 0 && (
                <span className="text-green-400 text-xs">{item.discount}% OFF</span>
              )}
            </div>
            <Button
              onClick={() => handleAddToCart(item)}
              size="sm"
              variant="outline"
              className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/10 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        ))}
      </div>

      {/* Savings Banner */}
      {totalSavings > 0 && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm">
            Save ₹{Math.round(totalSavings)} with this bundle!
          </span>
        </div>
      )}
    </div>
  );
};

export default SmartBundleSuggestions;
