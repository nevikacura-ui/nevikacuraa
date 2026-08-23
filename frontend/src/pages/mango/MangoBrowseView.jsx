import React from 'react';
import { useMango } from './MangoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Plus, X, Heart, FlaskConical, Upload, CheckCircle2, Shield,
  Clock, ChevronRight, Search, Home, FileText, Loader2, IndianRupee
} from 'lucide-react';
import { OrangePromoCard } from '@/components/ServicePromoCards';
import { MangoStampBadge } from '@/components/pharmacy/TrustStampBadge';
import { PriceMatchBadge, TestTubeLoyalty, SeasonalCampaignBanner } from '@/components/HealthcareUX';
import { WellnessPackages } from '@/components/mango';
import { getTestIcon } from '@/components/mango';
import { ZoomScrollContainer, ZoomSection } from '@/components/ui/ZoomScrollContainer';
import SearchFilterSheet from '@/components/SearchFilterSheet';
import { popularTests } from '@/data/mangoData';

const MangoBrowseView = () => {
  const m = useMango();

  return (
    <>
      <ZoomScrollContainer mode="smooth">
      <div style={{ background: '#050510' }}>

      {/* Search Bar */}
      <ZoomSection>
      <div className="py-6 border-b border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white/95 rounded-2xl p-1 border border-white/10 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-500 w-5 h-5" />
              <Input
                placeholder="Search for tests or checkups"
                value={m.testSearchTerm}
                onChange={(e) => m.setTestSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-4 text-base rounded-xl border-0 bg-white text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-400/30"
                data-testid="hero-search"
              />
            </div>
            {m.testSearchTerm && m.filteredTests.length > 0 && (
              <div className="mt-2 max-h-72 overflow-y-auto border border-emerald-200/40 rounded-xl bg-white shadow-lg">
                <div className="p-3 bg-emerald-50 border-b border-emerald-100 text-sm text-emerald-700 font-medium">
                  Found {m.filteredTests.length} tests matching &quot;{m.testSearchTerm}&quot;
                </div>
                <div className="divide-y divide-stone-100">
                  {m.filteredTests.slice(0, 8).map(test => (
                    <button key={test} onClick={() => { m.setSelectedTests([test]); m.setTestSearchTerm(''); m.setCurrentStep(1); }}
                      className="flex items-center gap-3 p-4 hover:bg-emerald-50 cursor-pointer transition-colors w-full text-left">
                      <span className="text-xl">{getTestIcon(test)}</span>
                      <span className="text-sm text-stone-800 font-medium flex-1">{test}</span>
                      <Plus className="w-5 h-5 text-emerald-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Upload Prescription */}
      <div className="py-4 border-b border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white/95 rounded-2xl p-4 border border-white/10 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200/40">
                <Upload className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-base text-stone-800">Have a Prescription?</p>
                <p className="text-sm text-stone-400">Upload & we'll select tests for you</p>
              </div>
            </div>
            <div className="relative">
              <input id="mango-prescription-upload" type="file" accept="image/*,.pdf" capture="environment"
                onChange={m.handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                data-testid="quick-prescription-input-mango" />
              <Button variant="outline" size="sm"
                className={`relative cursor-pointer rounded-full px-5 ${m.prescriptionUrl ? 'bg-[#4ADE80] text-black border-[#4ADE80] hover:bg-[#22C55E]' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'}`}
                data-testid="quick-prescription-upload-btn-mango">
                {m.uploading ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading...</>) 
                  : m.prescriptionUrl ? (<><CheckCircle2 className="w-4 h-4 mr-1" /> Uploaded</>) 
                  : (<><FileText className="w-4 h-4 mr-1" /> Upload</>)}
              </Button>
            </div>
          </div>
          
          {/* Add Custom Test */}
          <div className="mt-4 bg-white/95 rounded-2xl p-4 border border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-5 h-5 text-emerald-600" />
              <p className="font-semibold text-base text-stone-800">Add Custom Test</p>
            </div>
            <div className="flex gap-3">
              <Input placeholder="Enter test name not in the list" value={m.customTest}
                onChange={(e) => m.setCustomTest(e.target.value)}
                className="flex-1 rounded-xl bg-stone-50 border-stone-200 text-stone-800 placeholder:text-stone-400 focus:border-emerald-400 focus:ring-emerald-400/20 text-sm py-3"
                data-testid="custom-test-input-top" />
              <Button onClick={m.addCustomTest} className="bg-[#C8F56A] text-black hover:bg-[#D4E157] rounded-xl px-4"
                data-testid="add-custom-test-top" disabled={!m.customTest.trim()}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mango Labs Ad */}
      </ZoomSection>
      <ZoomSection>
      <div className="mt-4 px-4" data-testid="mango-ad-banner">
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <img src="https://customer-assets.emergentagent.com/job_5f77c833-80cb-4ed5-a62e-988f56319661/artifacts/miev36qd_file_0000000045f4720ba86477cf8f27eb61.png" alt="Mango Health Labs" className="w-full h-auto" loading="lazy" />
        </div>
      </div>
      </ZoomSection>

      {/* Dark → Warm Cream Transition */}
      <div style={{ background: 'linear-gradient(180deg, #050510, #FFF8F0)', height: '100px' }} data-testid="mango-theme-transition" />

      {/* LIGHT ZONE — Lab Test Browsing */}
      <div className="bg-[#FFF8F0] pb-8" ref={m.mangoLightZoneRef} data-testid="mango-light-zone">

      {/* 10% OFF Promo Banner */}
      <div className="px-4 pt-4 pb-1">
        <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}
          data-testid="mango-discount-banner">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-white font-black text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>10%</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Flat 10% OFF on All Lab Tests</p>
            <p className="text-emerald-100/70 text-[10px] font-medium mt-0.5">Applied automatically at checkout</p>
          </div>
        </div>
      </div>

      <div>
      {/* Trust Badges */}
      <ZoomSection>
      <div className="w-full px-4 mt-4 max-w-5xl mx-auto">
        <div className="flex justify-between items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { icon: Shield, title: 'Certified Lab', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
            { icon: Clock, title: '8 AM - 10 PM', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
            { icon: CheckCircle2, title: '4.9/5 on Google', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
            { icon: Home, title: 'Home Collection', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
          ].map((badge, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/95 rounded-full px-4 py-2 min-w-fit border border-white/10 shadow-sm">
              <div className={`w-7 h-7 rounded-full ${badge.bg} flex items-center justify-center`}>
                <badge.icon className={`w-4 h-4 ${badge.color}`} />
              </div>
              <span className="text-sm font-medium text-stone-700 whitespace-nowrap">{badge.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* For Vital Body Parts - Category Grid */}
      </ZoomSection>
      <ZoomSection>
      <div className="w-full px-4 mt-4 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          <span className="text-stone-900">For Vital </span>
          <span style={{ color: '#10B981' }}>Body Parts</span>
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Pregnancy', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/n0gk20c0_file_00000000354471fa9ee674e7775bb997%20%282%29%20%281%29.png', slug: 'womens-health' },
            { name: 'Diabetes Care', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/9ip5xk67_file_00000000354471fa9ee674e7775bb997%20%281%29%20%281%29.png', slug: 'diabetes-care' },
            { name: 'Vitamins', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/4xuok8b7_file_00000000ff9c71fa8e7c1da50068c770%20%285%29.png', slug: 'vitamins' },
            { name: 'Bone Health', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/0l7046se_file_00000000354471fa9ee674e7775bb997%20%284%29.png', slug: 'bone-health' },
            { name: 'Heart', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/xljymdgn_file_00000000ff9c71fa8e7c1da50068c770%20%281%29.png', slug: 'heart' },
            { name: 'Kidney', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/to0mliyx_file_00000000ff9c71fa8e7c1da50068c770%20%282%29.png', slug: 'kidney' },
            { name: 'Liver', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/7v316nq1_file_00000000ff9c71fa8e7c1da50068c770%20%283%29.png', slug: 'liver' },
            { name: 'Gut Health', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/8j2tffdq_file_00000000ff9c71fa8e7c1da50068c770%20%287%29.png', slug: 'gut-health' },
            { name: 'Hormones', img: 'https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/0uo7f9ht_file_00000000ff9c71fa8e7c1da50068c770%20%286%29.png', slug: 'hormones' },
          ].map((cat) => (
            <button key={cat.name} onClick={() => m.navigate(`/mango/category/${cat.slug}`)}
              className="rounded-2xl overflow-hidden flex flex-col items-center justify-center hover:-translate-y-1 transition-all active:scale-[0.97] aspect-square bg-white"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}
              data-testid={`body-cat-${cat.name.toLowerCase().replace(/\s/g,'-')}`}>
              <img src={cat.img} alt={cat.name} className="w-4/5 h-4/5 object-contain" />
            </button>
          ))}
        </div>
      </div>

      {/* Most Booked Checkups - Masonry Grid */}
      </ZoomSection>
      <ZoomSection>
      <div className="w-full px-4 mt-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="text-stone-900">Most Booked </span>
            <span style={{ color: '#F59E0B' }}>Checkups</span>
          </h2>
          <button onClick={() => m.setCurrentStep(1)}
            className="text-emerald-400 font-semibold text-sm flex items-center gap-1 hover:text-emerald-300">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Women's Health", gradient: 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)', tall: true, slug: 'womens-health' },
            { name: 'Diabetes Care', gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)', tall: false, slug: 'diabetes-care' },
            { name: 'Full Body Checkup', gradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)', tall: false, slug: 'full-body' },
            { name: 'Senior Citizen', gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)', tall: true, slug: 'senior-citizen' },
            { name: 'Fitness Check', gradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)', tall: false, slug: 'fitness-check' },
            { name: 'Allergy Checkup', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', tall: true, slug: 'allergy-checkup' },
            { name: 'Skin, Hair & Nail', gradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)', tall: false, slug: 'skin-hair-nail' },
          ].map((cat) => (
            <button key={cat.name} onClick={() => m.navigate(`/mango/category/${cat.slug}`)}
              className={`rounded-2xl overflow-hidden relative flex flex-col justify-between p-5 hover:scale-[1.02] transition-all active:scale-[0.98] shadow-lg ${cat.tall ? 'row-span-2' : ''}`}
              style={{ background: cat.gradient, minHeight: cat.tall ? '220px' : '100px' }}
              data-testid={`checkup-cat-${cat.name.replace(/\s+/g, '-').toLowerCase()}`}>
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-white text-lg leading-tight pr-8">{cat.name}</h3>
                <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recently Viewed Tests */}
      {m.recentlyViewed.length > 0 && (
        <div className="w-full px-4 mt-3 max-w-5xl mx-auto" data-testid="recently-viewed-tests">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Recently Viewed</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {m.recentlyViewed.map((testName, i) => {
              const price = m.getTestPrice(testName);
              const inCart = m.labCart.some(t => t.name === testName);
              return (
                <button key={i} onClick={() => { if (!inCart) m.addToLabCart({ name: testName, price, department: '' }); }}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs transition-all active:scale-95 flex items-center gap-2"
                  style={{ background: inCart ? 'rgba(16,185,129,0.15)' : '#FFFFFF', border: inCart ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <span className={inCart ? 'text-emerald-500' : 'text-stone-600'}>{testName.length > 20 ? testName.slice(0,20)+'...' : testName}</span>
                  {price > 0 && <span className="text-[10px] text-stone-400">{'\u20B9'}{price}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Wellness Packages */}
      </ZoomSection>
      <ZoomSection>
      <div>
        <WellnessPackages onAddToCart={m.handlePackageSelect} />
      </div>

      {/* Preventive Checkup Banner */}
      <div className="w-full px-4 mt-3 max-w-5xl mx-auto">
        <div className="rounded-2xl overflow-hidden relative cursor-pointer hover:scale-[1.01] transition-all flex items-center"
          style={{ background: 'linear-gradient(135deg, #047857 0%, #059669 60%, #10B981 100%)', boxShadow: '0 4px 20px rgba(4,120,87,0.25)', padding: '14px 16px' }}
          onClick={() => m.setCurrentStep(1)} data-testid="preventive-checkup-banner">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm mr-3">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white leading-tight">Preventive Health Checkup</h3>
            <p className="text-[11px] text-white/70 mt-0.5">70+ tests — Heart, Liver, Kidney & more</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <div className="text-right">
              <span className="text-white/50 text-[10px] line-through block">₹3,500</span>
              <span className="text-white font-bold text-sm">₹1,999</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <ChevronRight className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/5"></div>
        </div>
      </div>

      <MangoStampBadge />
      <PriceMatchBadge variant="mango" />
      <TestTubeLoyalty currentPoints={230} maxPoints={500} rewardLabel="Free CBC Test" />
      <SeasonalCampaignBanner title="Summer Wellness Package" subtitle="Hydration Panel + Vitamin D + Electrolytes — 40% off"
        color="#10B981" icon="fa-sun" onClick={() => m.setCurrentStep(1)} />

      {/* Most Booked Tests */}
      </ZoomSection>
      <ZoomSection>
      <div className="w-full px-4 mt-2 mb-2 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="text-stone-900">Most Booked </span>
            <span style={{ color: '#10B981' }}>Tests</span>
          </h2>
          <button onClick={() => m.setCurrentStep(1)}
            className="text-emerald-400 font-semibold text-sm flex items-center gap-1 hover:text-emerald-300">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularTests.map((test) => {
            const catColor = m.getCategoryStyle(test.name);
            return (
            <div key={test.id} className="rounded-2xl overflow-hidden hover:scale-[1.02] transition-all"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} data-testid={`test-card-${test.id}`}>
              <div className="p-5 relative" style={{ background: catColor.gradient }}>
                <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                  <span className="bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 backdrop-blur-sm">{catColor.label}</span>
                  <button onClick={(e) => { e.stopPropagation(); m.toggleWishlist(test); }}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all backdrop-blur-sm"
                    data-testid={`wishlist-btn-${test.name.replace(/\s+/g, '-').toLowerCase()}`}>
                    <Heart className={`w-4 h-4 ${m.isInWishlist(test.name) ? 'fill-red-400 text-red-400' : 'text-white/80'}`} />
                  </button>
                </div>
                <h3 className="font-bold text-lg mb-3 pr-20 leading-tight text-white drop-shadow-sm">{test.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white drop-shadow-sm">₹{test.price}</span>
                </div>
              </div>
              <div className="p-5 bg-white">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-600" /></div>
                    <div><p className="text-xs text-stone-400">Reports within</p><p className="text-sm font-bold text-stone-700">{test.reportTime}</p></div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><FlaskConical className="w-5 h-5 text-emerald-600" /></div>
                    <div><p className="text-xs text-stone-400">Tests included</p><p className="text-sm font-bold text-stone-700">{test.testsIncluded} test{test.testsIncluded > 1 ? 's' : ''}</p></div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold py-3"
                    onClick={() => m.fetchTestDetails(test.name, test)}>
                    {m.loadingDetails ? 'Loading...' : 'View Details'}
                  </Button>
                  <Button className="flex-1 rounded-xl text-white font-bold py-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)' }}
                    onClick={() => m.handleTestSelect(test)}>
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Unified Test Catalog */}
      <div className="w-full px-4 pb-8" id="all-tests">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-stone-900 mb-1">Browse All Tests</h2>
          <p className="text-sm text-stone-500">Search or browse by department</p>
        </div>
        <div className="space-y-2.5 mb-4" data-testid="mango-search-filters">
          <SearchFilterSheet
            searchValue={m.catalogSearch} onSearchChange={m.setCatalogSearch}
            placeholder="Search tests by name..." accentColor="#10b981" lightMode={true}
            filters={[
              { key: 'priceRange', label: 'Price Range', options: [{ value: 'under500', label: 'Under ₹500' }, { value: '500to1500', label: '₹500 - ₹1500' }, { value: 'above1500', label: 'Above ₹1500' }] },
              { key: 'fasting', label: 'Fasting Required', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
              { key: 'sampleType', label: 'Sample Type', options: [{ value: 'blood', label: 'Blood' }, { value: 'urine', label: 'Urine' }, { value: 'serum', label: 'Serum' }, { value: 'stool', label: 'Stool' }] },
            ]}
            activeFilters={m.catalogFilters} onFilterChange={m.handleCatalogFilterChange}
            sortOptions={[{ value: 'price_low', label: 'Price: Low to High' }, { value: 'price_high', label: 'Price: High to Low' }, { value: 'name_az', label: 'Name: A to Z' }, { value: 'name_za', label: 'Name: Z to A' }]}
            activeSort={m.catalogSort} onSortChange={m.setCatalogSort}
            quickChips={[{ label: 'Under ₹500', key: 'priceRange', value: 'under500' }, { label: 'No Fasting', key: 'fasting', value: 'no' }, { label: 'Blood Test', key: 'sampleType', value: 'blood' }, { label: 'Urine Test', key: 'sampleType', value: 'urine' }]}
            resultCount={m.catalogTestsTotal} onClearAll={m.clearCatalogFilters}
          />
        </div>
        {/* Department categories */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {['All', ...m.apiCatalogDepts].map((dept, di) => {
            const catStyles = [
              { gradient: 'linear-gradient(135deg, #84CC16, #65A30D)' }, { gradient: 'linear-gradient(135deg, #EC4899, #DB2777)' },
              { gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' }, { gradient: 'linear-gradient(135deg, #F97316, #EA580C)' },
              { gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }, { gradient: 'linear-gradient(135deg, #10B981, #059669)' },
              { gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' }, { gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
              { gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' }, { gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)' },
              { gradient: 'linear-gradient(135deg, #D946EF, #C026D3)' }, { gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)' },
              { gradient: 'linear-gradient(135deg, #22C55E, #16A34A)' },
            ];
            const cs = catStyles[di % catStyles.length];
            const isActive = m.catalogDept === dept;
            const count = dept === 'All' ? m.apiTestCatalog.length : m.apiTestCatalog.filter(t => (t.category || t.department) === dept).length;
            return (
              <button key={dept} onClick={() => m.setCatalogDept(dept)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${isActive ? 'shadow-lg scale-[1.03]' : 'hover:scale-[1.01] opacity-70 hover:opacity-100'}`}
                style={isActive ? { background: cs.gradient, color: '#FFF', boxShadow: '0 6px 20px rgba(0,0,0,0.15)' } : { background: '#f5f0eb', color: '#78716c', border: '1px solid #e7e0d9' }}
                data-testid={`dept-pill-${dept}`}>
                <span>{dept}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200/60 text-stone-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        {/* Test cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {m.displayedCatalogTests.map((test, idx) => {
            const isSelected = m.selectedTests.includes(test.name);
            const testPrice = test.price || m.getTestPrice(test.name);
            return (
              <div key={test.name || idx}
                className={`rounded-2xl overflow-hidden transition-all hover:scale-[1.01] cursor-pointer relative ${isSelected ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#FFF8F0]' : ''}`}
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
                onClick={() => m.toggleTest(test.name)}>
                <div className="flex items-center" style={{ background: m.getCategoryStyle(test.name).gradient }}>
                  <div className="flex-1 px-3.5 py-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{test.name}</p>
                      <p className="text-[11px] mt-0.5 truncate text-white/70">{test.category || test.department || 'General'}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {testPrice > 0 ? (
                        <span className="text-sm font-bold px-2.5 py-1 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)' }}>
                          <IndianRupee className="w-3 h-3 inline" />{testPrice}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-200">Call for price</span>
                      )}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'border-2 border-white/50'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white h-1.5 rounded-b-2xl"></div>
              </div>
            );
          })}
        </div>
        {m.catalogTestsTotal > 20 && m.displayedCatalogTests.length < m.catalogTestsTotal && (
          <button onClick={() => m.setCatalogLimit(p => p + 20)} className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold text-emerald-600 transition-all hover:text-emerald-700"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            Load More ({m.catalogTestsTotal - m.displayedCatalogTests.length} remaining)
          </button>
        )}
      </div>

      {/* Cross-promotion Ad */}
      </ZoomSection>
      <div className="px-4 pb-4 space-y-4">
        <OrangePromoCard />
      </div>

      {/* Bottom branding */}
      <div className="flex items-center gap-3 px-4 pb-6">
        <div className="flex-1 h-px bg-stone-200"></div>
        <span className="text-[9px] text-stone-400 font-medium tracking-widest uppercase whitespace-nowrap">A Nevika Cura Company</span>
        <div className="flex-1 h-px bg-stone-200"></div>
      </div>

      </div>
      </div>
      </div>
      </ZoomScrollContainer>
    </>
  );
};

export default MangoBrowseView;
