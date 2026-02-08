import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Plus, Minus, FlaskConical, Calculator, ShoppingCart, 
  ChevronRight, Sparkles, Check, Search, Filter, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Test catalog with categories and prices
const TEST_CATALOG = {
  'Basic Tests': [
    { id: 'cbc', name: 'CBC (Complete Blood Count)', price: 350, popular: true },
    { id: 'urine', name: 'Urine Routine & Microscopy', price: 150 },
    { id: 'blood-sugar-f', name: 'Fasting Blood Sugar', price: 80 },
    { id: 'blood-sugar-pp', name: 'Post Prandial Blood Sugar', price: 80 },
    { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', price: 450, popular: true },
  ],
  'Lipid Profile': [
    { id: 'lipid-full', name: 'Lipid Profile (Complete)', price: 550, popular: true },
    { id: 'cholesterol', name: 'Total Cholesterol', price: 150 },
    { id: 'hdl', name: 'HDL Cholesterol', price: 200 },
    { id: 'ldl', name: 'LDL Cholesterol', price: 200 },
    { id: 'triglycerides', name: 'Triglycerides', price: 200 },
  ],
  'Liver Function': [
    { id: 'lft', name: 'LFT (Liver Function Test)', price: 650, popular: true },
    { id: 'sgot', name: 'SGOT/AST', price: 150 },
    { id: 'sgpt', name: 'SGPT/ALT', price: 150 },
    { id: 'bilirubin', name: 'Bilirubin Total & Direct', price: 200 },
    { id: 'albumin', name: 'Serum Albumin', price: 150 },
  ],
  'Kidney Function': [
    { id: 'kft', name: 'KFT (Kidney Function Test)', price: 750, popular: true },
    { id: 'creatinine', name: 'Serum Creatinine', price: 150 },
    { id: 'urea', name: 'Blood Urea', price: 150 },
    { id: 'uric-acid', name: 'Uric Acid', price: 180 },
    { id: 'egfr', name: 'eGFR', price: 200 },
  ],
  'Thyroid': [
    { id: 'thyroid-full', name: 'Thyroid Profile (T3, T4, TSH)', price: 650, popular: true },
    { id: 'tsh', name: 'TSH', price: 250 },
    { id: 't3', name: 'T3 (Triiodothyronine)', price: 200 },
    { id: 't4', name: 'T4 (Thyroxine)', price: 200 },
  ],
  'Vitamins & Minerals': [
    { id: 'vit-d', name: 'Vitamin D (25-OH)', price: 950, popular: true },
    { id: 'vit-b12', name: 'Vitamin B12', price: 750, popular: true },
    { id: 'iron-studies', name: 'Iron Studies (Complete)', price: 850 },
    { id: 'calcium', name: 'Serum Calcium', price: 150 },
    { id: 'magnesium', name: 'Serum Magnesium', price: 250 },
    { id: 'zinc', name: 'Serum Zinc', price: 350 },
    { id: 'folate', name: 'Folic Acid', price: 550 },
  ],
  'Hormones': [
    { id: 'testosterone', name: 'Testosterone Total', price: 650 },
    { id: 'estrogen', name: 'Estradiol (E2)', price: 550 },
    { id: 'prolactin', name: 'Prolactin', price: 450 },
    { id: 'cortisol', name: 'Cortisol (Morning)', price: 550 },
    { id: 'insulin-f', name: 'Fasting Insulin', price: 650 },
  ],
  'Cardiac Markers': [
    { id: 'hs-crp', name: 'hs-CRP', price: 650 },
    { id: 'homocysteine', name: 'Homocysteine', price: 950 },
    { id: 'nt-probnp', name: 'NT-proBNP', price: 2500 },
    { id: 'troponin', name: 'Troponin I', price: 850 },
    { id: 'lpa', name: 'Lipoprotein(a)', price: 1200 },
  ],
  'Cancer Markers': [
    { id: 'psa', name: 'PSA (Prostate)', price: 750 },
    { id: 'cea', name: 'CEA', price: 850 },
    { id: 'afp', name: 'AFP (Alpha Fetoprotein)', price: 750 },
    { id: 'ca125', name: 'CA-125 (Ovarian)', price: 950 },
    { id: 'ca199', name: 'CA 19-9', price: 1100 },
  ],
};

const PackageBuilder = ({ isOpen, onClose, onAddToCart }) => {
  const navigate = useNavigate();
  const [selectedTests, setSelectedTests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Basic Tests');
  const [showOnlyPopular, setShowOnlyPopular] = useState(false);

  // Calculate totals
  const { subtotal, discount, total, testCount } = useMemo(() => {
    const subtotal = selectedTests.reduce((sum, test) => sum + test.price, 0);
    let discount = 0;
    
    // Volume discounts
    if (selectedTests.length >= 10) {
      discount = subtotal * 0.20; // 20% off for 10+ tests
    } else if (selectedTests.length >= 5) {
      discount = subtotal * 0.10; // 10% off for 5+ tests
    } else if (selectedTests.length >= 3) {
      discount = subtotal * 0.05; // 5% off for 3+ tests
    }
    
    return {
      subtotal,
      discount: Math.round(discount),
      total: subtotal - Math.round(discount),
      testCount: selectedTests.length
    };
  }, [selectedTests]);

  // Filter tests based on search
  const filteredCategories = useMemo(() => {
    const result = {};
    
    Object.entries(TEST_CATALOG).forEach(([category, tests]) => {
      let filtered = tests;
      
      if (searchQuery) {
        filtered = tests.filter(t => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (showOnlyPopular) {
        filtered = filtered.filter(t => t.popular);
      }
      
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    });
    
    return result;
  }, [searchQuery, showOnlyPopular]);

  const toggleTest = (test) => {
    setSelectedTests(prev => {
      const exists = prev.find(t => t.id === test.id);
      if (exists) {
        return prev.filter(t => t.id !== test.id);
      } else {
        return [...prev, test];
      }
    });
  };

  const isSelected = (testId) => selectedTests.some(t => t.id === testId);

  const handleProceed = () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }
    
    // Save to localStorage for the booking flow
    localStorage.setItem('customPackageTests', JSON.stringify(selectedTests));
    localStorage.setItem('customPackageTotal', total.toString());
    
    toast.success(`Package created with ${testCount} tests!`);
    
    if (onAddToCart) {
      onAddToCart(selectedTests, total);
    }
    
    onClose();
  };

  const clearAll = () => {
    setSelectedTests([]);
    toast.info('Selection cleared');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Build Your Package</h2>
                <p className="text-purple-200 text-sm">Select tests & save more</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Discount Banner */}
          <div className="mt-3 flex gap-2 text-xs">
            <span className="bg-white/20 px-2 py-1 rounded-full">3+ tests: 5% off</span>
            <span className="bg-white/20 px-2 py-1 rounded-full">5+ tests: 10% off</span>
            <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-medium">10+ tests: 20% off</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-3 border-b bg-slate-50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <button
              onClick={() => setShowOnlyPopular(!showOnlyPopular)}
              className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 text-sm transition-colors ${
                showOnlyPopular 
                  ? 'bg-purple-100 border-purple-300 text-purple-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Popular
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3">
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3" style={{ scrollbarWidth: 'none' }}>
            {Object.keys(filteredCategories).map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Tests List */}
          <div className="space-y-2">
            {filteredCategories[activeCategory]?.map(test => (
              <button
                key={test.id}
                onClick={() => toggleTest(test)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isSelected(test.id)
                    ? 'bg-purple-50 border-purple-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected(test.id)
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-slate-300'
                  }`}>
                    {isSelected(test.id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isSelected(test.id) ? 'text-purple-800' : 'text-slate-800'}`}>
                      {test.name}
                    </p>
                    {test.popular && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Popular
                      </span>
                    )}
                  </div>
                </div>
                <span className={`font-semibold ${isSelected(test.id) ? 'text-purple-700' : 'text-slate-700'}`}>
                  ₹{test.price}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer - Price Calculator */}
        <div className="border-t bg-white p-4">
          {/* Selected Tests Preview */}
          {selectedTests.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Selected Tests ({testCount})</p>
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              </div>
              <div className="flex gap-1 flex-wrap max-h-16 overflow-y-auto">
                {selectedTests.map(test => (
                  <span
                    key={test.id}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"
                  >
                    {test.name.split('(')[0].trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Price Breakdown */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal ({testCount} tests)</span>
              <span className="text-slate-700">₹{subtotal}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Volume Discount</span>
                <span className="text-green-600">-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span className="text-slate-800">Total</span>
              <span className="text-purple-600">₹{total}</span>
            </div>
          </div>

          {/* Proceed Button */}
          <Button
            onClick={handleProceed}
            disabled={selectedTests.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 py-6 text-base font-semibold rounded-xl"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Book {testCount} Test{testCount !== 1 ? 's' : ''} for ₹{total}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PackageBuilder;
