import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import ReportTrendsChart from '@/components/ReportTrendsChart';
import CashfreeCheckout from '@/components/CashfreeCheckout';
import ServiceHeader from '@/components/ServiceHeader';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, ArrowRight, Upload, Plus, X, Heart, FlaskConical, Scan, Activity, 
  ShoppingCart, CreditCard, Banknote, CheckCircle2, Shield, Phone, Loader2, 
  Clock, AlertTriangle, Droplets, Droplet, TestTube, Stethoscope, ChevronRight, Search,
  Home, MapPin, Calendar, User, FileText, Smartphone, Bookmark, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============================================
// DESIGN SYSTEM - Mango Health Labs Theme
// ============================================
const theme = {
  primary: '#1F4F46',      // Primary Dark Green
  primaryDark: '#1F4F46',  // Primary Dark Green
  secondary: '#2E6B5F',    // Secondary Green
  accent: '#F4A43A',       // Mango Orange
  accentDark: '#E48C1C',   // Dark Orange
  accentLight: '#F7C27B',  // Soft Peach
  lightGreen: '#3E8A7A',   // Light Green
  background: '#F7F9F8',   // Card Background
  surface: '#FFFFFF',      // Pure White
  textPrimary: '#2B2B2B',  // Text Dark
  textSecondary: '#6F7B77', // Text Muted
  border: '#D2DAD7',       // Border Grey
  lightGrey: '#E6ECEA',    // Light Grey
  success: '#3E8A7A',      // Light Green
  error: '#EF4444'
};

// Test icons based on test type
const getTestIcon = (testName) => {
  const lowerName = testName.toLowerCase();
  
  // Blood/CBC tests
  if (lowerName.includes('cbc') || lowerName.includes('blood count') || lowerName.includes('hemoglobin') || lowerName.includes('rbc') || lowerName.includes('wbc') || lowerName.includes('platelet')) return '🩸';
  
  // Sugar/Diabetes tests
  if (lowerName.includes('sugar') || lowerName.includes('glucose') || lowerName.includes('hba1c') || lowerName.includes('diabetes') || lowerName.includes('insulin') || lowerName.includes('gtt') || lowerName.includes('ogtt')) return '🍬';
  
  // Thyroid tests
  if (lowerName.includes('thyroid') || lowerName.includes('tsh') || lowerName.includes('t3') || lowerName.includes('t4')) return '🦋';
  
  // Liver tests
  if (lowerName.includes('liver') || lowerName.includes('lft') || lowerName.includes('sgpt') || lowerName.includes('sgot') || lowerName.includes('bilirubin') || lowerName.includes('albumin')) return '🫀';
  
  // Kidney tests
  if (lowerName.includes('kidney') || lowerName.includes('renal') || lowerName.includes('creatinine') || lowerName.includes('urea') || lowerName.includes('uric') || lowerName.includes('rft') || lowerName.includes('egfr')) return '🫘';
  
  // Lipid tests
  if (lowerName.includes('lipid') || lowerName.includes('cholesterol') || lowerName.includes('triglyceride') || lowerName.includes('hdl') || lowerName.includes('ldl')) return '🧈';
  
  // Vitamin tests
  if (lowerName.includes('vitamin') || lowerName.includes('b12') || lowerName.includes('folate') || lowerName.includes('iron') || lowerName.includes('ferritin') || lowerName.includes('calcium') || lowerName.includes('zinc') || lowerName.includes('magnesium')) return '💊';
  
  // Hormone tests
  if (lowerName.includes('hormone') || lowerName.includes('lh') || lowerName.includes('fsh') || lowerName.includes('prolactin') || lowerName.includes('estradiol') || lowerName.includes('progesterone') || lowerName.includes('testosterone') || lowerName.includes('cortisol') || lowerName.includes('amh')) return '⚗️';
  
  // Pregnancy tests
  if (lowerName.includes('pregnancy') || lowerName.includes('hcg') || lowerName.includes('anc') || lowerName.includes('marker') || lowerName.includes('quadruple') || lowerName.includes('dual')) return '🤰';
  
  // Urine tests
  if (lowerName.includes('urine') || lowerName.includes('urinalysis')) return '🧪';
  
  // Cardiac tests
  if (lowerName.includes('cardiac') || lowerName.includes('heart') || lowerName.includes('troponin') || lowerName.includes('cpk') || lowerName.includes('bnp') || lowerName.includes('ecg')) return '❤️';
  
  // Infection tests
  if (lowerName.includes('hiv') || lowerName.includes('hepatitis') || lowerName.includes('dengue') || lowerName.includes('malaria') || lowerName.includes('typhoid') || lowerName.includes('culture') || lowerName.includes('viral')) return '🦠';
  
  // Cancer markers
  if (lowerName.includes('ca-') || lowerName.includes('cea') || lowerName.includes('afp') || lowerName.includes('psa') || lowerName.includes('tumor') || lowerName.includes('marker')) return '🔬';
  
  // Sonography/Imaging
  if (lowerName.includes('scan') || lowerName.includes('sonography') || lowerName.includes('usg') || lowerName.includes('ultrasound') || lowerName.includes('follicular')) return '📷';
  
  // Sputum tests
  if (lowerName.includes('sputum') || lowerName.includes('afb') || lowerName.includes('tb')) return '🫁';
  
  // Arthritis tests
  if (lowerName.includes('arthritis') || lowerName.includes('ra factor') || lowerName.includes('ana') || lowerName.includes('ccp')) return '🦴';
  
  // Package/Panel
  if (lowerName.includes('package') || lowerName.includes('profile') || lowerName.includes('panel') || lowerName.includes('checkup')) return '📦';
  
  // Default
  return '🧬';
};

// ============================================
// TEST DATA - All tests preserved
// ============================================
const imagingTests = {
  ecg: ['ECG (Electrocardiogram)'],
  sonography: [
    'Early Scan', 'NT Scan (Nuchal Translucency)', 'Growth Scan',
    'USG Pelvis', 'Follicular Monitoring'
  ]
};

const pathologyTests = {
  blood: [
    'CBC (Complete Blood Count)', 'Hemoglobin (Hb)', 'ESR (Erythrocyte Sedimentation Rate)',
    'Blood Group & Rh Factor', 'Platelet Count', 'PCV (Packed Cell Volume)',
    'RBC Count', 'WBC Count (Total & Differential)', 'Peripheral Blood Smear',
    'FBS (Fasting Blood Sugar)', 'PPBS (Post Prandial Blood Sugar)', 'Random Blood Sugar (RBS)',
    'HbA1c (Glycated Hemoglobin)', 'GTT (Glucose Tolerance Test)', 'OGTT - 3 Sample', 'Fructosamine',
    'Creatinine', 'Blood Urea', 'BUN (Blood Urea Nitrogen)', 'Uric Acid', 'eGFR (Estimated GFR)',
    'Electrolytes (Na, K, Cl)', 'Serum Electrolytes', 'RFT (Renal Function Test)', 'UPCR',
    'LFT (Liver Function Test)', 'SGPT (ALT)', 'SGOT (AST)', 'Alkaline Phosphatase (ALP)',
    'Bilirubin (Total, Direct, Indirect)', 'Total Protein', 'Albumin', 'Globulin',
    'A/G Ratio', 'GGT (Gamma GT)', 'Serum Amylase', 'Lipase', 'LDH',
    'Lipid Profile', 'Total Cholesterol', 'Triglycerides', 'HDL Cholesterol',
    'LDL Cholesterol', 'VLDL Cholesterol', 'Non-HDL Cholesterol', 'TC/HDL Ratio', 'LDL/HDL Ratio',
    'TSH', 'T3 (Total)', 'T4 (Total)', 'Free T3 (FT3)', 'Free T4 (FT4)',
    'Thyroid Profile - Free', 'Thyroid Profile - Total', 'Thyroid Antibodies (TPO, TG)',
    'Fasting Insulin', 'C-Peptide', 'HOMA-IR', 'Diabetes Basic', 'Diabetes Screening', 'Diabetes Advance',
    'Troponin I/T', 'CPK-MB', 'CRP (C-Reactive Protein)', 'hs-CRP', 'Homocysteine', 'BNP/NT-proBNP', 'D-Dimer',
    'Iron Studies (Serum Iron, TIBC, Ferritin)', 'Vitamin B12', 'Vitamin D', 'Folate (Folic Acid)',
    'Reticulocyte Count', 'G6PD', 'PT/INR', 'aPTT', 'Bleeding Time (BT)', 'Clotting Time (CT)', 'Fibrinogen',
    'LH (Luteinizing Hormone)', 'FSH (Follicle Stimulating Hormone)', 'Prolactin', 'Estradiol (E2)',
    'Progesterone', 'Testosterone (Total & Free)', 'Serum Testosterone', 'DHEA-S', 'Cortisol',
    'AMH (Anti-Mullerian Hormone)', 'Beta-hCG', 'Hormonal Basic', 'Hormonal Advance',
    'Dual / Double Marker', 'Quadruple Marker', 'ANC (Ante Natal Profile)',
    'PSA (Prostate Specific Antigen)', 'Serum PSA', 'CA-125', 'CA 19-9', 'CEA', 'AFP (Alpha-Fetoprotein)',
    'Vitamin D (25-OH)', 'Vitamin B1 (Thiamine)', 'Vitamin B6', 'Calcium (Total & Ionized)',
    'Phosphorus', 'Magnesium', 'Zinc', 'Arthritis Basic Panel', 'RA Factor', 'Anti-CCP', 'ANA (Antinuclear Antibody)',
    'HIV - Rapid', 'HIV 1 & 2', 'HBsAg (Hepatitis B)', 'HCV - Rapid', 'HCV (Hepatitis C)',
    'VDRL/RPR (Syphilis)', 'H3 Viral Marker', 'Dengue NS1/IgM/IgG', 'MP Antigen (Malaria)',
    'Malaria (Antigen & Smear)', 'Typhoid (Widal Test)', 'Blood Culture & Sensitivity', 'Amylase'
  ],
  urine: [
    'Urine Routine & Microscopy', 'Urine Culture & Sensitivity', 'Urine Albumin', 'Urine Creatinine',
    'Albumin/Creatinine Ratio (ACR)', 'Urine Sugar', 'Urine Ketones', 'Urine Protein',
    'Urine Bilirubin', 'Urine Urobilinogen', 'Urine pH', 'Urine Specific Gravity',
    'Urine Microalbumin', '24-Hour Urine Protein', '24-Hour Urine Creatinine',
    '24-Hour Urine Calcium', '24-Hour Urine Uric Acid', '24-Hour Urine Sodium',
    '24-Hour Urine Potassium', 'Urine Pregnancy Test', 'Urine Drug Screen', 'Urine Osmolality'
  ],
  sputum: [
    'Sputum AFB (Acid-Fast Bacilli)', 'Sputum Culture & Sensitivity', 'Sputum Gram Stain',
    'Sputum Cytology', 'Sputum for Malignant Cells', 'GeneXpert MTB/RIF', 'Sputum Fungal Culture'
  ],
  packages: [
    'Diabetes Screening Package', 'Diabetes Basic Package', 'Diabetes Advance Package',
    'Mango Basic Package', 'Mango Total Package', 'Mango Xclusive Package',
    'Cardiac Risk Profile', 'Anemia Profile', 'Arthritis Panel', 'Fever Panel',
    'Pre-Operative Profile', 'Master Health Checkup', 'Home Visit (0-5 km)',
    'Home Visit (5-10 km)', 'Home Visit (10-15 km)'
  ]
};

