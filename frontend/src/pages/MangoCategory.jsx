import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Plus, Check, Search, FlaskConical } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SPRITE_URL = 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/4tevcdal_file_000000002e147208b8f10adae5d9b66b.png';

const CATEGORY_CONFIG = {
  'full-body': { 
    name: 'Full Body Checkup', 
    gradient: 'linear-gradient(135deg, #0D9488 0%, #0F766E 50%, #134E4A 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/0i8ksfy7_file_000000002e147208b8f10adae5d9b66b%20%281%29.png',
    keywords: ['full body', 'complete', 'comprehensive', 'annual', 'master', 'executive', 'preventive', 'wellness', 'aarogyam'] 
  },
  'womens-health': { 
    name: "Women's Health", 
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/n0gk20c0_file_00000000354471fa9ee674e7775bb997%20%282%29%20%281%29.png',
    keywords: ['women', 'pregnancy', 'beta hcg', 'prolactin', 'estrogen', 'progesterone', 'amh', 'pap', 'rubella', 'torch', 'pcod', 'pcos', 'mammography', 'fertility'] 
  },
  'senior-citizen': { 
    name: 'Senior Citizen', 
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/0p45b7f5_file_000000002e147208b8f10adae5d9b66b%20%282%29.png',
    keywords: ['senior', 'elderly', 'geriatric', 'bone density', 'arthritis', 'osteoporosis'] 
  },
  'diabetes-care': { 
    name: 'Diabetes Care', 
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/9ip5xk67_file_00000000354471fa9ee674e7775bb997%20%281%29%20%281%29.png',
    keywords: ['diabetes', 'hba1c', 'glucose', 'sugar', 'fasting blood sugar', 'fbs', 'ppbs', 'insulin', 'ogtt', 'glycated'] 
  },
  'fitness-check': { 
    name: 'Fitness Check', 
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/9ftai7m6_file_00000000aeb07208a65c509dddc79912%20%282%29.png',
    keywords: ['fitness', 'sports', 'muscle', 'stamina', 'metabolic', 'bmi', 'body composition'] 
  },
  'allergy-checkup': { 
    name: 'Allergy Checkup', 
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/46gtd0g0_file_00000000aeb07208a65c509dddc79912%20%281%29.png',
    keywords: ['allergy', 'ige', 'allergen', 'food allergy', 'skin prick', 'immunoglobulin'] 
  },
  'skin-hair-nail': { 
    name: 'Skin, Hair & Nail', 
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/lx91pgt2_file_000000002e147208b8f10adae5d9b66b%20%283%29.png',
    keywords: ['skin', 'hair', 'nail', 'dermatology', 'fungal', 'vitiligo', 'acne', 'biotin'] 
  },
  'heart': {
    name: 'Heart',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/xljymdgn_file_00000000ff9c71fa8e7c1da50068c770%20%281%29.png',
    keywords: ['heart', 'cardiac', 'cholesterol', 'lipid', 'ecg', 'troponin', 'bnp', 'crp', 'ldl', 'hdl', 'triglyceride']
  },
  'kidney': {
    name: 'Kidney',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/to0mliyx_file_00000000ff9c71fa8e7c1da50068c770%20%282%29.png',
    keywords: ['kidney', 'renal', 'creatinine', 'urea', 'bun', 'gfr', 'uric acid', 'electrolyte', 'potassium', 'sodium']
  },
  'liver': {
    name: 'Liver',
    gradient: 'linear-gradient(135deg, #D97706 0%, #B45309 50%, #92400E 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/7v316nq1_file_00000000ff9c71fa8e7c1da50068c770%20%283%29.png',
    keywords: ['liver', 'hepatic', 'sgot', 'sgpt', 'bilirubin', 'albumin', 'alkaline phosphatase', 'alt', 'ast', 'lft']
  },
  'gut-health': {
    name: 'Gut Health',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/8j2tffdq_file_00000000ff9c71fa8e7c1da50068c770%20%287%29.png',
    keywords: ['gut', 'stomach', 'gastric', 'stool', 'h pylori', 'amylase', 'lipase', 'celiac', 'occult blood']
  },
  'hormones': {
    name: 'Hormones',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/0uo7f9ht_file_00000000ff9c71fa8e7c1da50068c770%20%286%29.png',
    keywords: ['hormone', 'thyroid', 'tsh', 't3', 't4', 'cortisol', 'testosterone', 'estrogen', 'prolactin', 'fsh', 'lh', 'dhea']
  },
  'vitamins': {
    name: 'Vitamins',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/4xuok8b7_file_00000000ff9c71fa8e7c1da50068c770%20%285%29.png',
    keywords: ['vitamin', 'b12', 'd3', 'folic acid', 'iron', 'ferritin', 'zinc', 'calcium', 'magnesium', 'folate']
  },
  'bone-health': {
    name: 'Bone Health',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 50%, #0F766E 100%)',
    image: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/0l7046se_file_00000000354471fa9ee674e7775bb997%20%284%29.png',
    keywords: ['bone', 'calcium', 'phosphorus', 'vitamin d', 'dexa', 'osteoporosis', 'alkaline phosphatase']
  },
};

