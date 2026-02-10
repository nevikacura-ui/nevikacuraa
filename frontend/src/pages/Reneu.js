import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, Sparkles, ChevronRight, CheckCircle2, Camera, Plus,
  Leaf, Pill, FlaskConical, Stethoscope, Calendar, Clock, TrendingUp,
  User, Heart, Droplets, Sun, Moon, AlertCircle, FileText, X
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Reneu Sub-sections
const RENEU_SECTIONS = [
  { id: 'core', name: 'Reneu Core', subtitle: 'Vitamins & Nutrition', icon: '💊', color: 'from-emerald-500 to-teal-500', bgLight: 'bg-emerald-50' },
  { id: 'skin', name: 'Reneu Skin', subtitle: 'Skin Wellness', icon: '✨', color: 'from-pink-500 to-rose-500', bgLight: 'bg-pink-50' },
  { id: 'hair', name: 'Reneu Hair', subtitle: 'Hair Health', icon: '💇', color: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-50' },
  { id: 'women', name: 'Reneu Women', subtitle: "Women's Wellness", icon: '🌸', color: 'from-purple-500 to-violet-500', bgLight: 'bg-purple-50' },
  { id: 'men', name: 'Reneu Men', subtitle: "Men's Wellness", icon: '💪', color: 'from-blue-500 to-indigo-500', bgLight: 'bg-blue-50' }
];

// Concern options by section
const CONCERNS = {
  skin: [
    { id: 'acne', name: 'Acne & Pimples', icon: '🔴', tests: ['Vitamin D', 'Zinc', 'Hormonal Panel'] },
    { id: 'dryness', name: 'Dry Skin', icon: '🏜️', tests: ['Vitamin E', 'Omega-3', 'Thyroid'] },
    { id: 'pigmentation', name: 'Pigmentation', icon: '🌗', tests: ['Vitamin C', 'B12', 'Iron'] },
    { id: 'aging', name: 'Premature Aging', icon: '⏳', tests: ['Collagen Markers', 'Antioxidants', 'Hormones'] },
    { id: 'dullness', name: 'Dull Skin', icon: '😶', tests: ['Vitamin B Complex', 'Hemoglobin', 'Liver Function'] },
    { id: 'oily', name: 'Oily Skin', icon: '💧', tests: ['Androgens', 'Insulin', 'Zinc'] }
  ],
  hair: [
    { id: 'hairfall', name: 'Hair Fall', icon: '📉', tests: ['Iron', 'Ferritin', 'Vitamin D', 'Thyroid', 'Biotin'] },
    { id: 'dandruff', name: 'Dandruff', icon: '❄️', tests: ['Zinc', 'Vitamin B6', 'Selenium'] },
    { id: 'greying', name: 'Premature Greying', icon: '🔘', tests: ['B12', 'Copper', 'Catalase'] },
    { id: 'thinning', name: 'Hair Thinning', icon: '〰️', tests: ['DHT', 'Testosterone', 'Protein'] },
    { id: 'drybrittle', name: 'Dry & Brittle', icon: '🥀', tests: ['Biotin', 'Omega-3', 'Vitamin E'] },
    { id: 'slowgrowth', name: 'Slow Growth', icon: '🐢', tests: ['Protein', 'Iron', 'Zinc', 'Biotin'] }
  ],
  core: [
    { id: 'fatigue', name: 'Fatigue & Low Energy', icon: '😴', tests: ['Vitamin D', 'B12', 'Iron', 'Thyroid'] },
    { id: 'immunity', name: 'Weak Immunity', icon: '🛡️', tests: ['Vitamin C', 'Zinc', 'Vitamin D'] },
    { id: 'bones', name: 'Bone & Joint Pain', icon: '🦴', tests: ['Calcium', 'Vitamin D', 'Phosphorus'] },
    { id: 'mood', name: 'Mood Swings', icon: '🎭', tests: ['B Complex', 'Vitamin D', 'Magnesium'] },
    { id: 'sleep', name: 'Sleep Issues', icon: '🌙', tests: ['Magnesium', 'Melatonin', 'Cortisol'] },
    { id: 'digestion', name: 'Digestive Issues', icon: '🫄', tests: ['B12', 'Folate', 'Gut Health Panel'] }
  ],
  women: [
    { id: 'pcos', name: 'PCOS Symptoms', icon: '🔄', tests: ['Hormonal Panel', 'Insulin', 'AMH'] },
    { id: 'period', name: 'Irregular Periods', icon: '📅', tests: ['FSH', 'LH', 'Estrogen', 'Progesterone'] },
    { id: 'fertility', name: 'Fertility Concerns', icon: '🤰', tests: ['AMH', 'FSH', 'Prolactin', 'Thyroid'] },
    { id: 'menopause', name: 'Menopause', icon: '🌺', tests: ['Estrogen', 'FSH', 'Bone Density'] },
    { id: 'anemia', name: 'Anemia & Weakness', icon: '💉', tests: ['CBC', 'Iron', 'Ferritin', 'B12'] },
    { id: 'skinaging', name: 'Skin & Hair Changes', icon: '🪞', tests: ['Collagen', 'Biotin', 'Hormones'] }
  ],
  men: [
    { id: 'energy', name: 'Low Energy', icon: '🔋', tests: ['Testosterone', 'Thyroid', 'Vitamin D'] },
    { id: 'muscle', name: 'Muscle Weakness', icon: '💪', tests: ['Testosterone', 'Protein', 'Creatinine'] },
    { id: 'libido', name: 'Low Libido', icon: '❤️‍🔥', tests: ['Testosterone', 'Prolactin', 'Thyroid'] },
    { id: 'stress', name: 'Stress & Anxiety', icon: '😰', tests: ['Cortisol', 'Magnesium', 'B Complex'] },
    { id: 'hairloss', name: 'Male Pattern Hair Loss', icon: '👨‍🦲', tests: ['DHT', 'Testosterone', 'Thyroid'] },
    { id: 'prostate', name: 'Prostate Health', icon: '🔬', tests: ['PSA', 'Testosterone', 'Zinc'] }
  ]
};

// Recommended lab tests with prices
const LAB_TESTS = {
  'Vitamin D': { price: 599, turnaround: '24 hours' },
  'B12': { price: 499, turnaround: '24 hours' },
  'Iron': { price: 399, turnaround: '24 hours' },
  'Ferritin': { price: 499, turnaround: '24 hours' },
  'Thyroid': { price: 699, turnaround: '24 hours' },
  'Biotin': { price: 899, turnaround: '48 hours' },
  'Zinc': { price: 599, turnaround: '24 hours' },
  'CBC': { price: 349, turnaround: '6 hours' },
  'Hormonal Panel': { price: 1999, turnaround: '48 hours' },
  'Vitamin D + B12 + Iron': { price: 999, turnaround: '24 hours', combo: true },
  'Skin & Hair Panel': { price: 1499, turnaround: '48 hours', combo: true },
  'Complete Wellness Panel': { price: 2499, turnaround: '48 hours', combo: true }
};

// Supplement recommendations
const SUPPLEMENTS = {
  'Vitamin D': { name: 'Vitamin D3 60K', brand: 'HealthKart', price: 399, dosage: '1 tablet/week' },
  'B12': { name: 'Methylcobalamin 1500mcg', brand: 'Nutrela', price: 299, dosage: '1 tablet/day' },
  'Biotin': { name: 'Biotin 10000mcg', brand: 'Carbamide Forte', price: 449, dosage: '1 tablet/day' },
  'Iron': { name: 'Ferrous Ascorbate', brand: 'Orofer', price: 189, dosage: '1 tablet/day' },
  'Zinc': { name: 'Zinc Picolinate 50mg', brand: 'NOW Foods', price: 599, dosage: '1 capsule/day' },
  'Collagen': { name: 'Marine Collagen', brand: 'OZiva', price: 1299, dosage: '1 scoop/day' },
  'Omega-3': { name: 'Fish Oil 1000mg', brand: 'HealthKart', price: 599, dosage: '1 softgel/day' }
};

const Reneu = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('core');
  const [selectedConcerns, setSelectedConcerns] = useState([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState(1);
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [treatmentLog, setTreatmentLog] = useState([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  
  // Assessment form data
  const [assessmentData, setAssessmentData] = useState({
    age: '',
    gender: '',
    duration: '',
    severity: '',
    lifestyle: [],
    currentSupplements: '',
    medicalHistory: ''
  });

  const currentSectionData = RENEU_SECTIONS.find(s => s.id === activeSection);
  const currentConcerns = CONCERNS[activeSection] || [];

  // Get recommended tests based on selected concerns
  const getRecommendedTests = () => {
    const allTests = new Set();
    selectedConcerns.forEach(concernId => {
      const concern = currentConcerns.find(c => c.id === concernId);
      if (concern) {
        concern.tests.forEach(test => allTests.add(test));
      }
    });
    return Array.from(allTests);
  };

  const toggleConcern = (concernId) => {
    setSelectedConcerns(prev => 
      prev.includes(concernId) 
        ? prev.filter(c => c !== concernId)
        : [...prev, concernId]
    );
  };

  const startAssessment = () => {
    if (selectedConcerns.length === 0) {
      toast.error('Please select at least one concern');
      return;
    }
    setShowAssessment(true);
    setAssessmentStep(1);
  };

  const completeAssessment = () => {
    setShowAssessment(false);
    setShowResults(true);
    toast.success('Assessment complete! Here are your personalized recommendations.');
  };

  const bookLabTest = (testName) => {
    toast.success(`Redirecting to Mango Labs for ${testName}...`);
    navigate('/mango');
  };

  const orderSupplement = (supplement) => {
    toast.success(`Adding ${supplement} to cart...`);
    navigate('/pharmacy');
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="reneu-page">
        {/* Premium Header */}
        <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/')}
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white"
                  data-testid="reneu-back-btn"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white p-1">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/uy8wpc27_file_00000000caf871fdae54ae4c4854bbd4.png" 
                      alt="Reneu" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
                      RENEU
                    </h1>
                    <p className="text-sm text-slate-400">Inside Out Wellness</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate('/mango')}
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                Book Test
              </Button>
            </div>
          </div>
        </header>

        {/* Sub-section Tabs */}
        <div className="bg-white border-b border-slate-100 sticky top-[72px] z-40">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
              {RENEU_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSelectedConcerns([]);
                    setShowResults(false);
                  }}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    activeSection === section.id 
                      ? `bg-gradient-to-r ${section.color} text-white shadow-lg` 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  data-testid={`tab-${section.id}`}
                >
                  <span className="text-base">{section.icon}</span>
                  <span className="hidden sm:inline">{section.name}</span>
                  <span className="sm:hidden">{section.name.replace('Reneu ', '')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Section Hero */}
          <Card className={`overflow-hidden mb-6 border-0 shadow-xl ${currentSectionData?.bgLight}`}>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">{currentSectionData?.icon}</span>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
                    {currentSectionData?.name}
                  </h2>
                  <p className="text-slate-600">{currentSectionData?.subtitle}</p>
                </div>
              </div>
              <p className="text-slate-600 mb-4">
                {activeSection === 'core' && 'Identify vitamin deficiencies causing fatigue, weakness, and health issues. Get personalized supplement recommendations.'}
                {activeSection === 'skin' && 'Understand the root cause of your skin concerns. From acne to aging, find solutions that work from within.'}
                {activeSection === 'hair' && 'Stop hair fall at its root. Identify deficiencies and hormonal imbalances affecting your hair health.'}
                {activeSection === 'women' && "Hormonal health, fertility, PCOS, menopause - comprehensive wellness solutions for every stage of a woman's life."}
                {activeSection === 'men' && "Energy, vitality, and performance. Address the underlying causes of fatigue, stress, and hormonal imbalances."}
              </p>
            </div>
          </Card>

          {/* Concern Selection */}
          {!showResults && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                What concerns you?
                <Badge variant="outline" className="ml-2">{selectedConcerns.length} selected</Badge>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentConcerns.map((concern) => (
                  <button
                    key={concern.id}
                    onClick={() => toggleConcern(concern.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedConcerns.includes(concern.id)
                        ? `border-2 ${currentSectionData?.bgLight} border-slate-400 shadow-md`
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    data-testid={`concern-${concern.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{concern.icon}</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{concern.name}</p>
                        <p className="text-xs text-slate-500">{concern.tests.length} tests</p>
                      </div>
                      {selectedConcerns.includes(concern.id) && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {selectedConcerns.length > 0 && (
                <Button 
                  onClick={startAssessment}
                  className={`w-full mt-6 h-14 rounded-2xl font-bold text-lg bg-gradient-to-r ${currentSectionData?.color}`}
                  data-testid="start-assessment-btn"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Root Cause Analysis
                </Button>
              )}
            </div>
          )}

          {/* Results Section */}
          {showResults && (
            <div className="space-y-6">
              {/* Recommended Lab Tests */}
              <Card className="p-6 border-0 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-teal-500" />
                  Recommended Lab Tests
                </h3>
                <p className="text-sm text-slate-600 mb-4">Based on your concerns, we recommend these tests to identify root causes:</p>
                
                {/* Combo Panel */}
                <Card className="p-4 mb-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className="bg-teal-500 text-white mb-2">Best Value</Badge>
                      <h4 className="font-bold text-slate-800">
                        {activeSection === 'skin' || activeSection === 'hair' ? 'Skin & Hair Panel' : 'Complete Wellness Panel'}
                      </h4>
                      <p className="text-sm text-slate-600">Includes: {getRecommendedTests().slice(0, 4).join(', ')} & more</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-600">
                        ₹{activeSection === 'skin' || activeSection === 'hair' ? '1,499' : '2,499'}
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2 bg-teal-600 hover:bg-teal-700 rounded-full"
                        onClick={() => bookLabTest('Complete Panel')}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </Card>
                
                {/* Individual Tests */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getRecommendedTests().slice(0, 6).map((test, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-800">{test}</p>
                        <p className="text-xs text-slate-500">Results in 24-48 hrs</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full"
                        onClick={() => bookLabTest(test)}
                      >
                        ₹{LAB_TESTS[test]?.price || 599}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Supplement Recommendations */}
              <Card className="p-6 border-0 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-orange-500" />
                  Recommended Supplements
                </h3>
                <p className="text-sm text-slate-600 mb-4">While you wait for test results, these supplements may help:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getRecommendedTests().slice(0, 4).map((test, idx) => {
                    const supplement = SUPPLEMENTS[test];
                    if (!supplement) return null;
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <div>
                          <p className="font-bold text-slate-800">{supplement.name}</p>
                          <p className="text-xs text-slate-600">{supplement.brand} • {supplement.dosage}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">₹{supplement.price}</p>
                          <Button 
                            size="sm" 
                            className="mt-1 bg-orange-500 hover:bg-orange-600 rounded-full text-xs"
                            onClick={() => orderSupplement(supplement.name)}
                          >
                            Order
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Diet Tips */}
              <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-500" />
                  Diet Tips
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">✅ Include in Diet</h4>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {activeSection === 'hair' && (
                        <>
                          <li>• Eggs, nuts, seeds (Biotin)</li>
                          <li>• Spinach, lentils (Iron)</li>
                          <li>• Fish, walnuts (Omega-3)</li>
                          <li>• Dairy, sunlight (Vitamin D)</li>
                        </>
                      )}
                      {activeSection === 'skin' && (
                        <>
                          <li>• Citrus fruits (Vitamin C)</li>
                          <li>• Carrots, tomatoes (Antioxidants)</li>
                          <li>• Nuts, avocados (Vitamin E)</li>
                          <li>• Fish, flaxseeds (Omega-3)</li>
                        </>
                      )}
                      {(activeSection === 'core' || activeSection === 'women' || activeSection === 'men') && (
                        <>
                          <li>• Leafy greens (Iron, Folate)</li>
                          <li>• Eggs, dairy (B12, D)</li>
                          <li>• Nuts, seeds (Zinc, Magnesium)</li>
                          <li>• Fish, sunlight (Vitamin D)</li>
                        </>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-600 mb-2">❌ Avoid</h4>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Excessive sugar & processed foods</li>
                      <li>• Alcohol & smoking</li>
                      <li>• Too much caffeine</li>
                      <li>• Late night eating</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Book Consultation */}
              <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      Consult a Specialist
                    </h3>
                    <p className="text-sm text-blue-100">Get expert advice from our dermatologists & nutritionists</p>
                  </div>
                  <Button 
                    className="bg-white text-blue-600 hover:bg-blue-50 rounded-full"
                    onClick={() => navigate('/diagyn')}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Now
                  </Button>
                </div>
              </Card>

              {/* Progress Tracker */}
              <Card className="p-6 border-0 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Track Your Progress
                </h3>
                <p className="text-sm text-slate-600 mb-4">Upload photos to track improvements over time</p>
                
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {progressPhotos.map((photo, idx) => (
                    <div key={idx} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200">
                      <img src={photo.url} alt={`Progress ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowPhotoUpload(true)}
                    className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs">Add Photo</span>
                  </button>
                </div>
              </Card>

              {/* Start Over */}
              <Button 
                variant="outline" 
                className="w-full rounded-xl"
                onClick={() => {
                  setShowResults(false);
                  setSelectedConcerns([]);
                }}
              >
                Start New Assessment
              </Button>
            </div>
          )}
        </main>

        {/* Assessment Modal */}
        <Dialog open={showAssessment} onOpenChange={setShowAssessment}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Quick Assessment ({assessmentStep}/3)
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {assessmentStep === 1 && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Your Age</label>
                    <Input 
                      type="number" 
                      placeholder="Enter age"
                      value={assessmentData.age}
                      onChange={(e) => setAssessmentData({...assessmentData, age: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">How long have you had this concern?</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['< 3 months', '3-6 months', '6-12 months', '> 1 year'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAssessmentData({...assessmentData, duration: opt})}
                          className={`p-3 rounded-xl border-2 text-sm ${
                            assessmentData.duration === opt 
                              ? 'border-teal-500 bg-teal-50' 
                              : 'border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {assessmentStep === 2 && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Severity</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['Mild', 'Moderate', 'Severe'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAssessmentData({...assessmentData, severity: opt})}
                          className={`p-3 rounded-xl border-2 text-sm ${
                            assessmentData.severity === opt 
                              ? 'border-teal-500 bg-teal-50' 
                              : 'border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Lifestyle factors</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Stress', 'Poor Sleep', 'Irregular Diet', 'Sedentary', 'Smoking', 'Alcohol'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            const current = assessmentData.lifestyle || [];
                            setAssessmentData({
                              ...assessmentData, 
                              lifestyle: current.includes(opt) 
                                ? current.filter(l => l !== opt)
                                : [...current, opt]
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full border text-sm ${
                            (assessmentData.lifestyle || []).includes(opt)
                              ? 'border-teal-500 bg-teal-50 text-teal-700' 
                              : 'border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {assessmentStep === 3 && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Current supplements (if any)</label>
                    <Textarea 
                      placeholder="e.g., Vitamin D, Biotin, Multivitamins..."
                      value={assessmentData.currentSupplements}
                      onChange={(e) => setAssessmentData({...assessmentData, currentSupplements: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Any medical conditions?</label>
                    <Textarea 
                      placeholder="e.g., Thyroid, PCOS, Diabetes..."
                      value={assessmentData.medicalHistory}
                      onChange={(e) => setAssessmentData({...assessmentData, medicalHistory: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-3">
                {assessmentStep > 1 && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setAssessmentStep(assessmentStep - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button 
                  className={`flex-1 bg-gradient-to-r ${currentSectionData?.color}`}
                  onClick={() => {
                    if (assessmentStep < 3) {
                      setAssessmentStep(assessmentStep + 1);
                    } else {
                      completeAssessment();
                    }
                  }}
                >
                  {assessmentStep < 3 ? 'Next' : 'Get Recommendations'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Photo Upload Modal */}
        <Dialog open={showPhotoUpload} onOpenChange={setShowPhotoUpload}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Progress Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-3">Upload a photo to track your progress</p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Choose Photo
                </Button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Photos are stored securely and only visible to you
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
};

export default Reneu;
