import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, ArrowRight, Upload, Plus, X, Heart, FlaskConical, Scan, Activity, 
  ShoppingCart, CreditCard, Banknote, CheckCircle2, Shield, Phone, Loader2, 
  Clock, AlertTriangle, Droplets, TestTube, Stethoscope, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============================================
// DESIGN SYSTEM - Serene Care Pastel Theme
// ============================================
const theme = {
  primary: '#5FA8D3',
  secondary: '#62B6CB',
  accent: '#FFB4A2',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
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
    { num: 2, label: 'Verify', icon: Shield },
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
const TestCategoryCard = ({ icon: Icon, title, count, color, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      p-4 rounded-2xl border-2 transition-all duration-300 text-left w-full
      ${isActive 
        ? `border-[${color}] bg-[${color}]/5 shadow-lg` 
        : 'border-slate-200 hover:border-[#5FA8D3]/30 bg-white hover:shadow-md'
      }
    `}
    style={isActive ? { borderColor: color, backgroundColor: `${color}10` } : {}}
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <h3 className="font-semibold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
        <p className="text-xs text-slate-500">{count} tests</p>
      </div>
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
  
  const [currentStep, setCurrentStep] = useState(1);
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

  // Check for pre-selected tests from Glydex
  useEffect(() => {
    const testsParam = searchParams.get('tests');
    const fromParam = searchParams.get('from');
    if (testsParam && fromParam === 'glydex') {
      const preSelectedTests = decodeURIComponent(testsParam).split(',');
      setSelectedTests(preSelectedTests);
      setActiveTab('pathology');
      setActiveCategory('diabetes');
      toast.success(`${preSelectedTests.length} test${preSelectedTests.length > 1 ? 's' : ''} pre-selected from Glydex`);
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
    setCurrentStep(2);
    window.scrollTo(0, 0);
    sendOtp();
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
        patient_address: patientInfo.address || null,
        payment_method: paymentMethod
      };
      await axios.post(`${API}/diagnostics`, orderData, {
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      toast.success('Test booking confirmed! SMS sent to you and Proton Diagnostics.');
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => currentStep > 1 ? goToStep1() : navigate('/')}
                className="rounded-full hover:bg-[#5FA8D3]/10"
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
              </Button>
              <img 
                src="/proton-logo.png" 
                alt="Proton Diagnostics" 
                className="h-12 sm:h-14 w-auto"
                data-testid="proton-logo"
              />
            </div>
            <StepProgress currentStep={currentStep} />
          </div>
        </div>
      </header>

      {/* How It Works Banner */}
      <div className="bg-gradient-to-r from-[#5FA8D3]/10 to-[#62B6CB]/10 border-b border-[#5FA8D3]/20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-5 h-5 text-[#5FA8D3]" />
            <h3 className="font-semibold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>How to Book Diagnostic Tests</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { num: 1, title: 'Select Tests', desc: 'Choose tests or upload prescription' },
              { num: 2, title: 'Fill Details', desc: 'Enter name, phone, address' },
              { num: 3, title: 'Phlebotomist Call', desc: 'We confirm timing & location' },
              { num: 4, title: 'Reports Ready', desc: 'Download from My Orders', success: true }
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-2 p-3 bg-white/80 rounded-xl">
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* STEP 1: Select Tests */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#1E293B] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
                    Found {filteredTests.length} tests matching "{testSearchTerm}"
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
                  No tests found matching "{testSearchTerm}". Try a different search term or add as custom test below.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 rounded-2xl border-slate-200">
                  <h4 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-500" />
                    ECG
                  </h4>
                  {imagingTests.ecg.map(test => (
                    <TestCheckbox key={test} test={test} checked={selectedTests.includes(test)} onToggle={() => toggleTest(test)} />
                  ))}
                </Card>
                
                <Card className="p-5 rounded-2xl border-slate-200">
                  <h4 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    Sonography
                  </h4>
                  {imagingTests.sonography.map(test => (
                    <TestCheckbox key={test} test={test} checked={selectedTests.includes(test)} onToggle={() => toggleTest(test)} />
                  ))}
                </Card>
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
                  <Label className="text-slate-600 text-sm">Email (Optional)</Label>
                  <Input
                    type="email"
                    value={patientInfo.email || ''}
                    onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                    placeholder="your@email.com"
                    className="mt-1.5 rounded-xl border-slate-200 focus:border-[#5FA8D3]"
                    data-testid="patient-email"
                  />
                  <p className="text-xs text-slate-400 mt-1">We'll send confirmations and test reports to this email.</p>
                </div>
              </div>
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
              Continue to Verify
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
    </div>
  );
};

export default Proton;