// Test preparation instructions
const testPreparations = {
  'FBS (Fasting Blood Sugar)': { fasting: true, hours: 8, instruction: '8-12 hours fasting required. Only water allowed.' },
  'PPBS (Post Prandial Blood Sugar)': { fasting: false, instruction: 'Test 2 hours after a meal.' },
  'GTT (Glucose Tolerance Test)': { fasting: true, hours: 10, instruction: '10-12 hours fasting. Multiple samples over 2-3 hours.' },
  'OGTT - 3 Sample': { fasting: true, hours: 10, instruction: '10-12 hours fasting. Multiple samples over 2-3 hours.' },
  'Lipid Profile': { fasting: true, hours: 10, instruction: '10-12 hours fasting for accurate results.' },
  'Total Cholesterol': { fasting: true, hours: 10, instruction: '10-12 hours fasting recommended.' },
  'Triglycerides': { fasting: true, hours: 12, instruction: '12-14 hours fasting required.' },
  'LFT (Liver Function Test)': { fasting: true, hours: 8, instruction: '8-12 hours fasting recommended.' },
  'RFT (Renal Function Test)': { fasting: false, instruction: 'No fasting required. Stay hydrated.' },
  'TSH': { fasting: false, instruction: 'No fasting required. Best done in morning.' },
  'CBC (Complete Blood Count)': { fasting: false, instruction: 'No fasting required.' },
  'HbA1c (Glycated Hemoglobin)': { fasting: false, instruction: 'No fasting required.' },
};

