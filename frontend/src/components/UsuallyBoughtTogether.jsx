import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Plus, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Medicine pairing data - commonly bought together
const MEDICINE_PAIRINGS = {
  // Diabetes
  'metformin': ['Vitamin B12', 'Glucometer Strips', 'Glycomet GP'],
  'glimepiride': ['Metformin', 'Vitamin B12', 'Blood Sugar Monitor'],
  
  // Blood Pressure
  'amlodipine': ['Telmisartan', 'Aspirin', 'Ecosprin'],
  'telmisartan': ['Amlodipine', 'Atorvastatin', 'Clopidogrel'],
  
  // Cholesterol
  'atorvastatin': ['Aspirin', 'Clopidogrel', 'Fish Oil Omega-3'],
  'rosuvastatin': ['Fenofibrate', 'Aspirin', 'Coenzyme Q10'],
  
  // Pain Relief
  'paracetamol': ['Ibuprofen', 'Cetirizine', 'Vitamin C'],
  'ibuprofen': ['Paracetamol', 'Pantoprazole', 'Muscle Relaxant'],
  
  // Acidity
  'pantoprazole': ['Domperidone', 'Antacid Gel', 'Digestive Enzymes'],
  'omeprazole': ['Ondansetron', 'Antacid', 'Probiotics'],
  
  // Antibiotics
  'azithromycin': ['Probiotics', 'Vitamin C', 'Zinc'],
  'amoxicillin': ['Probiotics', 'Vitamin B Complex', 'Clavulanic Acid'],
  
  // Vitamins
  'vitamin d3': ['Calcium', 'Vitamin K2', 'Magnesium'],
  'vitamin b12': ['Folic Acid', 'Iron', 'Vitamin B Complex'],
  
  // Thyroid
  'thyroxine': ['Calcium (take 4hr gap)', 'Selenium', 'Vitamin D3'],
  'levothyroxine': ['Vitamin D3', 'Selenium', 'B12'],
};

// Price estimates for suggestions
const SUGGESTION_PRICES = {
  'Vitamin B12': 120,
  'Glucometer Strips': 450,
  'Telmisartan': 180,
  'Aspirin': 35,
  'Ecosprin': 45,
  'Atorvastatin': 150,
  'Clopidogrel': 95,
  'Fish Oil Omega-3': 380,
  'Probiotics': 250,
  'Vitamin C': 85,
  'Zinc': 75,
  'Calcium': 120,
  'Vitamin K2': 350,
  'Magnesium': 180,
  'Folic Acid': 45,
  'Iron': 65,
  'Pantoprazole': 85,
  'Domperidone': 55,
  'Antacid Gel': 120,
  'Digestive Enzymes': 180,
  'Selenium': 220,
  'Cetirizine': 35,
  'Ibuprofen': 45,
  'Paracetamol': 25,
};

const UsuallyBoughtTogether = ({ cartItems = [], onAddToCart, className = '' }) => {
  const [dismissedItems, setDismissedItems] = useState([]);

  // Generate suggestions based on cart items
  const suggestions = useMemo(() => {
    const allSuggestions = new Set();
    const cartItemNames = cartItems.map(item => 
      (item.name || item.medicine || '').toLowerCase()
    );
    
    // Find matching pairings
    cartItemNames.forEach(itemName => {
      Object.entries(MEDICINE_PAIRINGS).forEach(([key, paired]) => {
        if (itemName.includes(key)) {
          paired.forEach(p => {
            // Don't suggest items already in cart
            const alreadyInCart = cartItemNames.some(c => 
              c.includes(p.toLowerCase()) || p.toLowerCase().includes(c)
            );
            if (!alreadyInCart && !dismissedItems.includes(p)) {
              allSuggestions.add(p);
            }
          });
        }
      });
    });

    // Convert to array with prices
    return Array.from(allSuggestions).slice(0, 4).map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      price: SUGGESTION_PRICES[name] || Math.floor(Math.random() * 200) + 50,
      reason: 'Frequently bought together'
    }));
  }, [cartItems, dismissedItems]);

  const handleAddItem = (item) => {
    if (onAddToCart) {
      onAddToCart({
        id: Date.now(),
        name: item.name,
        quantity: 1,
        price: item.price,
        fromSuggestion: true
      });
    }
    toast.success(`${item.name} added to cart`);
    setDismissedItems(prev => [...prev, item.name]);
  };

  const handleDismiss = (itemName) => {
    setDismissedItems(prev => [...prev, itemName]);
  };

  if (suggestions.length === 0 || cartItems.length === 0) return null;

  const totalSavings = suggestions.reduce((sum, item) => sum + Math.round(item.price * 0.1), 0);

  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 ${className}`} data-testid="usually-bought-together">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Usually Bought Together</h3>
          <p className="text-xs text-slate-500">Complete your health routine</p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-2">
        {suggestions.map((item) => (
          <div 
            key={item.id}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-slate-800 text-sm">{item.name}</p>
              <p className="text-xs text-slate-500">{item.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">₹{item.price}</span>
              <button
                onClick={() => handleAddItem(item)}
                className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add All Button */}
      {suggestions.length > 1 && (
        <Button
          onClick={() => suggestions.forEach(item => handleAddItem(item))}
          variant="outline"
          className="w-full mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add All ({suggestions.length} items) • Save ~₹{totalSavings}
        </Button>
      )}
    </div>
  );
};

export default UsuallyBoughtTogether;