const MangoCategory = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [allTests, setAllTests] = useState([]);
  const [labCart, setLabCart] = useState(() => { try { return JSON.parse(localStorage.getItem('mango_lab_cart') || '[]'); } catch { return []; } });
  const [search, setSearch] = useState('');

  const config = CATEGORY_CONFIG[slug] || { name: slug?.replace(/-/g, ' ') || 'Category', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', keywords: [slug?.replace(/-/g, ' ') || ''], image: null };

  useEffect(() => {
    axios.get(`${API}/api/mango/test-catalog`).then(r => setAllTests(r.data.tests || r.data || [])).catch(() => {});
  }, []);

  const filteredTests = useMemo(() => {
    const kws = config.keywords;
    return allTests.filter(t => {
      const n = (t.name || '').toLowerCase();
      const dept = (t.department || '').toLowerCase();
      const match = kws.some(kw => n.includes(kw) || dept.includes(kw));
      if (!match) return false;
      if (search) return n.includes(search.toLowerCase());
      return true;
    });
  }, [allTests, config.keywords, search]);

  const addToCart = (test) => {
    const updated = [...labCart, { name: test.name, price: test.price || 0, department: test.department || '' }];
    setLabCart(updated);
    localStorage.setItem('mango_lab_cart', JSON.stringify(updated));
  };

  const isInCart = (name) => labCart.some(t => t.name === name);

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-32" data-testid="mango-category-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: config.gradient, minHeight: '280px' }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute top-1/3 right-12 w-36 h-36 rounded-full opacity-5" style={{ background: 'white' }} />

        {/* Back + Cart buttons */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-12 pb-0">
          <button
            onClick={() => navigate('/mango')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-md text-white font-medium text-sm hover:bg-white/25 transition-all"
            data-testid="cat-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => navigate('/mango/checkout')}
            className="relative w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition-all"
            data-testid="cat-cart-btn"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
            {labCart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[10px] font-bold flex items-center justify-center" style={{ color: '#10B981' }}>
                {labCart.length}
              </span>
            )}
          </button>
        </div>

        {/* Category image + info */}
        <div className="relative z-10 flex flex-col items-center justify-center pt-4 pb-12 px-6 text-center">
          {config.spritePos ? (
            <div
              className="w-28 h-28 rounded-2xl overflow-hidden mb-4 border-2 border-white/30 shadow-xl"
              style={{
                backgroundImage: `url(${SPRITE_URL})`,
                backgroundSize: '200% 400%',
                backgroundPosition: config.spritePos,
                backgroundRepeat: 'no-repeat',
              }}
              data-testid="cat-hero-icon"
            />
          ) : config.image ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 border-2 border-white/30 shadow-xl bg-white/20 p-2">
              <img
                src={config.image}
                alt={config.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl mb-4 border-2 border-white/30 bg-white/10 flex items-center justify-center">
              <FlaskConical className="w-10 h-10 text-white/70" />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="cat-title">
            {config.name}
          </h1>
          <p className="text-white/70 text-sm font-medium">
            {allTests.length === 0 ? 'Loading...' : `${filteredTests.length} tests available`}
          </p>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-[40px]">
            <path d="M0,60 L0,20 Q360,0 720,20 T1440,20 L1440,60 Z" fill="#FFF8F0" />
          </svg>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search in ${config.name}...`}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-stone-800 text-sm placeholder:text-stone-400 outline-none border border-stone-200 focus:border-emerald-400 shadow-sm transition-colors"
            data-testid="cat-search-input"
          />
        </div>
      </div>

      {/* Test List */}
      <div className="px-4 pb-4 space-y-2.5">
        {filteredTests.length === 0 && allTests.length > 0 && (
          <div className="text-center py-16">
            <FlaskConical className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm font-medium">No tests found in this category</p>
            <button onClick={() => navigate('/mango')} className="mt-3 text-emerald-500 font-semibold text-sm hover:underline">
              Browse all tests
            </button>
          </div>
        )}
        {filteredTests.length === 0 && allTests.length === 0 && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-stone-400 text-sm">Loading tests...</p>
          </div>
        )}
        {filteredTests.map((test, i) => {
          const inCart = isInCart(test.name);
          return (
            <div 
              key={i} 
              className="rounded-xl p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md" 
              style={{ 
                background: '#FFF8F0', 
                border: '1px solid rgba(0,0,0,0.06)', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
              }} 
              data-testid={`cat-test-${i}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-stone-800 text-sm font-semibold truncate">{test.name}</p>
                {test.department && <p className="text-stone-400 text-xs mt-0.5">{test.department}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {test.price > 0 && <span className="text-emerald-600 text-sm font-bold">₹{test.price}</span>}
                <button
                  onClick={() => !inCart && addToCart(test)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:translate-y-[2px] active:shadow-none"
                  style={inCart ? {
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 4px 0 #047857, 0 6px 16px rgba(16,185,129,0.3)',
                  } : {
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 4px 0 #047857, 0 6px 16px rgba(16,185,129,0.3)',
                    opacity: 1,
                  }}
                  data-testid={`cat-add-${i}`}
                >
                  {inCart ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <Plus className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky cart bar */}
      {labCart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40" style={{ background: 'linear-gradient(to top, #FFF8F0 60%, transparent)' }}>
          <button
            onClick={() => navigate('/mango/checkout')}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:translate-y-[2px] active:shadow-none"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 4px 0 #047857, 0 8px 24px rgba(16,185,129,0.35)',
            }}
            data-testid="cat-checkout-btn"
          >
            <ShoppingCart className="w-4 h-4" />
            {labCart.length} {labCart.length === 1 ? 'test' : 'tests'} in cart — Proceed
          </button>
        </div>
      )}
    </div>
  );
};

export default MangoCategory;