// ============================================
// STEP PROGRESS COMPONENT
// ============================================
const StepProgress = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Select Tests', icon: FlaskConical },
    { num: 2, label: 'Details', icon: Shield },
    { num: 3, label: 'Book', icon: CheckCircle2 }
  ];
  
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, idx) => (
        <React.Fragment key={step.num}>
          <div className={`
            flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all
            ${currentStep === step.num 
              ? 'bg-[#5FA8D3] text-white shadow-lg' 
              : currentStep > step.num 
                ? 'bg-[#10B981]/10 text-[#10B981]' 
                : 'bg-slate-100 text-slate-400'
            }
          `}>
            {currentStep > step.num ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-slate-300" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================
// TEST CATEGORY CARD
// ============================================
// ============================================
// TEST CATEGORY CARD with hover animations
// ============================================
const TestCategoryCard = ({ icon: Icon, title, count, color, isActive, onClick }) => (
  <button
    onClick={onClick}
    data-testid={`test-category-${title.toLowerCase().replace(/\s+/g, '-')}`}
    className={`
      p-4 rounded-2xl border-2 transition-all duration-300 ease-out text-left w-full group
      active:scale-95 active:shadow-inner
      ${isActive 
        ? `border-[${color}] bg-[${color}]/5 shadow-lg scale-[1.02]` 
        : 'border-slate-200 hover:border-[#5FA8D3]/30 bg-white hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5'
      }
    `}
    style={isActive ? { borderColor: color, backgroundColor: `${color}10` } : {}}
  >
    {/* Shimmer effect on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-2xl">
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
    
    <div className="flex items-center gap-3 relative">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" style={{ color }} />
      </div>
      <div>
        <h3 className="font-semibold text-[#1E293B] transition-colors group-hover:text-[#5FA8D3]" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
        <p className="text-xs text-slate-500 transition-all group-hover:tracking-wide">{count} tests</p>
      </div>
      {isActive && (
        <div className="ml-auto">
          <CheckCircle2 className="w-5 h-5 text-[#5FA8D3] animate-bounce" />
        </div>
      )}
    </div>
  </button>
);

// ============================================
// TEST CHECKBOX COMPONENT (Pastel Style with Icons)
// ============================================
const TestCheckbox = ({ test, checked, onToggle }) => (
  <label className="flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer hover:bg-[#5FA8D3]/5 transition-colors group">
    <Checkbox
      id={test}
      checked={checked}
      onCheckedChange={onToggle}
      className="border-2 border-slate-300 data-[state=checked]:bg-[#5FA8D3] data-[state=checked]:border-[#5FA8D3]"
    />
    <span className="text-lg" role="img" aria-label="test icon">{getTestIcon(test)}</span>
    <span className="text-sm text-[#1E293B] group-hover:text-[#5FA8D3] transition-colors" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {test}
    </span>
  </label>
);

// ============================================
// MAIN PROTON COMPONENT
// ============================================
const Proton = () => {
  // Mango Health Labs - Diagnostic Center
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get initial step from URL or default to 0
  const getInitialStep = () => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) return parsed;
    }
    return 0;
  };
  
  const [currentStep, setCurrentStepInternal] = useState(getInitialStep);
  
  // Custom setCurrentStep that also updates URL
  const setCurrentStep = (step) => {
    setCurrentStepInternal(step);
    const newParams = new URLSearchParams(searchParams);
    if (step === 0) {
      newParams.delete('step');
    } else {
      newParams.set('step', step.toString());
    }
    setSearchParams(newParams, { replace: true });
  };
  
  const [selectedTests, setSelectedTests] = useState([]);
  const [customTest, setCustomTest] = useState('');
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('09:00-11:00');
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('pregnancy');
  const [activeTab, setActiveTab] = useState('pathology');
  const [collectionType, setCollectionType] = useState('home'); // 'home' or 'center'
  const [showTrends, setShowTrends] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  
  // Wishlist & Save for Later
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('mango_wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [showWishlist, setShowWishlist] = useState(false);
  const [hasSavedCart, setHasSavedCart] = useState(false);
  
  // Check for saved cart on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('mango_saved_cart');
    if (savedCart) {
      setHasSavedCart(true);
    }
  }, []);
  
  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('mango_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);
  
  // Wishlist functions
  const toggleWishlist = (test) => {
    const isInWishlist = wishlist.some(w => w.name === test.name);
    if (isInWishlist) {
      setWishlist(wishlist.filter(w => w.name !== test.name));
      toast.success(`Removed ${test.name} from wishlist`);
    } else {
      setWishlist([...wishlist, { name: test.name, price: test.price, category: test.category || 'General' }]);
      toast.success(`Added ${test.name} to wishlist`);
    }
  };
  
  const isInWishlist = (testName) => wishlist.some(w => w.name === testName);
  
  // Save cart for later
  const saveCartForLater = () => {
    if (selectedTests.length === 0) {
      toast.error('No tests selected to save');
      return;
    }
    const cartData = {
      tests: selectedTests,
      patientInfo,
      collectionType,
      preferredDate: preferredDate.toISOString(),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('mango_saved_cart', JSON.stringify(cartData));
    toast.success('Cart saved! You can continue later.');
    setHasSavedCart(true);
  };
  
  // Restore saved cart
  const restoreSavedCart = () => {
    const savedCart = localStorage.getItem('mango_saved_cart');
    if (savedCart) {
      const cartData = JSON.parse(savedCart);
      setSelectedTests(cartData.tests || []);
      setPatientInfo(prev => ({ ...prev, ...cartData.patientInfo }));
      setCollectionType(cartData.collectionType || 'home');
      if (cartData.preferredDate) {
        setPreferredDate(new Date(cartData.preferredDate));
      }
      toast.success('Cart restored successfully!');
      setCurrentStep(1); // Go to cart step
    }
  };
  
  // Clear saved cart
  const clearSavedCart = () => {
    localStorage.removeItem('mango_saved_cart');
    setHasSavedCart(false);
    toast.success('Saved cart cleared');
  };

  const timeSlots = [
    { value: '08:00-10:00', label: '8:00 AM - 10:00 AM' },
    { value: '10:00-12:00', label: '10:00 AM - 12:00 PM' },
    { value: '12:00-14:00', label: '12:00 PM - 2:00 PM' },
    { value: '14:00-16:00', label: '2:00 PM - 4:00 PM' },
    { value: '16:00-19:00', label: '4:00 PM - 7:00 PM' }
  ];

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [otpMethod, setOtpMethod] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  
  const [bookingLimits, setBookingLimits] = useState({
    canBook: true,
    activeOrders: 0,
    loading: true
  });

  // Check for pre-selected tests from Glydex or section navigation
  useEffect(() => {
    const testsParam = searchParams.get('tests');
    const fromParam = searchParams.get('from');
    const sectionParam = searchParams.get('section');
    
    if (testsParam && fromParam === 'glydex') {
      const preSelectedTests = decodeURIComponent(testsParam).split(',');
      setSelectedTests(preSelectedTests);
      setActiveTab('pathology');
      setActiveCategory('diabetes');
      toast.success(`${preSelectedTests.length} test${preSelectedTests.length > 1 ? 's' : ''} pre-selected from Glydex`);
    }
    
    // Handle section navigation from QuickActions
    if (sectionParam === 'sonography') {
      setActiveTab('imaging');
      setTimeout(() => {
        const el = document.getElementById('sonography-section');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } else if (sectionParam === 'ecg') {
      setActiveTab('imaging');
      setTimeout(() => {
        const el = document.getElementById('ecg-section');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [searchParams]);

  // Check booking limits
  useEffect(() => {
    const checkBookingLimits = async () => {
      if (!patientInfo.phone || patientInfo.phone.length < 10) {
        setBookingLimits({ canBook: true, activeOrders: 0, loading: false });
        return;
      }
      try {
        const response = await axios.get(`${API}/booking-limits/status`, {
          params: { phone: patientInfo.phone }
        });
        setBookingLimits({
          canBook: response.data.can_book_diagnostic,
          activeOrders: response.data.active_diagnostic_orders,
          loading: false
        });
      } catch (error) {
        setBookingLimits({ canBook: true, activeOrders: 0, loading: false });
      }
    };
    const debounce = setTimeout(checkBookingLimits, 500);
    return () => clearTimeout(debounce);
  }, [patientInfo.phone]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const toggleTest = (test) => {
    setSelectedTests(prev => prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]);
  };

  const addCustomTest = () => {
    if (customTest.trim() && !selectedTests.includes(customTest.trim())) {
      setSelectedTests([...selectedTests, customTest.trim()]);
      setCustomTest('');
      toast.success('Custom test added');
    }
  };

  const removeTest = (test) => {
    setSelectedTests(prev => prev.filter(t => t !== test));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPrescriptionFile(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user) formData.append('user_id', user.id);
      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(user && { Authorization: `Bearer ${localStorage.getItem('token')}` })
        }
      });
      setPrescriptionUrl(response.data.url);
      toast.success('Prescription uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload prescription');
    } finally {
      setUploading(false);
    }
  };

  const sendOtp = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/otp/send`, { phone: patientInfo.phone, service: 'proton' });
      setMockOtp(response.data.mock_otp || '');
      setOtpMethod(response.data.method || 'mock');
      setResendTimer(30);
      toast.success(response.data.method === 'sms' ? 'OTP sent to your phone!' : 'OTP sent successfully!');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/otp/verify`, { phone: patientInfo.phone, otp: otpValue, service: 'proton' });
      setVerificationToken(response.data.verification_token);
      toast.success('Phone verified successfully!');
      setCurrentStep(3);
      window.scrollTo(0, 0);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const goToStep2 = () => {
    if (selectedTests.length === 0 && !prescriptionUrl) {
      toast.error('Please select tests OR upload a prescription');
      return;
    }
    if (!patientInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    // Email is optional - skip validation if not provided
    // Skip OTP step - directly go to booking step
    setCurrentStep(3);
    window.scrollTo(0, 0);
  };

  const goToStep1 = () => {
    setCurrentStep(1);
    setOtp(['', '', '', '', '', '']);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!preferredDate) {
      toast.error('Please select a preferred date');
      return;
    }
    // Email is optional - only validate if provided
    if (patientInfo.email && !patientInfo.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    // Validate address for home collection
    if (collectionType === 'home' && !patientInfo.address?.trim()) {
      toast.error('Please enter your address for home sample collection');
      return;
    }
    
    // No automatic amount - lab will confirm final bill
    setOrderTotal(0);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = async (paymentInfo) => {
    setLoading(true);
    try {
      const orderData = {
        tests: selectedTests,
        prescription_url: prescriptionUrl || null,
        preferred_date: format(preferredDate, 'yyyy-MM-dd'),
        preferred_time_slot: preferredTimeSlot,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_email: patientInfo.email || null,
        patient_address: collectionType === 'home' ? patientInfo.address : null,
        payment_method: paymentInfo.method,
        cashfree_order_id: paymentInfo.orderId || null,
        collection_type: collectionType
      };
      await axios.post(`${API}/diagnostics`, orderData, {
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      
      const successMessage = collectionType === 'home' 
        ? 'Home sample collection booked! Our phlebotomist will call you to confirm timing.'
        : 'Test booking confirmed! Please visit our collection center on the selected date.';
      toast.success(successMessage);
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error('Failed to process booking');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTestPreparations = () => {
    return selectedTests.filter(test => testPreparations[test]).map(test => ({ test, ...testPreparations[test] }));
  };

  // Test categories for quick navigation - Comprehensive with color coding and icons
  const testCategories = [
    { 
      id: 'pregnancy', 
      title: 'Pregnancy & OBGYN', 
      icon: Heart, 
      color: '#EC4899',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      iconBg: 'bg-pink-100',
      tests: [
        { name: 'Dual / Double Marker', price: 2000 },
        { name: 'Quadruple Marker', price: 2600 },
        { name: 'ANC (Ante Natal Profile)', price: 1950 },
        { name: 'Beta HCG', price: 680 },
        { name: 'AMH (Anti-Mullerian Hormone)', price: 1550 },
        { name: 'Hormonal Basic', price: 800 },
        { name: 'Hormonal Advance', price: 1200 },
        { name: 'LH (Luteinizing Hormone)', price: 400 },
        { name: 'FSH (Follicle Stimulating Hormone)', price: 400 },
        { name: 'Prolactin', price: 350 },
        { name: 'Estradiol (E2)', price: 650 },
        { name: 'Progesterone', price: 500 },
        { name: 'Serum Testosterone', price: 500 }
      ]
    },
    { 
      id: 'diabetes', 
      title: 'Diabetes & Sugar', 
      icon: Activity, 
      color: '#3B82F6',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-100',
      tests: [
        { name: 'FBS (Fasting Blood Sugar)', price: 75 },
        { name: 'PPBS (Post Prandial Blood Sugar)', price: 75 },
        { name: 'Random Blood Sugar (RBS)', price: 75 },
        { name: 'HbA1c (Glycated Hemoglobin)', price: 450 },
        { name: 'Diabetes Basic', price: 250 },
        { name: 'Diabetes Screening', price: 600 },
        { name: 'OGTT - 3 Sample', price: 450 },
        { name: 'Insulin - Post Prandial', price: 650 },
        { name: 'Insulin Random', price: 1100 },
        { name: 'C-Peptide', price: 1050 }
      ]
    },
    { 
      id: 'blood', 
      title: 'Blood Tests', 
      icon: Droplets, 
      color: '#EF4444',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-100',
      tests: [
        { name: 'CBC (Complete Blood Count)', price: 500 },
        { name: 'CBC ESR', price: 380 },
        { name: 'Blood Group', price: 150 },
        { name: 'Hemoglobin (Hb)', price: 100 },
        { name: 'ESR', price: 100 },
        { name: 'BT CT', price: 250 },
        { name: 'PT INR', price: 450 }
      ]
    },
    { 
      id: 'thyroid', 
      title: 'Thyroid Profile', 
      icon: TestTube, 
      color: '#8B5CF6',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-100',
      tests: [
        { name: 'TSH', price: 200 },
        { name: 'Thyroid Profile - Free', price: 550 },
        { name: 'Thyroid Profile - Total', price: 350 },
        { name: 'T3', price: 200 },
        { name: 'T4', price: 200 },
        { name: 'Free T3 T4 TSH', price: 550 }
      ]
    },
    { 
      id: 'vitamins', 
      title: 'Vitamins & Minerals', 
      icon: Stethoscope, 
      color: '#10B981',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      tests: [
        { name: 'Vitamin D', price: 850 },
        { name: 'Vitamin B12', price: 500 },
        { name: 'Iron Studies', price: 600 },
        { name: 'Calcium', price: 200 },
        { name: 'Serum Magnesium', price: 200 },
        { name: 'Serum Phosphorus', price: 200 },
        { name: 'Sodium', price: 150 },
        { name: 'Potassium', price: 150 },
        { name: 'G6PD', price: 470 }
      ]
    },
    { 
      id: 'liver', 
      title: 'Liver Function', 
      icon: FlaskConical, 
      color: '#F59E0B',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-100',
      tests: [
        { name: 'LFT (Liver Function Test)', price: 450 },
        { name: 'SGPT (ALT)', price: 180 },
        { name: 'SGOT (AST)', price: 180 },
        { name: 'Total Bilirubin', price: 150 },
        { name: 'Direct Bilirubin', price: 150 },
        { name: 'Serum Albumin', price: 300 },
        { name: 'Bile Acid', price: 2000 },
        { name: 'Serum Amylase', price: 500 },
        { name: 'Lipase', price: 600 },
        { name: 'LDH', price: 550 }
      ]
    },
    { 
      id: 'kidney', 
      title: 'Kidney Function', 
      icon: Droplet, 
      color: '#06B6D4',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      iconBg: 'bg-cyan-100',
      tests: [
        { name: 'RFT (Renal Function Test)', price: 600 },
        { name: 'Creatinine', price: 180 },
        { name: 'BUN', price: 240 },
        { name: 'Blood Urea', price: 240 },
        { name: 'Uric Acid', price: 200 },
        { name: 'Serum Electrolytes', price: 400 },
        { name: 'UPCR', price: 660 },
        { name: 'Cystatin C', price: 1100 }
      ]
    },
    { 
      id: 'lipid', 
      title: 'Lipid Profile', 
      icon: Heart, 
      color: '#F97316',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-100',
      tests: [
        { name: 'Lipid Profile', price: 500 },
        { name: 'Serum Cholesterol', price: 220 },
        { name: 'Triglycerides', price: 250 },
        { name: 'HDL', price: 150 },
        { name: 'LDL', price: 150 }
      ]
    },
    { 
      id: 'cardiac', 
      title: 'Cardiac Markers', 
      icon: Activity, 
      color: '#DC2626',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-100',
      tests: [
        { name: 'CPKMB', price: 450 },
        { name: 'Troponin I', price: 1050 },
        { name: 'ECG (Electrocardiogram)', price: 300 }
      ]
    },
    { 
      id: 'infection', 
      title: 'Infection & Viral', 
      icon: Shield, 
      color: '#7C3AED',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
      iconBg: 'bg-violet-100',
      tests: [
        { name: 'HIV - Rapid', price: 550 },
        { name: 'HCV - Rapid', price: 600 },
        { name: 'HBsAg', price: 400 },
        { name: 'VDRL / RPR', price: 200 },
        { name: 'Dengue NS1 Rapid', price: 800 },
        { name: 'Dengue Profile (IgM+IgG+NS1)', price: 1450 },
        { name: 'Widal Test', price: 330 },
        { name: 'Filaria Antigen', price: 360 },
        { name: 'MP Antigen (Malaria)', price: 650 },
        { name: 'H3 Viral Marker', price: 1200 }
      ]
    },
    { 
      id: 'culture', 
      title: 'Culture Tests', 
      icon: FlaskConical, 
      color: '#0891B2',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      iconBg: 'bg-teal-100',
      tests: [
        { name: 'Blood Culture & Sensitivity', price: 1000 },
        { name: 'Urine Culture & Sensitivity', price: 1000 },
        { name: 'Sputum Routine', price: 150 },
        { name: 'Pus C/S', price: 1000 }
      ]
    },
    { 
      id: 'arthritis', 
      title: 'Arthritis & Autoimmune', 
      icon: Activity, 
      color: '#DB2777',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      iconBg: 'bg-pink-100',
      tests: [
        { name: 'RA Factor', price: 600 },
        { name: 'CRP (C-Reactive Protein)', price: 450 },
        { name: 'ASO Titre', price: 550 },
        { name: 'Anti CCP', price: 1250 },
        { name: 'ANA IFA', price: 1000 },
        { name: 'ANA Blot', price: 3300 },
        { name: 'C ANCA', price: 1300 },
        { name: 'P ANCA', price: 1300 },
        { name: 'Anti dsDNA', price: 1200 },
        { name: 'Arthritis Basic Panel', price: 1650 }
      ]
    },
    { 
      id: 'tumor', 
      title: 'Tumor Markers', 
      icon: Scan, 
      color: '#9333EA',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-100',
      tests: [
        { name: 'CA 19.9', price: 1000 },
        { name: 'CA 125', price: 1100 },
        { name: 'CA 15.3', price: 1100 },
        { name: 'CEA', price: 800 },
        { name: 'Alpha Fetoprotein', price: 800 },
        { name: 'Serum PSA', price: 1050 }
      ]
    },
    { 
      id: 'urine', 
      title: 'Urine Tests', 
      icon: Droplet, 
      color: '#0EA5E9',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      iconBg: 'bg-sky-100',
      tests: [
        { name: 'Urine Routine & Microscopy', price: 150 },
        { name: 'Urine Culture & Sensitivity', price: 1000 },
        { name: 'UPCR', price: 660 }
      ]
    },
    { 
      id: 'imaging', 
      title: 'Imaging & Scans', 
      icon: Scan, 
      color: '#64748B',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      iconBg: 'bg-slate-100',
      tests: [
        { name: 'ECG (Electrocardiogram)', price: 300 },
        { name: 'Early Scan', price: 800 },
        { name: 'NT Scan (Nuchal Translucency)', price: 1500 },
        { name: 'Growth Scan', price: 1000 },
        { name: 'USG Pelvis', price: 700 },
        { name: 'Follicular Monitoring', price: 500 }
      ]
    },
    { 
      id: 'genetic', 
      title: 'Genetic & Special', 
      icon: Activity, 
      color: '#059669',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      tests: [
        { name: 'Karyotyping', price: 5500 },
        { name: 'NIPT', price: 12000 },
        { name: 'Histopathology', price: 2500 },
        { name: 'Biopsy Growth', price: 2000 },
        { name: 'Coombs Test, Indirect', price: 500 }
      ]
    }
  ];

  const getCurrentCategoryTests = () => {
    const category = testCategories.find(c => c.id === activeCategory);
    return category ? category.tests.map(t => t.name) : [];
  };

  // Get all tests from all categories for search
  const getAllTests = () => {
    const allTests = [
      ...pathologyTests.blood,
      ...pathologyTests.urine,
      ...pathologyTests.sputum,
      ...pathologyTests.packages,
      ...imagingTests.ecg,
      ...imagingTests.sonography
    ];
    // Remove duplicates
    return [...new Set(allTests)];
  };

  // Filter tests based on search term
  const getFilteredTests = () => {
    if (!testSearchTerm.trim()) return [];
    const searchLower = testSearchTerm.toLowerCase();
    return getAllTests().filter(test => 
      test.toLowerCase().includes(searchLower)
    );
  };

  const filteredTests = getFilteredTests();

  // Popular packages for the landing page (Prices from Master Lab Inventory)
  const popularPackages = [
    { 
      id: 'diabetes-screening', 
      name: 'Diabetes Screening', 
      tests: ['FBS', 'PPBS', 'HbA1c'], 
      originalPrice: 800, 
      price: 600, 
      discount: 25,
      parameters: 3,
      reportTime: '6 hours'
    },
    { 
      id: 'thyroid-profile', 
      name: 'Thyroid Profile (Free)', 
      tests: ['TSH', 'T3', 'T4', 'Free T3', 'Free T4'], 
      originalPrice: 750, 
      price: 550, 
      discount: 27,
      parameters: 5,
      reportTime: '12 hours'
    },
    { 
      id: 'lipid-profile', 
      name: 'Lipid Profile', 
      tests: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL'], 
      originalPrice: 700, 
      price: 500, 
      discount: 29,
      parameters: 5,
      reportTime: '6 hours'
    },
    { 
      id: 'liver-function', 
      name: 'Liver Function Test', 
      tests: ['SGPT', 'SGOT', 'Bilirubin', 'Albumin', 'ALP'], 
      originalPrice: 600, 
      price: 450, 
      discount: 25,
      parameters: 10,
      reportTime: '12 hours'
    },
    { 
      id: 'kidney-function', 
      name: 'Kidney Function Test', 
      tests: ['Creatinine', 'Urea', 'Uric Acid', 'Electrolytes'], 
      originalPrice: 800, 
      price: 600, 
      discount: 25,
      parameters: 8,
      reportTime: '12 hours'
    }
  ];

  const popularTests = [
    { id: 'cbc', name: 'CBC (Complete Blood Count)', originalPrice: 650, price: 500, discount: 23, reportTime: '6 hours', testsIncluded: 24, description: 'A comprehensive blood test that evaluates your overall health by measuring red blood cells, white blood cells, hemoglobin, hematocrit, and platelets. Helps detect infections, anemia, blood disorders, and immune system conditions.' },
    { id: 'vitamin-d', name: 'Vitamin D (25-Hydroxy)', originalPrice: 1100, price: 850, discount: 23, reportTime: '24 hours', testsIncluded: 1, description: 'Measures the level of Vitamin D in your blood, essential for bone health, calcium absorption, and immune function. Low levels can lead to fatigue, bone pain, muscle weakness, and increased risk of osteoporosis.' },
    { id: 'vitamin-b12', name: 'Vitamin B12', originalPrice: 650, price: 500, discount: 23, reportTime: '24 hours', testsIncluded: 1, description: 'Checks Vitamin B12 levels crucial for nerve function, red blood cell formation, and DNA synthesis. Deficiency can cause fatigue, weakness, memory problems, and numbness in hands and feet.' },
    { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', originalPrice: 600, price: 450, discount: 25, reportTime: '12 hours', testsIncluded: 1, description: 'Measures your average blood sugar levels over the past 2-3 months. Essential for diabetes diagnosis, monitoring, and management. A key indicator of long-term glucose control.' },
    { id: 'tsh', name: 'TSH (Thyroid Stimulating Hormone)', originalPrice: 280, price: 200, discount: 29, reportTime: '12 hours', testsIncluded: 1, description: 'Evaluates thyroid gland function by measuring TSH levels. Helps detect hypothyroidism (underactive thyroid) or hyperthyroidism (overactive thyroid), which affect metabolism, energy, and weight.' },
    { id: 'fbs', name: 'Fasting Blood Sugar (FBS)', originalPrice: 100, price: 75, discount: 25, reportTime: '6 hours', testsIncluded: 1, description: 'Measures blood glucose levels after an overnight fast (8-12 hours). Used to screen for diabetes and prediabetes. Normal fasting glucose is below 100 mg/dL.' },
    { id: 'ppbs', name: 'Post Prandial Blood Sugar (PPBS)', originalPrice: 100, price: 75, discount: 25, reportTime: '6 hours', testsIncluded: 1, description: 'Measures blood sugar levels 2 hours after eating a meal. Helps assess how well your body processes glucose after food intake. Important for diabetes management.' },
    { id: 'lipid', name: 'Lipid Profile (Complete)', originalPrice: 700, price: 500, discount: 29, reportTime: '12 hours', testsIncluded: 8, description: 'Comprehensive cholesterol test measuring Total Cholesterol, LDL (bad cholesterol), HDL (good cholesterol), Triglycerides, and VLDL. Essential for assessing heart disease risk.' },
    { id: 'lft', name: 'Liver Function Test (LFT)', originalPrice: 600, price: 450, discount: 25, reportTime: '12 hours', testsIncluded: 12, description: 'Evaluates liver health by measuring enzymes (SGPT, SGOT, ALP), proteins (Albumin, Globulin), and bilirubin levels. Helps detect liver damage, hepatitis, fatty liver, and other liver conditions.' },
    { id: 'rft', name: 'Kidney Function Test (RFT)', originalPrice: 800, price: 600, discount: 25, reportTime: '12 hours', testsIncluded: 8, description: 'Assesses kidney health by measuring Creatinine, Blood Urea, Uric Acid, and electrolytes. Detects kidney disease, monitors kidney function, and evaluates dehydration or electrolyte imbalances.' },
    { id: 'uric', name: 'Uric Acid', originalPrice: 280, price: 200, discount: 29, reportTime: '6 hours', testsIncluded: 1, description: 'Measures uric acid levels in blood. High levels can indicate gout, kidney stones, or kidney disease. Also used to monitor chemotherapy patients and those on certain medications.' },
    { id: 'creatinine', name: 'Creatinine', originalPrice: 250, price: 180, discount: 28, reportTime: '6 hours', testsIncluded: 1, description: 'A key marker of kidney function. Creatinine is a waste product from muscle metabolism filtered by kidneys. Elevated levels may indicate impaired kidney function or dehydration.' },
    { id: 'urine', name: 'Urine Routine & Microscopy', originalPrice: 200, price: 150, discount: 25, reportTime: '6 hours', testsIncluded: 15, description: 'Complete urine analysis examining color, clarity, pH, protein, glucose, blood, and microscopic elements. Helps detect urinary tract infections, kidney disease, diabetes, and other conditions.' },
    { id: 'thyroid-free', name: 'Thyroid Profile (Free T3, T4, TSH)', originalPrice: 750, price: 550, discount: 27, reportTime: '12 hours', testsIncluded: 3, description: 'Complete thyroid panel measuring Free T3, Free T4, and TSH hormones. Provides comprehensive assessment of thyroid function for diagnosing and monitoring thyroid disorders.' },
    { id: 'iron', name: 'Iron Studies (Iron, TIBC, Ferritin)', originalPrice: 800, price: 600, discount: 25, reportTime: '24 hours', testsIncluded: 4, description: 'Comprehensive iron panel measuring Serum Iron, TIBC (Total Iron Binding Capacity), Transferrin Saturation, and Ferritin. Diagnoses iron deficiency anemia, hemochromatosis, and monitors iron therapy.' },
    { id: 'amh', name: 'AMH (Anti-Mullerian Hormone)', originalPrice: 2000, price: 1550, discount: 23, reportTime: '48 hours', testsIncluded: 1, description: 'Measures ovarian reserve and fertility potential in women. Important for family planning, IVF assessment, and diagnosing conditions like PCOS. Also used in evaluating testicular function in men.' },
    { id: 'sgpt', name: 'SGPT (ALT)', originalPrice: 250, price: 180, discount: 28, reportTime: '6 hours', testsIncluded: 1, description: 'Liver enzyme test that detects liver cell damage. Elevated SGPT/ALT levels may indicate hepatitis, fatty liver disease, alcohol-related liver damage, or medication side effects.' },
    { id: 'sgot', name: 'SGOT (AST)', originalPrice: 250, price: 180, discount: 28, reportTime: '6 hours', testsIncluded: 1, description: 'Enzyme found in liver, heart, and muscles. Elevated levels may indicate liver disease, heart attack, or muscle injury. Often tested alongside SGPT for comprehensive liver assessment.' },
  ];

  // State for test details modal
  const [selectedTestDetails, setSelectedTestDetails] = useState(null);

  // Handle package selection
  const handlePackageSelect = (pkg) => {
    setSelectedTests(pkg.tests);
    setCurrentStep(1);
    toast.success(`${pkg.name} selected! ${pkg.tests.length} tests added.`);
  };

  // Handle single test selection
  const handleTestSelect = (test) => {
    setSelectedTests([test.name]);
    setCurrentStep(1);
    toast.success(`${test.name} added to cart!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F4F46] via-[#2E6B5F] to-[#3E8A7A]">
      {/* Shared Service Header */}
      <ServiceHeader />

      {/* ========== MANGO HEALTH LABS HERO SECTION ========== */}
      {currentStep === 0 ? (
        <>
          {/* Dark Green Hero Banner Section with Mango Health Labs Branding */}
          <div className="bg-gradient-to-br from-[#1F4F46] via-[#2E6B5F] to-[#1F4F46] relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 py-5">
              <div className="flex items-center justify-between">
                {/* Left Content */}
                <div className="flex-1 text-white z-10">
                  {/* Mango Health Labs Logo */}
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src="/mango-logo.png" 
                      alt="Mango Health Labs" 
                      className="w-20 h-10 rounded-xl shadow-lg bg-white p-1 object-contain"
                    />
                    <div>
                      <h2 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Mango Health Labs</h2>
                      <p className="text-[10px] text-white/60 italic">Formerly Proton Diagnostics</p>
                      <p className="text-xs text-white/80">Your Trusted Diagnostic Partner</p>
                    </div>
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Blood Test At Home
                  </h1>
                  <div className="flex items-center gap-1 mb-2">
                    <Clock className="w-4 h-4 text-[#F4A43A]" />
                    <span className="font-semibold text-[#F4A43A] text-sm">in 60 MINS</span>
                  </div>
                </div>
              </div>
              
              {/* Reports badge - moved below to avoid congestion */}
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <div className="flex items-center gap-1 bg-orange-500/30 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-orange-200" />
                  <span className="text-[10px] font-medium text-orange-200">Reports in 06 HRS</span>
                </div>
                
                {/* Wishlist Button */}
                <button
                  onClick={() => setShowWishlist(true)}
                  className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 hover:bg-white/30 transition-all"
                  data-testid="open-wishlist-btn"
                >
                  <Heart className={`w-2.5 h-2.5 ${wishlist.length > 0 ? 'fill-red-400 text-red-400' : 'text-white'}`} />
                  <span className="text-[10px] font-medium text-white">Wishlist {wishlist.length > 0 && `(${wishlist.length})`}</span>
                </button>
                
                {/* Saved Cart Indicator */}
                {hasSavedCart && (
                  <button
                    onClick={restoreSavedCart}
                    className="flex items-center gap-1 bg-amber-500/80 backdrop-blur-sm rounded-full px-2.5 py-0.5 hover:bg-amber-500 transition-all animate-pulse"
                    data-testid="restore-cart-btn"
                  >
                    <Bookmark className="w-2.5 h-2.5 text-white" />
                    <span className="text-[10px] font-medium text-white">Continue Cart</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Search Bar - inside dark green section */}
            <div className="max-w-6xl mx-auto px-4 pb-3 relative z-20">
              <div className="bg-white rounded-2xl shadow-xl p-3 border-2 border-orange-300">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5" />
                  <Input
                    placeholder="Search for tests or checkups"
                    value={testSearchTerm}
                    onChange={(e) => setTestSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-3 text-base rounded-xl border-0 focus:ring-2 focus:ring-orange-400/30"
                    data-testid="hero-search"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {testSearchTerm && filteredTests.length > 0 && (
                  <div className="mt-3 max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                    <div className="p-2 bg-orange-50 border-b border-slate-200 text-xs text-slate-600 font-medium">
                      Found {filteredTests.length} tests matching &quot;{testSearchTerm}&quot;
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredTests.slice(0, 8).map(test => (
                        <button 
                          key={test} 
                          onClick={() => {
                            setSelectedTests([test]);
                            setTestSearchTerm('');
                            setCurrentStep(1);
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-orange-50 cursor-pointer transition-colors w-full text-left"
                        >
                          <span className="text-lg">{getTestIcon(test)}</span>
                          <span className="text-sm text-slate-800 font-medium">{test}</span>
                          <Plus className="w-4 h-4 text-orange-500 ml-auto" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-orange-400/20 rounded-full" />
          </div>
          {/* End of Dark Green Hero Section */}

          {/* Dark Green Content Area */}
          <div className="bg-gradient-to-b from-[#2E6B5F] to-[#3E8A7A] py-3">

          {/* Promo Banner - Mango Orange themed */}
          <div className="max-w-6xl mx-auto px-4 mt-2">
            <div className="bg-gradient-to-r from-[#F4A43A] via-[#E48C1C] to-[#F4A43A] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-full p-1.5">
                  <span className="text-lg">🎉</span>
                </div>
                <div className="text-white">
                  <p className="font-bold text-base">Get 15% OFF</p>
                  <p className="text-xs opacity-90">Use code: MANGO15</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-white text-[#1F4F46] hover:bg-[#F7F9F8] rounded-full font-bold text-xs px-3 py-1"
                onClick={() => {
                  navigator.clipboard.writeText('MANGO15');
                  toast.success('Coupon code copied!');
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Trust Badges - Compact */}
          <div className="max-w-6xl mx-auto px-4 mt-3">
            <div className="flex justify-between items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { icon: Shield, title: 'Certified Lab', color: 'text-orange-600', bg: 'bg-orange-500/10' },
                { icon: Clock, title: '8 AM - 10 PM', color: 'text-amber-600', bg: 'bg-amber-500/10' },
                { icon: CheckCircle2, title: '4.9/5 on Google', color: 'text-orange-600', bg: 'bg-orange-500/10' },
                { icon: Home, title: 'Home Collection', color: 'text-amber-600', bg: 'bg-amber-500/10' }
              ].map((badge, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm min-w-fit">
                  <div className={`w-6 h-6 rounded-full ${badge.bg} flex items-center justify-center`}>
                    <badge.icon className={`w-3 h-3 ${badge.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{badge.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Booked Checkups - Cards with varied gradient colors */}
          <div className="max-w-6xl mx-auto px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Most Booked Checkups
              </h2>
              <button 
                onClick={() => setCurrentStep(1)}
                className="text-orange-400 font-semibold text-xs flex items-center gap-1 hover:text-amber-400"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {popularPackages.map((pkg, index) => {
                // Varied gradient colors for visual distinction
                const cardGradients = [
                  'from-[#F4A43A] to-[#E48C1C]',
                  'from-pink-500 to-rose-600',
                  'from-teal-500 to-cyan-600',
                  'from-orange-500 to-amber-600',
                  'from-[#E48C1C] to-[#F4A43A]'
                ];
                const gradient = cardGradients[index % cardGradients.length];
                
                return (
                <div 
                  key={pkg.id}
                  className="min-w-[280px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex-shrink-0 hover:shadow-xl transition-all"
                  data-testid={`package-${pkg.id}`}
                >
                  {/* Varied Color Header */}
                  <div className={`bg-gradient-to-r ${gradient} p-4 text-white relative`}>
                    <div className="absolute top-2 right-2">
                      <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded">
                        Checkup
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-2 pr-16">{pkg.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-white/70 line-through text-sm">₹{pkg.originalPrice}</span>
                      <span className="text-2xl font-bold">₹{pkg.price}</span>
                    </div>
                    <span className="inline-block mt-2 bg-yellow-400 text-slate-800 text-xs font-bold px-2.5 py-1 rounded">
                      {pkg.discount}% Off
                    </span>
                  </div>
                  
                  {/* Info Section */}
                  <div className="p-4 bg-slate-50">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-orange-600" />
                        <span><strong>{pkg.parameters}</strong> parameters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>Reports: <strong>{pkg.reportTime}</strong></span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-lg border-orange-500/30 text-orange-600 hover:bg-orange-500/5 font-semibold"
                        onClick={() => {
                          toast.info(`${pkg.name}: ${pkg.tests.join(', ')}`);
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] hover:from-[#E48C1C] hover:to-[#F4A43A] text-white font-semibold"
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Most Booked Tests - Large Cards like Orange Health Labs */}
          <div className="max-w-6xl mx-auto px-4 mt-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Most Booked Tests
              </h2>
              <button 
                onClick={() => setCurrentStep(1)}
                className="text-orange-600 font-semibold text-sm flex items-center gap-1 hover:text-amber-600"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Large Test Cards Grid - Orange Health Labs Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularTests.map((test) => (
                <div 
                  key={test.id}
                  className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-all"
                  data-testid={`test-card-${test.id}`}
                >
                  {/* Green Gradient Header - Orange Health Labs Style */}
                  <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-5 text-white relative">
                    {/* Wishlist Heart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(test);
                      }}
                      className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all"
                      data-testid={`wishlist-btn-${test.name.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <Heart 
                        className={`w-4 h-4 ${isInWishlist(test.name) ? 'fill-red-500 text-red-500' : 'text-white'}`}
                      />
                    </button>
                    
                    {/* Test Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="bg-emerald-800/60 text-white text-xs font-bold px-3 py-1.5 rounded-md backdrop-blur-sm">
                        Test
                      </span>
                    </div>
                    
                    {/* Test Name */}
                    <h3 className="font-bold text-lg mb-3 pr-16 leading-tight">{test.name}</h3>
                    
                    {/* Price Display */}
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 line-through text-base">₹{test.originalPrice}</span>
                      <span className="text-3xl font-bold">₹{test.price}</span>
                    </div>
                  </div>
                  
                  {/* Info Section - White Background */}
                  <div className="p-5 bg-white">
                    <div className="flex items-center justify-between mb-5">
                      {/* Reports Time */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Reports within</p>
                          <p className="text-sm font-bold text-slate-800">{test.reportTime}</p>
                        </div>
                      </div>
                      
                      {/* Tests Included */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Tests included</p>
                          <p className="text-sm font-bold text-slate-800">{test.testsIncluded} test{test.testsIncluded > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold py-3"
                        onClick={() => setSelectedTestDetails(test)}
                      >
                        View Details
                      </Button>
                      <Button
                        className="flex-1 rounded-xl bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] hover:from-[#E48C1C] hover:to-[#F4A43A] text-white font-bold py-3 shadow-md"
                        onClick={() => handleTestSelect(test)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Browse All Tests Button */}
          <div className="max-w-6xl mx-auto px-4 pb-8">
            <Button
              onClick={() => setCurrentStep(1)}
              className="w-full bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] hover:from-[#E48C1C] hover:to-[#F4A43A] text-white py-6 rounded-2xl text-lg font-bold shadow-xl"
              data-testid="browse-all-tests-btn"
            >
              <FlaskConical className="w-5 h-5 mr-2" />
              Browse All Tests & Packages
            </Button>
          </div>
        </div>
        {/* End of White Section */}
        </>
      ) : (
        <>
          {/* Original Test Selection Flow */}
          {/* How It Works Banner */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-orange-500/20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-5 h-5 text-[#5FA8D3]" />
            <h3 className="font-semibold text-[#1E293B] font-heading">How to Book Diagnostic Tests</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { num: 1, title: 'Select Tests', desc: 'Choose tests or upload prescription' },
              { num: 2, title: 'Fill Details', desc: 'Enter name, phone, address' },
              { num: 3, title: 'Phlebotomist Call', desc: 'We confirm timing & location' },
              { num: 4, title: 'Reports Ready', desc: 'Download from My Orders', success: true }
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-2 p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.success ? 'bg-[#10B981] text-white' : 'bg-[#5FA8D3] text-white'}`}>
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Badges Section - Navy Blue Theme */}
      <div className="py-4 border-b border-orange-500/30 bg-orange-500/30 backdrop-blur-sm" data-testid="proton-trust-badges">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'trusted-labs', icon: Shield, title: 'Trusted &', subtitle: 'Accredited Labs', gradient: 'from-[#F4A43A] to-[#E48C1C]', bg: 'bg-orange-500/10' },
              { id: 'doctor-curated', icon: Stethoscope, title: 'Doctor', subtitle: 'Curated Packages', gradient: 'from-[#E48C1C] to-[#F4A43A]', bg: 'bg-amber-500/10' },
              { id: 'home-sample', icon: Clock, title: 'Home Sample', subtitle: 'Collection', gradient: 'from-[#F4A43A] to-[#E48C1C]', bg: 'bg-orange-500/10' },
              { id: 'fast-reports', icon: CheckCircle2, title: 'Accurate &', subtitle: 'Fast Reports', gradient: 'from-[#E48C1C] to-[#F4A43A]', bg: 'bg-amber-500/10' }
            ].map((badge) => (
              <div key={badge.id} className="flex flex-col items-center text-center min-w-[80px] flex-1" data-testid={`proton-trust-${badge.id}`}>
                <div className={`w-14 h-14 rounded-2xl ${badge.bg} flex items-center justify-center mb-2 shadow-sm`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center`}>
                    <badge.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-white leading-tight">{badge.title}</p>
                <p className="text-xs font-medium text-white leading-tight">{badge.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consultation Help Banner - Navy Blue Theme */}
      <div className="bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] text-white" data-testid="consultation-help-banner">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Not sure which test to book?</p>
                <p className="text-xs opacity-90">Consult our doctors • Get test recommendations • Review reports</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/diagyn')}
              variant="secondary"
              size="sm"
              className="bg-white text-orange-600 hover:bg-slate-100 rounded-full font-semibold flex-shrink-0"
              data-testid="book-doctor-btn"
            >
              Consult Doctor
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* White content container for better readability */}
        <div className="bg-white rounded-3xl shadow-xl p-4">
        {/* Your Health Trends - Toggle Section */}
        {patientInfo.phone && patientInfo.phone.length === 10 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTrends(!showTrends)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 hover:shadow-md transition-all"
              data-testid="show-trends-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-orange-600 text-sm">Your Health Trends</h3>
                  <p className="text-xs text-amber-600">View your previous test results</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-orange-600 transition-transform ${showTrends ? 'rotate-90' : ''}`} />
            </button>
            
            {showTrends && (
              <div className="mt-3">
                <ReportTrendsChart 
                  patientId={patientInfo.phone}
                  patientPhone={patientInfo.phone}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Select Tests */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-orange-600 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Select Your Tests
              </h1>
              <p className="text-slate-600 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Choose from imaging, pathology tests, or upload prescription
              </p>
            </div>

            {/* Professional Features Carousel - Solid Bold Colors with Images on Top */}
            <div className="relative -mx-4 px-4 overflow-hidden">
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
                
                {/* Slide 1: Why Mango? - Solid Green with Professional Image */}
                <div className="min-w-[320px] md:min-w-[420px] flex-shrink-0 snap-center">
                  <div className="relative h-56 md:h-64 rounded-2xl overflow-hidden shadow-xl bg-[#0D6651]">
                    {/* Solid Background */}
                    <div className="absolute inset-0 bg-[#0D6651]" />
                    
                    {/* Content Layout - Text Left, Image Right */}
                    <div className="relative h-full flex">
                      {/* Left Side - Text Content */}
                      <div className="w-[55%] p-5 md:p-6 flex flex-col justify-center z-10">
                        <h3 className="text-[#F5A623] text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Why Mango?
                        </h3>
                        <p className="text-white text-lg md:text-xl font-semibold mb-3">
                          Fast, Safe and Accurate
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0D6651]" />
                          </div>
                          <span className="text-white/90 text-sm">100% on time sample collection</span>
                        </div>
                        <p className="text-white/70 text-xs mt-2 leading-relaxed">
                          Samples are sent straight to our labs at the right temperature for the most accurate results
                        </p>
                      </div>
                      
                      {/* Right Side - Professional Image */}
                      <div className="w-[45%] relative">
                        <img 
                          src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=500&fit=crop&crop=top"
                          alt="Lab Professional"
                          className="absolute bottom-0 right-0 h-full w-full object-cover object-top"
                        />
                      </div>
                    </div>
                    
                    {/* Carousel Navigation Dots */}
                    <div className="absolute bottom-3 left-5 flex gap-1.5">
                      <div className="w-6 h-1.5 rounded-full bg-[#F5A623]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    </div>
                  </div>
                </div>

                {/* Slide 2: NABL Certified Labs - Navy Blue */}
                <div className="min-w-[320px] md:min-w-[420px] flex-shrink-0 snap-center">
                  <div className="relative h-56 md:h-64 rounded-2xl overflow-hidden shadow-xl bg-[#0c2340]">
                    {/* Solid Background */}
                    <div className="absolute inset-0 bg-[#0c2340]" />
                    
                    {/* Content Layout */}
                    <div className="relative h-full flex">
                      {/* Left Side - Text Content */}
                      <div className="w-[55%] p-5 md:p-6 flex flex-col justify-center z-10">
                        <div className="bg-[#F5A623] text-[#0c2340] text-xs font-bold px-2 py-1 rounded w-fit mb-2">
                          NABL CERTIFIED
                        </div>
                        <h3 className="text-white text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          State-of-the-Art Labs
                        </h3>
                        <p className="text-white/80 text-sm mb-3">
                          Advanced equipment for precise & accurate diagnostics
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0c2340]" />
                          </div>
                          <span className="text-white/90 text-sm">99.9% accuracy rate</span>
                        </div>
                      </div>
                      
                      {/* Right Side - Lab Image */}
                      <div className="w-[45%] relative">
                        <img 
                          src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=500&fit=crop"
                          alt="Modern Laboratory"
                          className="absolute bottom-0 right-0 h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 3: Easy Ordering - White Card with Green Border */}
                <div className="min-w-[320px] md:min-w-[420px] flex-shrink-0 snap-center">
                  <div className="relative h-56 md:h-64 rounded-2xl overflow-hidden shadow-xl bg-white border-2 border-[#0D6651]">
                    {/* Content Layout - Side by Side */}
                    <div className="relative h-full flex">
                      {/* Left Side - Text Content */}
                      <div className="w-1/2 p-4 md:p-5 flex flex-col justify-center">
                        <p className="text-slate-500 text-xs mb-0.5">Easy ordering in</p>
                        <h3 className="text-[#0D6651] text-3xl md:text-4xl font-black leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          3
                        </h3>
                        <h3 className="text-[#0D6651] text-2xl md:text-3xl font-black mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          STEPS
                        </h3>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#0D6651] flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className="text-slate-700 text-xs font-medium">Select tests</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#0D6651] flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className="text-slate-700 text-xs font-medium">Add your details</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#0D6651] flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className="text-slate-700 text-xs font-medium">Book your slot</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setCurrentStep(1)}
                          className="mt-3 bg-[#F5A623] hover:bg-[#e09515] text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors shadow-md w-fit"
                        >
                          Order Now
                        </button>
                      </div>
                      
                      {/* Right Side - Person Booking Online Image */}
                      <div className="w-1/2 relative overflow-hidden">
                        <img 
                          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=500&fit=crop"
                          alt="Booking Tests Online"
                          className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 4: Home Collection - Orange/Amber */}
                <div className="min-w-[320px] md:min-w-[420px] flex-shrink-0 snap-center">
                  <div className="relative h-56 md:h-64 rounded-2xl overflow-hidden shadow-xl bg-[#F5A623]">
                    {/* Solid Background */}
                    <div className="absolute inset-0 bg-[#F5A623]" />
                    
                    {/* Content Layout */}
                    <div className="relative h-full flex">
                      {/* Left Side - Text Content */}
                      <div className="w-[55%] p-5 md:p-6 flex flex-col justify-center z-10">
                        <div className="bg-white text-[#F5A623] text-xs font-bold px-2 py-1 rounded w-fit mb-2">
                          FREE ABOVE ₹2000
                        </div>
                        <h3 className="text-white text-xl md:text-2xl font-bold mb-2 drop-shadow-md" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Home Sample Collection
                        </h3>
                        <p className="text-white/90 text-sm mb-3">
                          Get tested from the comfort of your home
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                            <Home className="w-3 h-3 text-[#F5A623]" />
                          </div>
                          <span className="text-white font-medium text-sm">Trained phlebotomists</span>
                        </div>
                      </div>
                      
                      {/* Right Side - Healthcare Worker */}
                      <div className="w-[45%] relative">
                        <img 
                          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=500&fit=crop"
                          alt="Healthcare Professional"
                          className="absolute bottom-0 right-0 h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 5: Expert Doctors - Deep Purple */}
                <div className="min-w-[320px] md:min-w-[420px] flex-shrink-0 snap-center">
                  <div className="relative h-56 md:h-64 rounded-2xl overflow-hidden shadow-xl bg-[#4A1D6A]">
                    {/* Solid Background */}
                    <div className="absolute inset-0 bg-[#4A1D6A]" />
                    
                    {/* Content Layout */}
                    <div className="relative h-full flex">
                      {/* Left Side - Text Content */}
                      <div className="w-[55%] p-5 md:p-6 flex flex-col justify-center z-10">
                        <div className="bg-[#F5A623] text-[#4A1D6A] text-xs font-bold px-2 py-1 rounded w-fit mb-2">
                          FREE CONSULTATION
                        </div>
                        <h3 className="text-white text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Expert Doctor Review
                        </h3>
                        <p className="text-white/80 text-sm mb-3">
                          Get your reports explained by specialists
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center">
                            <Stethoscope className="w-3 h-3 text-[#4A1D6A]" />
                          </div>
                          <span className="text-white/90 text-sm">24/7 doctor support</span>
                        </div>
                      </div>
                      
                      {/* Right Side - Doctor Image */}
                      <div className="w-[45%] relative">
                        <img 
                          src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=500&fit=crop"
                          alt="Doctor"
                          className="absolute bottom-0 right-0 h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scroll Indicator */}
              <div className="flex justify-center gap-2 mt-3">
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Swipe for more
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Search Tests */}
            <Card className="p-4 rounded-2xl border-slate-200 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search tests... (e.g., CBC, Thyroid, HbA1c)"
                  value={testSearchTerm}
                  onChange={(e) => setTestSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-[#0c1e3c]/20"
                  data-testid="test-search"
                />
                {testSearchTerm && (
                  <button 
                    onClick={() => setTestSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Search Results */}
              {testSearchTerm && filteredTests.length > 0 && (
                <div className="mt-3 max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                  <div className="p-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-medium">
                    Found {filteredTests.length} tests matching &quot;{testSearchTerm}&quot;
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filteredTests.map(test => (
                      <label 
                        key={test} 
                        className="flex items-center gap-3 p-3 hover:bg-[#5FA8D3]/5 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedTests.includes(test)}
                          onCheckedChange={() => toggleTest(test)}
                          className="border-2 border-slate-300 data-[state=checked]:bg-[#5FA8D3] data-[state=checked]:border-[#5FA8D3]"
                        />
                        <span className="text-lg">{getTestIcon(test)}</span>
                        <span className="text-sm text-[#1E293B]">{test}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {testSearchTerm && filteredTests.length === 0 && (
                <div className="mt-3 p-4 text-center text-slate-500 text-sm bg-slate-50 rounded-xl">
                  No tests found matching &quot;{testSearchTerm}&quot;. Try a different search term or add as custom test below.
                </div>
              )}
            </Card>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              {[
                { id: 'pathology', label: 'Pathology', icon: FlaskConical },
                { id: 'imaging', label: 'Imaging', icon: Scan }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-[#5FA8D3] shadow-md' 
                      : 'text-slate-500 hover:text-[#5FA8D3]'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Holistic Women Care Section - Evara */}
            <div className="py-4 bg-gradient-to-br from-[#0c1e3c]/10 via-[#1a365d]/5 to-white rounded-2xl px-4 -mx-4" data-testid="womens-care-proton-section">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👩‍⚕️</span>
                  <h2 className="text-lg font-bold text-slate-800">Holistic Women Care</h2>
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                    ✨ Evara
                  </span>
                </div>
                <button 
                  onClick={() => navigate('/evara')}
                  className="text-sm text-orange-600 hover:text-amber-600 font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scroll Grid */}
              <div 
                className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {[
                  { id: 'pregnancy-tests', name: 'Pregnancy Tests', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop', tests: ['Beta HCG', 'Pregnancy Test', 'Dual Marker', 'Quadruple Marker', 'NIPT'] },
                  { id: 'fertility', name: 'Fertility Profile', image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=200&h=200&fit=crop', tests: ['AMH', 'FSH', 'LH', 'Prolactin', 'Estradiol', 'Progesterone'] },
                  { id: 'pcos', name: 'PCOS Panel', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop', tests: ['Free Testosterone', 'DHEAS', 'LH/FSH Ratio', 'Fasting Insulin', 'HbA1c'] },
                  { id: 'thyroid', name: 'Thyroid Profile', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop', tests: ['TSH', 'T3', 'T4', 'Free T3', 'Free T4', 'Anti-TPO'] },
                  { id: 'anemia', name: 'Anemia Panel', image: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=200&h=200&fit=crop', tests: ['CBC', 'Iron Studies', 'Ferritin', 'Vitamin B12', 'Folate'] },
                  { id: 'postpartum', name: 'Postpartum Care', image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=200&h=200&fit=crop', tests: ['CBC', 'Thyroid Panel', 'Vitamin D', 'Calcium', 'Iron Profile'] },
                  { id: 'menopause', name: 'Menopause Panel', image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop', tests: ['FSH', 'LH', 'Estradiol', 'Bone Profile', 'Lipid Panel', 'Vitamin D'] },
                  { id: 'boh', name: 'Bad Obstetric History', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop', tests: ['APLA Panel', 'Lupus Anticoagulant', 'Protein C', 'Protein S', 'Factor V Leiden'] },
                  { id: 'prenatal', name: 'ANC Profile', image: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=200&h=200&fit=crop', tests: ['CBC', 'Blood Group', 'HIV', 'HBsAg', 'VDRL', 'Urine R/M'] },
                  { id: 'breast', name: 'Breast Health', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&h=200&fit=crop', tests: ['CA 15-3', 'CA 125', 'Mammogram', 'Breast Ultrasound'] }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      // Add all tests from this category at once
                      setSelectedTests(prev => {
                        const newTests = [...prev];
                        item.tests.forEach(test => {
                          if (!newTests.includes(test)) {
                            newTests.push(test);
                          }
                        });
                        return newTests;
                      });
                      toast.success(`Added ${item.tests.length} tests from ${item.name}`);
                    }}
                    className="flex-shrink-0 flex flex-col items-center w-28 group"
                    data-testid={`womens-care-${item.id}`}
                  >
                    {/* Image Container */}
                    <div className="w-24 h-24 rounded-2xl overflow-hidden mb-2 border-2 border-orange-500/20 shadow-sm group-hover:border-orange-500/40 group-hover:shadow-md transition-all duration-300">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Name */}
                    <span className="text-xs font-medium text-slate-700 text-center leading-tight line-clamp-2">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pathology Tab - Orange Health Labs Style: Categories with Horizontal Card Carousels */}
            {activeTab === 'pathology' && (
              <div className="space-y-8">
                {testCategories.filter(cat => cat.id !== 'imaging').map((category) => (
                  <div key={category.id} className="space-y-3" data-testid={`category-section-${category.id}`}>
                    {/* Category Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-10 h-10 rounded-xl ${category.iconBg} flex items-center justify-center`}
                        >
                          <category.icon className="w-5 h-5" style={{ color: category.color }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{category.title}</h3>
                          <p className="text-xs text-slate-500">{category.tests.length} tests available</p>
                        </div>
                      </div>
                      <button className="text-sm font-medium flex items-center gap-1" style={{ color: category.color }}>
                        View All <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Horizontal Scrollable Test Cards - Orange Health Labs Style */}
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                      {category.tests.map((test) => (
                        <div 
                          key={test.name}
                          className="min-w-[300px] max-w-[300px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex-shrink-0 hover:shadow-xl transition-all"
                        >
                          {/* Green Gradient Header */}
                          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-4 text-white relative">
                            {/* Test Badge */}
                            <div className="absolute top-3 right-3">
                              <span className="bg-emerald-800/60 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">
                                Test
                              </span>
                            </div>
                            
                            {/* Test Name */}
                            <h4 className="font-bold text-base mb-2 pr-14 leading-tight">{test.name}</h4>
                            
                            {/* Price Display */}
                            <div className="flex items-center gap-2">
                              <span className="text-white/50 line-through text-sm">₹{Math.round(test.price * 1.3)}</span>
                              <span className="text-2xl font-bold">₹{test.price}</span>
                            </div>
                          </div>
                          
                          {/* Info Section */}
                          <div className="p-4 bg-white">
                            <div className="flex items-center justify-between mb-4">
                              {/* Reports Time */}
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">Reports within</p>
                                  <p className="text-xs font-bold text-slate-800">6-24 hours</p>
                                </div>
                              </div>
                              
                              {/* Tests Included */}
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <FlaskConical className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">Tests included</p>
                                  <p className="text-xs font-bold text-slate-800">1 test</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 rounded-xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold text-xs py-2.5"
                                onClick={() => setSelectedTestDetails({
                                  ...test,
                                  originalPrice: Math.round(test.price * 1.3),
                                  discount: 23,
                                  reportTime: '6-24 hours',
                                  testsIncluded: 1,
                                  description: `This test measures ${test.name.toLowerCase()} levels in your body. It helps diagnose and monitor various health conditions. Consult your doctor for proper interpretation of results.`
                                })}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 rounded-xl bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] hover:from-[#E48C1C] hover:to-[#F4A43A] text-white font-semibold text-xs py-2.5 shadow-md"
                                onClick={() => {
                                  toggleTest(test.name);
                                  toast.success(`${test.name} added!`);
                                }}
                              >
                                {selectedTests.includes(test.name) ? '✓ Added' : 'Add to Cart'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Imaging Tab - Beautiful Card Design with Prices */}
            {activeTab === 'imaging' && (
              <div className="space-y-8">
                {/* ECG Section */}
                <div className="space-y-3" data-testid="ecg-section">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">ECG Tests</h3>
                        <p className="text-xs text-slate-500">Electrocardiogram & Heart Monitoring</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                    {[
                      { name: 'ECG (Electrocardiogram)', price: 300, reportTime: '30 mins', description: 'Records electrical activity of heart to detect abnormalities, arrhythmias, and heart conditions' }
                    ].map((test) => (
                      <div 
                        key={test.name}
                        className="min-w-[300px] max-w-[300px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex-shrink-0 hover:shadow-xl transition-all snap-center"
                      >
                        <div className="bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 p-4 text-white relative">
                          <div className="absolute top-3 right-3">
                            <span className="bg-red-800/60 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">ECG</span>
                          </div>
                          <h4 className="font-bold text-base mb-2 pr-14 leading-tight">{test.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-white/50 line-through text-sm">₹{Math.round(test.price * 1.3)}</span>
                            <span className="text-2xl font-bold">₹{test.price}</span>
                          </div>
                        </div>
                        <div className="p-4 bg-white">
                          <p className="text-xs text-slate-600 mb-3 line-clamp-2">{test.description}</p>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500">Reports within</p>
                                <p className="text-xs font-bold text-slate-800">{test.reportTime}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold text-xs py-2.5"
                              onClick={() => setSelectedTestDetails({
                                ...test,
                                originalPrice: Math.round(test.price * 1.3),
                                discount: 23,
                                testsIncluded: 1
                              })}
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 rounded-xl bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] hover:from-[#E48C1C] hover:to-[#F4A43A] text-white font-semibold text-xs py-2.5 shadow-md"
                              onClick={() => {
                                toggleTest(test.name);
                                toast.success(`${test.name} added!`);
                              }}
                            >
                              {selectedTests.includes(test.name) ? '✓ Added' : 'Add to Cart'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sonography Section */}
                <div className="space-y-3" data-testid="sonography-section">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                        <Scan className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Sonography & Scans</h3>
                        <p className="text-xs text-slate-500">Ultrasound & Imaging Services</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                    {[
                      { name: 'Early Scan', price: 800, reportTime: '1 hour', description: 'First trimester ultrasound to confirm pregnancy, check heartbeat and estimate due date' },
                      { name: 'NT Scan (Nuchal Translucency)', price: 1500, reportTime: '1 hour', description: 'Measures fluid at back of baby\'s neck to assess risk of chromosomal abnormalities' },
                      { name: 'Growth Scan', price: 1000, reportTime: '1 hour', description: 'Monitors fetal growth, position, amniotic fluid levels and placenta health' },
                      { name: 'USG Pelvis', price: 700, reportTime: '1 hour', description: 'Examines uterus, ovaries and bladder to detect cysts, fibroids and other conditions' },
                      { name: 'Follicular Monitoring', price: 500, reportTime: '30 mins', description: 'Tracks ovarian follicle development for fertility treatment and ovulation timing' }
                    ].map((test) => (
                      <div 
                        key={test.name}
                        className="min-w-[300px] max-w-[300px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex-shrink-0 hover:shadow-xl transition-all snap-center"
                      >
                        <div className="bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 p-4 text-white relative">
                          <div className="absolute top-3 right-3">
                            <span className="bg-pink-800/60 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">Scan</span>
                          </div>
                          <h4 className="font-bold text-base mb-2 pr-14 leading-tight">{test.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-white/50 line-through text-sm">₹{Math.round(test.price * 1.3)}</span>
                            <span className="text-2xl font-bold">₹{test.price}</span>
                          </div>
                        </div>
                        <div className="p-4 bg-white">
                          <p className="text-xs text-slate-600 mb-3 line-clamp-2">{test.description}</p>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500">Reports within</p>
                                <p className="text-xs font-bold text-slate-800">{test.reportTime}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl border-2 border-pink-500 text-pink-600 hover:bg-pink-50 font-semibold text-xs py-2.5"
                              onClick={() => setSelectedTestDetails({
                                ...test,
                                originalPrice: Math.round(test.price * 1.3),
                                discount: 23,
                                testsIncluded: 1
                              })}
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 rounded-xl bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] hover:from-[#E48C1C] hover:to-[#F4A43A] text-white font-semibold text-xs py-2.5 shadow-md"
                              onClick={() => {
                                toggleTest(test.name);
                                toast.success(`${test.name} added!`);
                              }}
                            >
                              {selectedTests.includes(test.name) ? '✓ Added' : 'Add to Cart'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Test Entry */}
            <Card className="p-5 rounded-2xl border-slate-200">
              <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#5FA8D3]" />
                Add Custom Test
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter test name not in the list"
                  value={customTest}
                  onChange={(e) => setCustomTest(e.target.value)}
                  className="flex-1 rounded-xl border-slate-200 focus:border-[#5FA8D3] focus:ring-[#5FA8D3]/20"
                  data-testid="custom-test-input"
                />
                <Button onClick={addCustomTest} className="bg-[#5FA8D3] hover:bg-[#4A90B8] rounded-xl" data-testid="add-custom-test">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Selected Tests */}
            {selectedTests.length > 0 && (
              <Card className="p-5 rounded-2xl border-[#5FA8D3]/30 bg-[#5FA8D3]/5">
                <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#5FA8D3]" />
                  Selected Tests ({selectedTests.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTests.map((test) => (
                    <div key={test} className="flex items-center gap-1.5 bg-white text-[#1E293B] pl-3 pr-2 py-1.5 rounded-full text-sm border border-[#5FA8D3]/20">
                      <span>{test}</span>
                      <button onClick={() => removeTest(test)} className="hover:text-[#EF4444] transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Patient Info */}
            <Card className="p-5 rounded-2xl border-slate-200">
              <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#5FA8D3]" />
                Your Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-600 text-sm">Full Name *</Label>
                  <Input
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                    placeholder="Enter your name"
                    className="mt-1.5 rounded-xl border-slate-200 focus:border-[#5FA8D3]"
                    data-testid="patient-name"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm">Mobile Number *</Label>
                  <Input
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    className="mt-1.5 rounded-xl border-slate-200 focus:border-[#5FA8D3]"
                    data-testid="patient-phone"
                  />
                  {!bookingLimits.loading && !bookingLimits.canBook && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      <p className="font-semibold">Order Limit Reached</p>
                      <p>You have {bookingLimits.activeOrders} active diagnostic orders. Please wait for completion.</p>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-slate-600 text-sm">Email <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    value={patientInfo.email || ''}
                    onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                    placeholder="your@email.com (Optional)"
                    className="mt-1.5 rounded-xl border-slate-200 focus:border-orange-500"
                    data-testid="patient-email"
                  />
                  <p className="text-xs text-slate-400 mt-1">Optional - We&apos;ll send confirmations and test reports to this email.</p>
                </div>
              </div>
            </Card>

            {/* Sample Collection Type */}
            <Card className="p-5 rounded-2xl border-slate-200" data-testid="sample-collection-card">
              <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-orange-600" />
                Sample Collection
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCollectionType('home')}
                  data-testid="home-collection-btn"
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    collectionType === 'home'
                      ? 'border-[#5FA8D3] bg-[#5FA8D3]/5'
                      : 'border-slate-200 hover:border-[#5FA8D3]/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    collectionType === 'home' ? 'bg-[#5FA8D3]/20' : 'bg-slate-100'
                  }`}>
                    <Home className={`w-6 h-6 ${collectionType === 'home' ? 'text-[#5FA8D3]' : 'text-slate-500'}`} />
                  </div>
                  <h4 className="font-semibold text-[#1E293B]">Home Collection</h4>
                  <p className="text-xs text-slate-500 mt-1">Phlebotomist visits your home</p>
                  <p className="text-xs text-[#10B981] font-medium mt-2">₹50/visit (FREE for orders above ₹2000)</p>
                </button>
                
                <button
                  onClick={() => setCollectionType('center')}
                  data-testid="center-collection-btn"
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    collectionType === 'center'
                      ? 'border-[#5FA8D3] bg-[#5FA8D3]/5'
                      : 'border-slate-200 hover:border-[#5FA8D3]/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    collectionType === 'center' ? 'bg-[#5FA8D3]/20' : 'bg-slate-100'
                  }`}>
                    <MapPin className={`w-6 h-6 ${collectionType === 'center' ? 'text-[#5FA8D3]' : 'text-slate-500'}`} />
                  </div>
                  <h4 className="font-semibold text-[#1E293B]">Visit Center</h4>
                  <p className="text-xs text-slate-500 mt-1">Walk-in to our collection center</p>
                  <p className="text-xs text-slate-400 mt-2">Naigaon East Collection Center</p>
                </button>
              </div>
              
              {collectionType === 'home' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-slate-600 text-sm">Complete Address *</Label>
                    <Textarea
                      value={patientInfo.address}
                      onChange={(e) => setPatientInfo({ ...patientInfo, address: e.target.value })}
                      placeholder="Enter full address with landmark for home sample collection"
                      rows={2}
                      className="mt-1.5 rounded-xl border-slate-200 focus:border-orange-500"
                      data-testid="home-address"
                    />
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 text-xs text-orange-600">
                    <p className="font-medium">Home Collection Process:</p>
                    <ul className="mt-1 space-y-0.5 text-amber-600">
                      <li>• Our phlebotomist will call 30 mins before arrival</li>
                      <li>• Sample collected at your doorstep</li>
                      <li>• Reports sent via email within 24 hours</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {collectionType === 'center' && (
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-medium text-[#1E293B] mb-3">Collection Centers</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className="font-semibold text-sm text-[#1E293B]">Mango Health Labs - Naigaon</p>
                      <p className="text-xs text-slate-500 mt-1">Shop no 3, Sai Darshan, Near Don Bosco School, Naigaon East 401208</p>
                      <p className="text-xs text-slate-400">Mon-Sat: 7:00 AM - 7:00 PM</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Prescription Upload */}
            <Card className="p-5 rounded-2xl border-slate-200">
              <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#5FA8D3]" />
                Upload Prescription (Optional)
              </h3>
              <label className="cursor-pointer block">
                <div className={`px-4 py-6 border-2 border-dashed rounded-xl transition-colors text-center ${prescriptionUrl ? 'border-[#10B981] bg-[#10B981]/5' : 'border-slate-300 hover:border-[#5FA8D3]'}`}>
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </div>
                  ) : prescriptionUrl ? (
                    <div className="flex items-center justify-center gap-2 text-[#10B981]">
                      <CheckCircle2 className="w-5 h-5" />
                      {prescriptionFile?.name || 'Prescription uploaded'}
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p>Click to upload prescription image or PDF</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" data-testid="prescription-upload" />
              </label>
            </Card>

            {/* Continue Button */}
            <Button 
              onClick={goToStep2} 
              disabled={selectedTests.length === 0 && !prescriptionUrl}
              className="w-full bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] hover:from-[#4A90B8] hover:to-[#5FA8D3] text-white py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              data-testid="continue-to-otp"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: OTP Verification */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-md mx-auto">
            <Card className="p-8 rounded-3xl border-slate-200 shadow-lg">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#5FA8D3]/20 to-[#62B6CB]/20 rounded-2xl flex items-center justify-center mb-5">
                  <Shield className="w-10 h-10 text-[#5FA8D3]" />
                </div>
                <h2 className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Verify Your Phone
                </h2>
                <p className="text-slate-500 mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Enter the 6-digit code sent to +91 {patientInfo.phone}
                </p>
              </div>

              {mockOtp && otpMethod === 'mock' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-sm text-amber-800">Demo OTP: <span className="font-mono font-bold text-lg">{mockOtp}</span></p>
                </div>
              )}

              <div className="flex justify-center gap-2.5 mb-8">
                {otp.map((digit, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-[#5FA8D3] focus:ring-2 focus:ring-[#5FA8D3]/20"
                    data-testid={`otp-input-${idx}`}
                  />
                ))}
              </div>

              <Button
                onClick={verifyOtp}
                disabled={otp.join('').length !== 6 || otpLoading}
                className="w-full bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] hover:from-[#4A90B8] hover:to-[#5FA8D3] text-white py-6 rounded-full font-semibold"
                data-testid="verify-otp-btn"
              >
                {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
              </Button>

              <div className="text-center mt-5">
                {resendTimer > 0 ? (
                  <p className="text-sm text-slate-500">Resend OTP in {resendTimer}s</p>
                ) : (
                  <button onClick={sendOtp} disabled={otpLoading} className="text-sm text-[#5FA8D3] font-medium hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goToStep1} className="flex-1 rounded-full border-slate-200" data-testid="back-to-tests">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tests
              </Button>
              <Button 
                variant="outline" 
                onClick={saveCartForLater} 
                className="flex-1 rounded-full border-amber-300 text-amber-600 hover:bg-amber-50" 
                data-testid="save-for-later-btn"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Save for Later
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Booking Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 text-[#10B981] mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Phone verified: +91 {patientInfo.phone}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Complete Your Booking
              </h1>
            </div>

            {/* Selected Tests Summary */}
            <Card className="p-5 rounded-2xl bg-[#5FA8D3]/5 border-[#5FA8D3]/20">
              <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#5FA8D3]" />
                Selected Tests ({selectedTests.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedTests.map((test) => (
                  <span key={test} className="bg-white text-[#1E293B] px-3 py-1 rounded-full text-sm border border-[#5FA8D3]/20">
                    {test}
                  </span>
                ))}
              </div>
            </Card>

            {/* Preferred Date */}
            <Card className="p-5 rounded-2xl border-slate-200">
              <Label className="flex items-center gap-2 mb-3 font-medium text-[#1E293B]">
                <Clock className="w-4 h-4 text-[#5FA8D3]" />
                Preferred Date *
              </Label>
              <CalendarComponent
                mode="single"
                selected={preferredDate}
                onSelect={setPreferredDate}
                disabled={(date) => date < new Date()}
                className="rounded-xl border border-slate-200"
              />
            </Card>

            {/* Time Slot Selection */}
            <Card className="p-5 rounded-2xl border-slate-200">
              <Label className="flex items-center gap-2 mb-3 font-medium text-[#1E293B]">
                <Clock className="w-4 h-4 text-[#5FA8D3]" />
                Preferred Time Slot
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.value}
                    onClick={() => setPreferredTimeSlot(slot.value)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      preferredTimeSlot === slot.value 
                        ? 'border-[#5FA8D3] bg-[#5FA8D3]/10 text-[#5FA8D3]' 
                        : 'border-slate-200 hover:border-[#5FA8D3]/30 text-slate-600'
                    }`}
                    data-testid={`time-slot-${slot.value}`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Test Preparation Instructions */}
            {getSelectedTestPreparations().length > 0 && (
              <Card className="p-5 rounded-2xl bg-amber-50 border-amber-200">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Test Preparation Instructions
                </h3>
                <div className="space-y-2">
                  {getSelectedTestPreparations().map((prep, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-amber-100">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${prep.fasting ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {prep.fasting ? `${prep.hours}hr Fasting` : 'No Fasting'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{prep.test}</p>
                        <p className="text-xs text-slate-600">{prep.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Address */}
            <Card className="p-5 rounded-2xl border-slate-200">
              <Label className="flex items-center gap-2 mb-2 text-slate-600">
                Address (for Home Visit)
              </Label>
              <Textarea
                value={patientInfo.address}
                onChange={(e) => setPatientInfo({ ...patientInfo, address: e.target.value })}
                placeholder="Enter your address for home sample collection"
                className="min-h-20 rounded-xl border-slate-200 focus:border-[#5FA8D3]"
                data-testid="patient-address"
              />
            </Card>

            {/* Payment Method */}
            <Card className="p-5 rounded-2xl border-slate-200">
              <Label className="flex items-center gap-2 mb-3 font-medium text-[#1E293B]">
                <CreditCard className="w-4 h-4 text-orange-500" />
                Payment Method
              </Label>
              <div className="grid grid-cols-1 gap-3">
                {/* Option 1: Cash on Collection */}
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                    paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'
                  }`}
                  data-testid="payment-cod"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-sm font-semibold text-[#1E293B] block">Pay Cash</span>
                    <span className="text-xs text-slate-500">Pay at time of sample collection</span>
                  </div>
                  {paymentMethod === 'cod' && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                </button>

                {/* Option 2: QR/Card on Collection */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                    paymentMethod === 'card' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'
                  }`}
                  data-testid="payment-card"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-sm font-semibold text-[#1E293B] block">QR / Card Payment</span>
                    <span className="text-xs text-slate-500">Pay via UPI/Card at time of collection</span>
                  </div>
                  {paymentMethod === 'card' && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                </button>

                {/* Option 3: Cashfree Online Payment */}
                <button
                  onClick={() => setPaymentMethod('cashfree')}
                  className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                    paymentMethod === 'cashfree' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'
                  }`}
                  data-testid="payment-cashfree"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-sm font-semibold text-[#1E293B] block">Pay Online Now</span>
                    <span className="text-xs text-slate-500">UPI, Cards, Net Banking</span>
                  </div>
                  <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    5% OFF
                  </div>
                  {paymentMethod === 'cashfree' && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                </button>
              </div>
            </Card>

            {/* Pricing Summary Card */}
            {collectionType === 'home' && (
              <Card className="p-5 rounded-2xl border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/30" data-testid="pricing-summary-card">
                <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[#5FA8D3]" />
                  Home Collection Charges
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Home Visit Fee</span>
                    <span className="text-sm font-medium text-slate-700">₹50</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Discount (Orders above ₹2000)</span>
                    <span className="text-sm font-medium text-[#10B981]">-₹50</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t-2 border-[#5FA8D3]/20 mt-2">
                    <span className="font-semibold text-[#1E293B]">Home Visit Total</span>
                    <span className="font-bold text-lg text-[#5FA8D3]">₹0*</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">*Home collection is FREE for test orders above ₹2000. A ₹50 fee applies for orders below ₹2000.</p>
                </div>
              </Card>
            )}

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !preferredDate || !bookingLimits.canBook}
              className="w-full bg-gradient-to-r from-[#10B981] to-[#62B6CB] hover:from-[#0D9668] hover:to-[#5FA8D3] text-white py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              data-testid="book-now-btn"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
              ) : !bookingLimits.canBook ? (
                <><AlertTriangle className="w-5 h-5 mr-2" /> Complete Existing Orders First</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Confirm Booking</>
              )}
            </Button>
          </div>
        )}
        </div> {/* Close white container */}
      </main>
        </>
      )}
      
      {/* Bottom Navigation */}
      <BottomNav />

      {/* Wishlist Dialog */}
      {showWishlist && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowWishlist(false)}>
          <div 
            className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white relative">
              <button 
                onClick={() => setShowWishlist(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 fill-white" />
                <h2 className="text-xl font-bold">My Wishlist</h2>
              </div>
              <p className="text-white/80 text-sm mt-1">{wishlist.length} saved tests</p>
            </div>
            
            {/* Wishlist Items */}
            <div className="max-h-[50vh] overflow-y-auto p-4">
              {wishlist.length === 0 ? (
                <div className="text-center py-10">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No tests saved yet</p>
                  <p className="text-xs text-slate-400 mt-1">Tap the heart icon on any test to save it</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wishlist.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">₹{item.price}</span>
                        <button
                          onClick={() => {
                            setSelectedTests([item.name]);
                            setCurrentStep(1);
                            setShowWishlist(false);
                            toast.success(`${item.name} added to cart!`);
                          }}
                          className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => toggleWishlist(item)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {wishlist.length > 0 && (
              <div className="p-4 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setSelectedTests(wishlist.map(w => w.name));
                    setCurrentStep(1);
                    setShowWishlist(false);
                    toast.success('All wishlist items added to cart!');
                  }}
                  className="w-full bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] text-white font-bold py-3 rounded-xl"
                >
                  Add All to Cart ({wishlist.length} items)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cashfree Payment Dialog */}
      <CashfreeCheckout
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        orderDetails={{
          type: 'lab_test',
          amount: orderTotal,
          productId: `LAB_${Date.now()}`,
          customerName: patientInfo.name,
          customerEmail: patientInfo.email,
          customerPhone: patientInfo.phone
        }}
        onPaymentSuccess={handlePaymentSuccess}
        allowCOD={true}
        returnPath="/mango"
      />

      {/* Test Details Modal */}
      {selectedTestDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTestDetails(null)}>
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Green Gradient Header */}
            <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white relative">
              {/* Close Button */}
              <button 
                onClick={() => setSelectedTestDetails(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Test Badge */}
              <span className="inline-block bg-emerald-800/60 text-white text-xs font-bold px-3 py-1.5 rounded-md mb-3">
                Test Details
              </span>
              
              {/* Test Name */}
              <h2 className="text-2xl font-bold mb-4 pr-10">{selectedTestDetails.name}</h2>
              
              {/* Price Section */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">MRP</p>
                  <span className="text-white/60 line-through text-lg">₹{selectedTestDetails.originalPrice}</span>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Our Price</p>
                  <span className="text-4xl font-bold">₹{selectedTestDetails.price}</span>
                </div>
                <span className="bg-yellow-400 text-slate-800 text-sm font-bold px-3 py-1.5 rounded-lg">
                  {selectedTestDetails.discount}% OFF
                </span>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="p-6">
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">About This Test</h3>
                <p className="text-slate-700 leading-relaxed">{selectedTestDetails.description}</p>
              </div>
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Reports Within</p>
                      <p className="text-lg font-bold text-slate-800">{selectedTestDetails.reportTime}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Tests Included</p>
                      <p className="text-lg font-bold text-slate-800">{selectedTestDetails.testsIncluded} Parameter{selectedTestDetails.testsIncluded > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Home Sample Collection</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>NABL Certified Labs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Free Report Consultation</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-bold py-4"
                  onClick={() => setSelectedTestDetails(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#F4A43A] to-[#E48C1C] hover:from-[#E48C1C] hover:to-[#F4A43A] text-white font-bold py-4 shadow-lg"
                  onClick={() => {
                    handleTestSelect(selectedTestDetails);
                    setSelectedTestDetails(null);
                  }}
                >
                  Add to Cart - ₹{selectedTestDetails.price}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proton;
