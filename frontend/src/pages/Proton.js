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
  Clock, AlertTriangle, Droplets, TestTube, Stethoscope, ChevronRight, Search,
  Home, MapPin, Calendar, User, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============================================
// DESIGN SYSTEM - Vibrant Pink/Purple/Blue Theme (Zepto Style)
// ============================================
const theme = {
  primary: '#F24797',      // Vibrant Magenta
  primaryLight: '#FFB5E6', // Light Pink
  secondary: '#8A2BE2',    // Blue Violet/Purple
  accent: '#6A0DAD',       // Dark Purple
  background: '#F24797',   // Vibrant Magenta
  surface: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#555555',
  border: '#FF99CC',       // Pink border
  success: '#10B981',
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
    'Proton Basic Package', 'Proton Total Package', 'Proton Xclusive Package',
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
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
    if (!patientInfo.email || !patientInfo.email.includes('@')) {
      toast.error('Please enter a valid email address for report delivery');
      return;
    }
    // Skip OTP step - directly go to booking step
    // OTP verification disabled to reduce costs. Email is used for report delivery.
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
    // Validate email
    if (!patientInfo.email || !patientInfo.email.includes('@')) {
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

  // Test categories for quick navigation
  const testCategories = [
    { id: 'pregnancy', title: 'Pregnancy & OBGYN', icon: Heart, color: '#EC4899', tests: ['Dual / Double Marker', 'Quadruple Marker', 'ANC (Ante Natal Profile)', 'Beta-hCG', 'AMH (Anti-Mullerian Hormone)', 'Hormonal Basic', 'Hormonal Advance', 'LH (Luteinizing Hormone)', 'FSH (Follicle Stimulating Hormone)', 'Prolactin', 'Estradiol (E2)', 'Progesterone', 'Serum Testosterone'] },
    { id: 'diabetes', title: 'Diabetes Tests', icon: Activity, color: '#3B82F6', tests: ['Diabetes Basic', 'Diabetes Screening', 'Diabetes Advance', 'FBS (Fasting Blood Sugar)', 'PPBS (Post Prandial Blood Sugar)', 'Random Blood Sugar (RBS)', 'HbA1c (Glycated Hemoglobin)', 'OGTT - 3 Sample', 'Fasting Insulin', 'C-Peptide'] },
    { id: 'common', title: 'Common Blood Tests', icon: Droplets, color: '#EF4444', tests: ['CBC (Complete Blood Count)', 'Blood Group & Rh Factor', 'Hemoglobin (Hb)', 'ESR (Erythrocyte Sedimentation Rate)', 'LFT (Liver Function Test)', 'RFT (Renal Function Test)', 'Lipid Profile', 'Creatinine', 'Uric Acid', 'SGPT (ALT)', 'SGOT (AST)', 'Serum Amylase', 'Lipase', 'LDH', 'Serum Electrolytes', 'UPCR'] },
    { id: 'thyroid', title: 'Thyroid Profile', icon: TestTube, color: '#8B5CF6', tests: ['TSH', 'Thyroid Profile - Free', 'Thyroid Profile - Total', 'T3 (Total)', 'T4 (Total)'] },
    { id: 'vitamins', title: 'Vitamins & Minerals', icon: Stethoscope, color: '#10B981', tests: ['Vitamin D', 'Vitamin B12', 'G6PD', 'Serum PSA', 'Iron Studies (Serum Iron, TIBC, Ferritin)', 'Calcium (Total & Ionized)'] },
  ];

  const getCurrentCategoryTests = () => {
    const category = testCategories.find(c => c.id === activeCategory);
    return category ? category.tests : [];
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

  // Popular packages for the landing page
  const popularPackages = [
    { 
      id: 'diabetes-basic', 
      name: 'Diabetes Screening', 
      tests: ['FBS', 'PPBS', 'HbA1c'], 
      originalPrice: 999, 
      price: 599, 
      discount: 40,
      parameters: 3,
      reportTime: '6 hours'
    },
    { 
      id: 'thyroid-profile', 
      name: 'Thyroid Profile', 
      tests: ['TSH', 'T3', 'T4', 'FT3', 'FT4'], 
      originalPrice: 1499, 
      price: 799, 
      discount: 47,
      parameters: 5,
      reportTime: '12 hours'
    },
    { 
      id: 'lipid-profile', 
      name: 'Lipid Profile', 
      tests: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL'], 
      originalPrice: 899, 
      price: 499, 
      discount: 44,
      parameters: 5,
      reportTime: '6 hours'
    },
    { 
      id: 'liver-function', 
      name: 'Liver Function Test', 
      tests: ['SGPT', 'SGOT', 'Bilirubin', 'Albumin', 'ALP'], 
      originalPrice: 1199, 
      price: 649, 
      discount: 46,
      parameters: 10,
      reportTime: '12 hours'
    },
    { 
      id: 'kidney-function', 
      name: 'Kidney Function Test', 
      tests: ['Creatinine', 'Urea', 'Uric Acid', 'Electrolytes'], 
      originalPrice: 999, 
      price: 549, 
      discount: 45,
      parameters: 8,
      reportTime: '12 hours'
    }
  ];

  const popularTests = [
    { id: 'cbc', name: 'CBC (Complete Blood Count)', originalPrice: 399, price: 199, discount: 50, reportTime: '6 hours' },
    { id: 'vitamin-d', name: 'Vitamin D', originalPrice: 1499, price: 699, discount: 53, reportTime: '24 hours' },
    { id: 'vitamin-b12', name: 'Vitamin B12', originalPrice: 999, price: 499, discount: 50, reportTime: '24 hours' },
    { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', originalPrice: 699, price: 399, discount: 43, reportTime: '12 hours' },
    { id: 'tsh', name: 'TSH', originalPrice: 499, price: 249, discount: 50, reportTime: '12 hours' }
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-fuchsia-500 to-pink-500">
      {/* Shared Service Header with Zepto-style tabs */}
      <ServiceHeader />

      {/* ========== ZEPTO-STYLE HERO SECTION ========== */}
      {currentStep === 0 ? (
        <>
          {/* Hero Banner - Vibrant Pink/Purple Theme for Proton (Zepto Style) */}
          <div className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                {/* Left Content */}
                <div className="flex-1 text-white z-10">
                  <h1 className="text-2xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Blood Test At Home
                  </h1>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-semibold">in 60 MINS</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 w-fit">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Accurate Reports in 06 HRS</span>
                  </div>
                </div>
                
                {/* Right Image */}
                <div className="hidden md:block relative w-48 h-48">
                  <img 
                    src="https://images.unsplash.com/photo-1653379670999-f7f03d702125?w=400&h=400&fit=crop" 
                    alt="Happy patient"
                    className="w-full h-full object-cover rounded-2xl shadow-2xl"
                  />
                </div>
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          {/* Search Bar */}
          <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-20">
            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-pink-300">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search for tests or checkups"
                  value={testSearchTerm}
                  onChange={(e) => setTestSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-4 text-lg rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:ring-pink-200"
                  data-testid="hero-search"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {testSearchTerm && filteredTests.length > 0 && (
                <div className="mt-3 max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                  <div className="p-2 bg-pink-50 border-b border-slate-200 text-xs text-slate-600 font-medium">
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
                        className="flex items-center gap-3 p-3 hover:bg-pink-50 cursor-pointer transition-colors w-full text-left"
                      >
                        <span className="text-lg">{getTestIcon(test)}</span>
                        <span className="text-sm text-slate-800 font-medium">{test}</span>
                        <Plus className="w-4 h-4 text-pink-600 ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Promo Banner - Vibrant Pink/Purple theme */}
          <div className="max-w-6xl mx-auto px-4 mt-4">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <span className="text-xl">🎉</span>
                </div>
                <div className="text-white">
                  <p className="font-bold text-lg">Get 15% OFF</p>
                  <p className="text-sm opacity-90">Use code: PROTON15</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-white text-purple-600 hover:bg-purple-50 rounded-full font-bold"
                onClick={() => {
                  navigator.clipboard.writeText('PROTON15');
                  toast.success('Coupon code copied!');
                }}
              >
                Copy Code
              </Button>
            </div>
          </div>

          {/* Trust Badges - Vibrant Pink/Purple Style */}
          <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="flex justify-between items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { icon: Shield, title: 'Certified Lab', color: 'text-purple-600', bg: 'bg-purple-100' },
                { icon: Clock, title: '6 AM - 10 PM', color: 'text-fuchsia-600', bg: 'bg-fuchsia-100' },
                { icon: CheckCircle2, title: '4.9/5 on Google', color: 'text-pink-600', bg: 'bg-pink-100' },
                { icon: Home, title: 'Home Collection', color: 'text-violet-600', bg: 'bg-violet-100' }
              ].map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm min-w-fit">
                  <div className={`w-8 h-8 rounded-full ${badge.bg} flex items-center justify-center`}>
                    <badge.icon className={`w-4 h-4 ${badge.color}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{badge.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Booked Checkups - Vibrant Pink/Purple Theme Cards */}
          <div className="max-w-6xl mx-auto px-4 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Most Booked Checkups
              </h2>
              <button 
                onClick={() => setCurrentStep(1)}
                className="text-white/80 font-semibold text-sm flex items-center gap-1 hover:text-white"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {popularPackages.map((pkg) => (
                <div 
                  key={pkg.id}
                  className="min-w-[280px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex-shrink-0 hover:shadow-xl transition-all"
                  data-testid={`package-${pkg.id}`}
                >
                  {/* Vibrant Pink/Purple Header */}
                  <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 p-4 text-white relative">
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
                    <span className="inline-block mt-2 bg-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                      {pkg.discount}% Off
                    </span>
                  </div>
                  
                  {/* Info Section */}
                  <div className="p-4 bg-slate-50">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-purple-500" />
                        <span><strong>{pkg.parameters}</strong> parameters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-fuchsia-500" />
                        <span>Reports: <strong>{pkg.reportTime}</strong></span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-lg border-purple-300 text-purple-600 hover:bg-purple-50 font-semibold"
                        onClick={() => {
                          toast.info(`${pkg.name}: ${pkg.tests.join(', ')}`);
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 text-white font-semibold"
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Booked Tests - Vibrant Pink/Purple Theme Cards */}
          <div className="max-w-6xl mx-auto px-4 mt-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Most Booked Tests
              </h2>
              <button 
                onClick={() => setCurrentStep(1)}
                className="text-white/80 font-semibold text-sm flex items-center gap-1 hover:text-white"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {popularTests.map((test) => (
                <div 
                  key={test.id}
                  className="min-w-[240px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex-shrink-0 hover:shadow-xl transition-all"
                  data-testid={`test-${test.id}`}
                >
                  {/* Vibrant Pink/Purple Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-4 text-white relative">
                    <div className="absolute top-2 right-2">
                      <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded">
                        Test
                      </span>
                    </div>
                    <h3 className="font-bold text-base mb-2 pr-12 leading-tight">{test.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-white/70 line-through text-sm">₹{test.originalPrice}</span>
                      <span className="text-xl font-bold">₹{test.price}</span>
                    </div>
                    <span className="inline-block mt-2 bg-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                      {test.discount}% Off
                    </span>
                  </div>
                  
                  {/* Info Section */}
                  <div className="p-4 bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span>Reports within <strong>{test.reportTime}</strong></span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-lg border-purple-300 text-purple-600 hover:bg-purple-50 font-semibold text-xs"
                        onClick={() => {
                          toast.info(`${test.name} - Single test`);
                        }}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 text-white font-semibold text-xs"
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
          <div className="max-w-6xl mx-auto px-4 pb-24">
            <Button
              onClick={() => setCurrentStep(1)}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white py-6 rounded-2xl text-lg font-bold shadow-xl"
              data-testid="browse-all-tests-btn"
            >
              <FlaskConical className="w-5 h-5 mr-2" />
              Browse All Tests & Packages
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Original Test Selection Flow */}
          {/* How It Works Banner */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-[#5FA8D3]/20">
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

      {/* Trust Badges Section - Dark Pink Theme */}
      <div className="py-4 border-b border-pink-200/30 bg-pink-950/50 backdrop-blur-sm" data-testid="proton-trust-badges">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'trusted-labs', icon: Shield, title: 'Trusted &', subtitle: 'Accredited Labs', gradient: 'from-pink-600 to-rose-600', bg: 'bg-pink-100' },
              { id: 'doctor-curated', icon: Stethoscope, title: 'Doctor', subtitle: 'Curated Packages', gradient: 'from-pink-700 to-rose-700', bg: 'bg-pink-100' },
              { id: 'home-sample', icon: Clock, title: 'Home Sample', subtitle: 'Collection', gradient: 'from-rose-600 to-pink-600', bg: 'bg-rose-100' },
              { id: 'fast-reports', icon: CheckCircle2, title: 'Accurate &', subtitle: 'Fast Reports', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-100' }
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

      {/* Consultation Help Banner - Dark Pink Theme */}
      <div className="bg-gradient-to-r from-pink-700 to-rose-700 text-white" data-testid="consultation-help-banner">
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
              className="bg-white text-pink-700 hover:bg-pink-50 rounded-full font-semibold flex-shrink-0"
              data-testid="book-doctor-btn"
            >
              Consult Doctor
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Your Health Trends - Toggle Section */}
        {patientInfo.phone && patientInfo.phone.length === 10 && (
          <div className="mb-6">
            <button
              onClick={() => setShowTrends(!showTrends)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl border border-pink-200 hover:shadow-md transition-all"
              data-testid="show-trends-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-pink-800">Your Health Trends</h3>
                  <p className="text-xs text-pink-600">View your previous test results & trends</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-pink-600 transition-transform ${showTrends ? 'rotate-90' : ''}`} />
            </button>
            
            {showTrends && (
              <div className="mt-4">
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
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Select Your Tests
              </h1>
              <p className="text-slate-500" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Choose from imaging, pathology tests, or upload your prescription
              </p>
            </div>

            {/* Search Tests */}
            <Card className="p-4 rounded-2xl border-slate-200 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search tests... (e.g., CBC, Thyroid, HbA1c)"
                  value={testSearchTerm}
                  onChange={(e) => setTestSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 focus:border-[#5FA8D3] focus:ring-[#5FA8D3]/20"
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
            <div className="py-4 bg-gradient-to-br from-pink-100/50 via-rose-50/30 to-white rounded-2xl px-4 -mx-4" data-testid="womens-care-proton-section">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👩‍⚕️</span>
                  <h2 className="text-lg font-bold text-slate-800">Holistic Women Care</h2>
                  <span className="px-2 py-0.5 bg-pink-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                    ✨ Evara
                  </span>
                </div>
                <button 
                  onClick={() => navigate('/evara')}
                  className="text-sm text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
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
                    <div className="w-24 h-24 rounded-2xl overflow-hidden mb-2 border-2 border-pink-200 shadow-sm group-hover:border-pink-400 group-hover:shadow-md transition-all duration-300">
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

            {/* Pathology Tab */}
            {activeTab === 'pathology' && (
              <div className="space-y-6">
                {/* Category Quick Select */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {testCategories.map((cat) => (
                    <TestCategoryCard
                      key={cat.id}
                      icon={cat.icon}
                      title={cat.title}
                      count={cat.tests.length}
                      color={cat.color}
                      isActive={activeCategory === cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                    />
                  ))}
                </div>

                {/* Tests Grid */}
                <Card className="p-5 rounded-2xl border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-[#1E293B] mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {testCategories.find(c => c.id === activeCategory)?.icon && (
                      React.createElement(testCategories.find(c => c.id === activeCategory).icon, { 
                        className: "w-5 h-5", 
                        style: { color: testCategories.find(c => c.id === activeCategory)?.color } 
                      })
                    )}
                    {testCategories.find(c => c.id === activeCategory)?.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {getCurrentCategoryTests().map(test => (
                      <TestCheckbox 
                        key={test} 
                        test={test} 
                        checked={selectedTests.includes(test)}
                        onToggle={() => toggleTest(test)}
                      />
                    ))}
                  </div>
                </Card>

                {/* More Test Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-5 rounded-2xl border-slate-200">
                    <h4 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-amber-500" />
                      Urine Tests
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {pathologyTests.urine.map(test => (
                        <TestCheckbox key={test} test={test} checked={selectedTests.includes(test)} onToggle={() => toggleTest(test)} />
                      ))}
                    </div>
                  </Card>
                  
                  <Card className="p-5 rounded-2xl border-slate-200">
                    <h4 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                      <TestTube className="w-4 h-4 text-teal-500" />
                      Health Packages
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {pathologyTests.packages.map(test => (
                        <TestCheckbox key={test} test={test} checked={selectedTests.includes(test)} onToggle={() => toggleTest(test)} />
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Imaging Tab */}
            {activeTab === 'imaging' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card id="ecg-section" className="p-5 rounded-2xl border-slate-200">
                    <h4 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-500" />
                      ECG
                    </h4>
                    {imagingTests.ecg.map(test => (
                      <TestCheckbox key={test} test={test} checked={selectedTests.includes(test)} onToggle={() => toggleTest(test)} />
                    ))}
                  </Card>
                  
                  <Card id="sonography-section" className="p-5 rounded-2xl border-slate-200">
                    <h4 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      Sonography
                    </h4>
                    {imagingTests.sonography.map(test => (
                      <TestCheckbox key={test} test={test} checked={selectedTests.includes(test)} onToggle={() => toggleTest(test)} />
                    ))}
                  </Card>
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
                    placeholder="your@email.com"
                    className="mt-1.5 rounded-xl border-slate-200 focus:border-[#5FA8D3]"
                    data-testid="patient-email"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Required - We&apos;ll send confirmations and test reports to this email.</p>
                </div>
              </div>
            </Card>

            {/* Sample Collection Type */}
            <Card className="p-5 rounded-2xl border-slate-200" data-testid="sample-collection-card">
              <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#5FA8D3]" />
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
                      className="mt-1.5 rounded-xl border-slate-200 focus:border-[#5FA8D3]"
                      data-testid="home-address"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                    <p className="font-medium">Home Collection Process:</p>
                    <ul className="mt-1 space-y-0.5 text-blue-600">
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
                      <p className="font-semibold text-sm text-[#1E293B]">Proton Diagnostics - Naigaon</p>
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

            <Button variant="outline" onClick={goToStep1} className="w-full rounded-full border-slate-200" data-testid="back-to-tests">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tests
            </Button>
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
                <CreditCard className="w-4 h-4 text-[#5FA8D3]" />
                Payment Method
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'cod' ? 'border-[#5FA8D3] bg-[#5FA8D3]/10' : 'border-slate-200 hover:border-[#5FA8D3]/30'
                  }`}
                  data-testid="payment-cod"
                >
                  <Banknote className="w-6 h-6 text-[#5FA8D3]" />
                  <span className="text-sm font-medium text-[#1E293B]">Cash on Visit</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'card' ? 'border-[#5FA8D3] bg-[#5FA8D3]/10' : 'border-slate-200 hover:border-[#5FA8D3]/30'
                  }`}
                  data-testid="payment-card"
                >
                  <CreditCard className="w-6 h-6 text-[#5FA8D3]" />
                  <span className="text-sm font-medium text-[#1E293B]">QR / Card on Visit</span>
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
      </main>
        </>
      )}
      
      {/* Bottom Navigation */}
      <BottomNav />

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
        returnPath="/proton"
      />
    </div>
  );
};

export default Proton;
