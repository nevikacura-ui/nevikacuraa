import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ShoppingCart, Plus, Check, ChevronRight, X, Dna, FileText, FlaskConical, Baby, Microscope, Pill, Layers, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ServiceHeader from '@/components/ServiceHeader';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import TestDetailSheet from '@/components/TestDetailSheet';

const DNA_BG = 'https://customer-assets.emergentagent.com/job_0057b5ba-9311-4e6b-8f3c-1683dcbd0649/artifacts/dctifmmv_4k-dna-background-loopable.jpg';
const NEXUGENE_LOGO = 'https://customer-assets.emergentagent.com/job_0057b5ba-9311-4e6b-8f3c-1683dcbd0649/artifacts/1vugxc80_Screenshot_20260317-032304.png';

const HELIX_HALLMARK = 'https://customer-assets.emergentagent.com/job_dcc9b7f7-383a-4e93-9a84-7bc5ab9bd470/artifacts/56ynbjt2_3c7cf841a129ac279330990b305b57dc.png';

const testCategories = [
  {
    id: 'prenatal',
    title: 'Prenatal & Reproductive',
    icon: Baby,
    color: '#c084fc',
    iconBg: 'rgba(192,132,252,0.15)',
    gradient: 'from-violet-800 via-purple-700 to-fuchsia-800',
    tests: [
      { name: 'NIPT (Non-Invasive Prenatal Testing)', price: 9999, desc: 'Screens for chromosomal abnormalities from maternal blood', featured: true },
      { name: 'Genetic Study of Couple + Product of Conception', price: 10515, desc: 'Genetic evaluation for couples with pregnancy losses' },
    ],
  },
  {
    id: 'cancer',
    title: 'Cancer Genomics',
    icon: Microscope,
    color: '#f472b6',
    iconBg: 'rgba(244,114,182,0.15)',
    gradient: 'from-pink-800 via-rose-700 to-red-800',
    tests: [
      { name: 'Genecore Somatic 52 Gene Panel', price: 45015, desc: '52-gene panel for somatic mutation profiling' },
      { name: 'Genecore Somatic 161 Gene Panel', price: 50640, desc: '161-gene panel for tumor mutation analysis' },
      { name: 'IHC - Androgen Receptor', price: 3090, desc: 'Immunohistochemistry for androgen receptor expression' },
    ],
  },
  {
    id: 'pharma',
    title: 'Pharmacogenomics',
    icon: Pill,
    color: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.15)',
    gradient: 'from-blue-800 via-indigo-700 to-violet-800',
    tests: [
      { name: 'Pharmacogenomics Oncology Panel', price: 9999, desc: 'Drug response profiling for oncology' },
      { name: 'Pharmacogenomics Comprehensive Panel', price: 9999, desc: 'Full drug metabolism genetic panel' },
      { name: 'FLT3 Genotyping Test', price: 4142, desc: 'FLT3 mutation for leukemia treatment guidance' },
      { name: 'JAK2 Genotyping Test', price: 9218, desc: 'JAK2 mutation for myeloproliferative disorders' },
      { name: 'K-RAS Genotyping Test', price: 3765, desc: 'KRAS mutation for targeted cancer therapy' },
      { name: 'TPMT Genotyping & Toxicity Test', price: 4142, desc: 'TPMT enzyme activity for drug dosing' },
      { name: '5-FU Genotyping & Toxicity Test', price: 4142, desc: '5-FU metabolism for chemotherapy safety' },
    ],
  },
  {
    id: 'comprehensive',
    title: 'Comprehensive Panels',
    icon: Layers,
    color: '#34d399',
    iconBg: 'rgba(52,211,153,0.15)',
    gradient: 'from-emerald-800 via-teal-700 to-cyan-800',
    tests: [
      { name: 'Genetic Health Assessment Test', price: 11499, desc: 'Broad genetic screening for inherited conditions' },
      { name: 'Pediatric Comprehensive Screening (Genomic)', price: 9999, desc: 'Full genetic screening for pediatric patients' },
      { name: 'KH-Comprehensive Genomic Panel 500', price: 234840, desc: '500-gene panel for deep genomic insights' },
      { name: 'TB - Whole Genome Sequencing', price: 9064, desc: 'Genome sequencing for TB strain analysis' },
      { name: 'Genomic Cardio Screening', price: 9999, desc: 'Genetic screening for cardiovascular risk' },
    ],
  },
  {
    id: 'specialty',
    title: 'Specialty Tests',
    icon: Beaker,
    color: '#fbbf24',
    iconBg: 'rgba(251,191,36,0.15)',
    gradient: 'from-amber-800 via-yellow-700 to-orange-800',
    tests: [
      { name: 'Angiotensin Converting Enzyme', price: 668, desc: 'ACE level for sarcoidosis & hypertension' },
    ],
  },
];

const allTests = testCategories.flatMap(c => c.tests);

const Nexugene = () => {
  const navigate = useNavigate();
  const { addToLabCart, labCart, removeFromLabCart } = useCart();
  const [search, setSearch] = useState('');
  const [detailTest, setDetailTest] = useState(null);
  const [selectedTestDetail, setSelectedTestDetail] = useState(null);

  const cartNames = labCart.map(i => i.name);
  const nexugeneInCart = labCart.filter(i => allTests.some(t => t.name === i.name));
  const cartCount = nexugeneInCart.length;
  const cartTotal = nexugeneInCart.reduce((s, i) => s + (i.price || 0), 0);

  const toggle = (test) => {
    if (cartNames.includes(test.name)) {
      removeFromLabCart(test.name);
      toast.info(`Removed ${test.name}`);
    } else {
      addToLabCart({ name: test.name, price: test.price, parameters: [], source: 'nexugene' });
      toast.success(`Added ${test.name}`);
    }
  };

  const searchResults = search
    ? allTests.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#06061a' }} data-testid="nexugene-page">
      <style>{`
        @keyframes helixFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-12px) scale(1.02); } }
        .helix-bg { animation: helixFloat 12s ease-in-out infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; }
      `}</style>

      {/* DNA Helix Background — fixed full page */}
      <div className="fixed inset-0 z-0">
        <img src={DNA_BG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'rgba(2,4,18,0.55)' }} />
      </div>

      <div className="relative z-10">
        <ServiceHeader />

        <div className="px-4 pt-4 pb-32">
          <button onClick={() => navigate('/labs')} className="flex items-center gap-1.5 text-white/40 text-xs mb-4 hover:text-white/60 transition-colors" data-testid="nexugene-back-btn">
            <ArrowLeft className="w-3.5 h-3.5" /> Nevika Labs
          </button>

          {/* Hero */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-purple-900/30" style={{ background: '#0c0a2a' }}>
              <img src={NEXUGENE_LOGO} alt="Nexugene" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-white font-black text-2xl tracking-tight" data-testid="nexugene-title">Nexugene</h1>
              <p className="text-violet-300/40 text-xs mt-0.5">Advanced Genetic Testing & Genomic Solutions</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              placeholder="Search genetic tests..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none backdrop-blur-2xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}
              data-testid="nexugene-search"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchResults ? (
            <div className="space-y-3">
              <p className="text-white/30 text-xs">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
              {searchResults.map((test) => {
                const inCart = cartNames.includes(test.name);
                return (
                  <div key={test.name} className="rounded-xl p-4 flex items-center gap-3 backdrop-blur-lg" style={{ background: inCart ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.025)', border: `1px solid ${inCart ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] font-semibold leading-snug">{test.name}</p>
                      <span className="text-violet-300/60 text-xs font-bold">{'\u20B9'}{test.price.toLocaleString('en-IN')}</span>
                    </div>
                    <button onClick={() => toggle(test)} className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${inCart ? 'bg-violet-500 text-white' : 'text-white/35'}`} style={!inCart ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' } : {}}>
                      {inCart ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
              {searchResults.length === 0 && (
                <div className="text-center py-16">
                  <Dna className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/20 text-sm">No tests found</p>
                </div>
              )}
            </div>
          ) : (
            /* Category Sections — Mango-style horizontal cards */
            <div className="space-y-8">
              {testCategories.map((category) => (
                <div key={category.id} className="space-y-3" data-testid={`nexugene-cat-${category.id}`}>
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-2xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                        <category.icon className="w-5 h-5" style={{ color: category.color }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{category.title}</h3>
                        <p className="text-xs text-white/30">{category.tests.length} test{category.tests.length > 1 ? 's' : ''} available</p>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Cards — Frosted Glass */}
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {category.tests.map((test) => {
                      const inCart = cartNames.includes(test.name);
                      return (
                        <div
                          key={test.name}
                          className="min-w-[300px] max-w-[300px] rounded-2xl overflow-hidden flex-shrink-0 backdrop-blur-2xl transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1.5px solid ${inCart ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.3)${inCart ? ', 0 0 20px rgba(139,92,246,0.1)' : ''}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                          }}
                        >
                          {/* Gradient Header */}
                          <div className={`bg-gradient-to-br ${category.gradient} p-4 text-white relative overflow-hidden`}>
                            {/* DNA Helix — transparent watermark (horizontal) */}
                            <img 
                              src={HELIX_HALLMARK} alt="" aria-hidden="true"
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-[60%] h-auto pointer-events-none select-none"
                              style={{ opacity: 0.1, mixBlendMode: 'screen', filter: 'brightness(1.5)', transform: 'translateY(-50%) rotate(90deg)' }}
                              loading="lazy" decoding="async"
                            />
                            <div className="absolute top-3 right-3 z-10">
                              <span className="bg-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">
                                Test
                              </span>
                            </div>
                            <h4 className="font-bold text-base mb-2 pr-14 leading-tight">{test.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 line-through text-sm">{'\u20B9'}{Math.round(test.price * 1.3).toLocaleString('en-IN')}</span>
                              <span className="text-2xl font-bold">{'\u20B9'}{test.price.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Info Section — Glass */}
                          <div className="p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <FileText className="w-4 h-4 text-white/35" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-white/30">Reports within</p>
                                  <p className="text-xs font-bold text-white/70">7-14 days</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <FlaskConical className="w-4 h-4 text-white/35" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-white/30">Sample type</p>
                                  <p className="text-xs font-bold text-white/70">Blood</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 rounded-xl font-semibold text-xs py-2.5 bg-transparent hover:bg-white/5"
                                style={{ borderColor: `${category.color}60`, color: category.color }}
                                onClick={() => setSelectedTestDetail({ name: test.name, price: test.price, category: category.title })}
                              >
                                {detailTest === test.name ? 'Hide Details' : 'View Details'}
                              </Button>
                              <Button
                                size="sm"
                                className={`flex-1 rounded-xl font-semibold text-xs py-2.5 shadow-md ${inCart ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
                                style={!inCart ? { background: 'rgba(139,92,246,0.3)', color: '#e9d5ff' } : {}}
                                onClick={() => toggle(test)}
                              >
                                {inCart ? (
                                  <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Added</span>
                                ) : 'Add to Cart'}
                              </Button>
                            </div>

                            {detailTest === test.name && (
                              <p className="text-white/25 text-[11px] leading-relaxed mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>{test.desc}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
            <button
              onClick={() => navigate('/checkout?type=lab')}
              className="w-full py-3.5 rounded-2xl flex items-center justify-between px-5 text-white font-bold text-sm shadow-2xl backdrop-blur-xl"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.85))', boxShadow: '0 8px 32px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
              data-testid="nexugene-checkout-btn"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span>{cartCount} test{cartCount > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{'\u20B9'}{cartTotal.toLocaleString('en-IN')}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {selectedTestDetail && (
        <TestDetailSheet
          test={{
            ...selectedTestDetail,
            onAdd: () => toggle(selectedTestDetail),
          }}
          onClose={() => setSelectedTestDetail(null)}
          source="nexugene"
        />
      )}
    </div>
  );
};

export default Nexugene;
