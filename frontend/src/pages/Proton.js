import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Upload, Plus, X, Heart, FlaskConical, Scan, Activity, ShoppingCart, CreditCard, Banknote, CheckCircle2, Shield, Phone, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '+917039040040';

// Imaging Tests
const imagingTests = {
  ecg: ['ECG (Electrocardiogram)'],
  sonography: [
    'Early Scan',
    'NT Scan (Nuchal Translucency)',
    'Growth Scan',
    'USG Pelvis',
    'Follicular Monitoring'
  ]
};

// Pathology Tests - Comprehensive List
const pathologyTests = {
  blood: [
    // Routine Blood Tests
    'CBC (Complete Blood Count)',
    'Hemoglobin (Hb)',
    'ESR (Erythrocyte Sedimentation Rate)',
    'Blood Group & Rh Factor',
    'Platelet Count',
    'PCV (Packed Cell Volume)',
    'RBC Count',
    'WBC Count (Total & Differential)',
    'Peripheral Blood Smear',
    // Blood Sugar Tests
    'FBS (Fasting Blood Sugar)',
    'PPBS (Post Prandial Blood Sugar)',
    'Random Blood Sugar (RBS)',
    'HbA1c (Glycated Hemoglobin)',
    'GTT (Glucose Tolerance Test)',
    'Fructosamine',
    // Kidney Function Tests
    'Creatinine',
    'Blood Urea',
    'BUN (Blood Urea Nitrogen)',
    'Uric Acid',
    'eGFR (Estimated GFR)',
    'Electrolytes (Na, K, Cl)',
    // Liver Function Tests
    'SGPT (ALT)',
    'SGOT (AST)',
    'Alkaline Phosphatase (ALP)',
    'Bilirubin (Total, Direct, Indirect)',
    'Total Protein',
    'Albumin',
    'Globulin',
    'A/G Ratio',
    'GGT (Gamma GT)',
    // Lipid Profile
    'Total Cholesterol',
    'Triglycerides',
    'HDL Cholesterol',
    'LDL Cholesterol',
    'VLDL Cholesterol',
    'Non-HDL Cholesterol',
    'TC/HDL Ratio',
    'LDL/HDL Ratio',
    // Thyroid Profile
    'TSH',
    'T3 (Total)',
    'T4 (Total)',
    'Free T3 (FT3)',
    'Free T4 (FT4)',
    'Thyroid Antibodies (TPO, TG)',
    // Diabetes Monitoring
    'Fasting Insulin',
    'C-Peptide',
    'HOMA-IR',
    // Cardiac Markers
    'Troponin I/T',
    'CPK-MB',
    'CRP (C-Reactive Protein)',
    'hs-CRP',
    'Homocysteine',
    'BNP/NT-proBNP',
    'LDH',
    'D-Dimer',
    // Anemia Profile
    'Iron Studies (Serum Iron, TIBC, Ferritin)',
    'Vitamin B12',
    'Folate (Folic Acid)',
    'Reticulocyte Count',
    // Coagulation Tests
    'PT/INR',
    'aPTT',
    'Bleeding Time (BT)',
    'Clotting Time (CT)',
    'Fibrinogen',
    // Hormone Tests
    'LH (Luteinizing Hormone)',
    'FSH (Follicle Stimulating Hormone)',
    'Prolactin',
    'Estradiol (E2)',
    'Progesterone',
    'Testosterone (Total & Free)',
    'DHEA-S',
    'Cortisol',
    'AMH (Anti-Mullerian Hormone)',
    'Beta-hCG',
    // Tumor Markers
    'PSA (Prostate Specific Antigen)',
    'CA-125',
    'CA 19-9',
    'CEA',
    'AFP (Alpha-Fetoprotein)',
    // Vitamin & Mineral Tests
    'Vitamin D (25-OH)',
    'Vitamin B1 (Thiamine)',
    'Vitamin B6',
    'Calcium (Total & Ionized)',
    'Phosphorus',
    'Magnesium',
    'Zinc',
    // Arthritis Profile
    'RA Factor',
    'Anti-CCP',
    'ANA (Antinuclear Antibody)',
    // Infection Tests
    'HIV 1 & 2',
    'HBsAg (Hepatitis B)',
    'HCV (Hepatitis C)',
    'VDRL/RPR (Syphilis)',
    'Dengue NS1/IgM/IgG',
    'Malaria (Antigen & Smear)',
    'Typhoid (Widal Test)',
    'Blood Culture',
    // Pancreatic Tests
    'Amylase',
    'Lipase'
  ],
  urine: [
    'Urine Routine & Microscopy',
    'Urine Culture & Sensitivity',
    'Urine Albumin',
    'Urine Creatinine',
    'Albumin/Creatinine Ratio (ACR)',
    'Urine Sugar',
    'Urine Ketones',
    'Urine Protein',
    'Urine Bilirubin',
    'Urine Urobilinogen',
    'Urine pH',
    'Urine Specific Gravity',
    'Urine Microalbumin',
    '24-Hour Urine Protein',
    '24-Hour Urine Creatinine',
    '24-Hour Urine Calcium',
    '24-Hour Urine Uric Acid',
    '24-Hour Urine Sodium',
    '24-Hour Urine Potassium',
    'Urine Pregnancy Test',
    'Urine Drug Screen',
    'Urine Osmolality'
  ],
  sputum: [
    'Sputum AFB (Acid-Fast Bacilli)',
    'Sputum Culture & Sensitivity',
    'Sputum Gram Stain',
    'Sputum Cytology',
    'Sputum for Malignant Cells',
    'GeneXpert MTB/RIF',
    'Sputum Fungal Culture'
  ],
  packages: [
    'Diabetes Screening Package',
    'Diabetes Basic Package',
    'Diabetes Advance Package',
    'Proton Basic Package',
    'Proton Total Package',
    'Proton Xclusive Package',
    'Cardiac Risk Profile',
    'Anemia Profile',
    'Arthritis Panel',
    'Fever Panel',
    'Pre-Operative Profile',
    'Master Health Checkup',
    'Home Visit (0-5 km)',
    'Home Visit (5-10 km)',
    'Home Visit (10-15 km)'
  ]
};


const Proton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Step state: 1 = Select Tests, 2 = OTP Verification, 3 = Enter Details & Payment
  const [currentStep, setCurrentStep] = useState(1);
  
  const [selectedTests, setSelectedTests] = useState([]);
  const [customTest, setCustomTest] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('imaging');

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const toggleTest = (test) => {
    setSelectedTests(prev => 
      prev.includes(test) 
        ? prev.filter(t => t !== test)
        : [...prev, test]
    );
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
      if (user) {
        formData.append('user_id', user.id);
      }

      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(user && { Authorization: `Bearer ${localStorage.getItem('token')}` })
        }
      });

      setPrescriptionUrl(response.data.url);
      toast.success('Prescription uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload prescription');
    } finally {
      setUploading(false);
    }
  };

  // OTP Functions
  const sendOtp = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/otp/send`, {
        phone: patientInfo.phone,
        service: 'proton'
      });
      
      setOtpSent(true);
      setMockOtp(response.data.mock_otp);
      setResendTimer(30);
      toast.success('OTP sent successfully!');
      
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
      const response = await axios.post(`${API}/otp/verify`, {
        phone: patientInfo.phone,
        otp: otpValue,
        service: 'proton'
      });
      
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
    
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const goToStep2 = () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test');
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
    setOtpSent(false);
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
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone
      };

      if (user) {
        await axios.post(`${API}/diagnostics`, orderData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      const paymentText = paymentMethod === 'cod' ? 'Cash on Visit' : 'QR Pay / Card on Visit';
      const testsList = selectedTests.map(t => `• ${t}`).join('\n');
      
      const messageLines = [
        '*New Proton Diagnostics Booking*',
        '',
        '*Tests Requested:*',
        testsList,
        '',
        `*Preferred Date:* ${format(preferredDate, 'dd MMM yyyy')}`,
        `*Payment Method:* ${paymentText}`,
        patientInfo.address ? `*Address:* ${patientInfo.address}` : '',
        prescriptionUrl ? `*Prescription:* ${prescriptionUrl}` : '',
        '',
        '*Patient Details:*',
        `Name: ${patientInfo.name}`,
        `Mobile: ${patientInfo.phone} (Verified)`
      ].filter(Boolean).join('\n');
      
      const encodedMessage = encodeURIComponent(messageLines);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
      
      toast.success('Booking sent via WhatsApp!');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to process booking');
    } finally {
      setLoading(false);
    }
  };

  const TestCheckbox = ({ test }) => (
    <div className="flex items-center space-x-2 py-1">
      <Checkbox
        id={test}
        checked={selectedTests.includes(test)}
        onCheckedChange={() => toggleTest(test)}
      />
      <label htmlFor={test} className="font-body text-sm cursor-pointer hover:text-indigo-600">
        {test}
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => currentStep > 1 ? goToStep1() : navigate('/')}
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/cxfylb8j_2_20260106_160656_0000.jpg" 
                alt="Proton Diagnostics" 
                className="h-14 w-auto"
                data-testid="proton-logo"
              />
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${currentStep === 1 ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-600'}`}>
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                <span className="hidden sm:inline">Tests</span>
              </div>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${currentStep === 2 ? 'bg-indigo-600 text-white' : currentStep > 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                <span className="hidden sm:inline">Verify</span>
              </div>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Book</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* STEP 1: Select Tests */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-1 text-foreground">Step 1: Select Tests</h1>
              <p className="text-sm text-muted-foreground">Choose from imaging, pathology tests, or add custom tests</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('imaging')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'imaging' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                data-testid="tab-imaging"
              >
                <Scan className="w-4 h-4 inline mr-1" />
                Imaging
              </button>
              <button
                onClick={() => setActiveTab('pathology')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'pathology' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                data-testid="tab-pathology"
              >
                <FlaskConical className="w-4 h-4 inline mr-1" />
                Pathology
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'imaging' && (
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-indigo-700 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      ECG
                    </h4>
                    {imagingTests.ecg.map(test => <TestCheckbox key={test} test={test} />)}
                  </div>
                  <div>
                    <h4 className="font-medium text-indigo-700 mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Sonography
                    </h4>
                    {imagingTests.sonography.map(test => <TestCheckbox key={test} test={test} />)}
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'pathology' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-medium text-indigo-700 mb-3">Blood Tests</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 max-h-64 overflow-y-auto">
                    {pathologyTests.blood.map(test => <TestCheckbox key={test} test={test} />)}
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-medium text-indigo-700 mb-3">Urine Tests</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 max-h-40 overflow-y-auto">
                    {pathologyTests.urine.map(test => <TestCheckbox key={test} test={test} />)}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium text-indigo-700 mb-3">Sputum Tests</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    {pathologyTests.sputum.map(test => <TestCheckbox key={test} test={test} />)}
                  </div>
                </Card>

                <Card className="p-4 bg-indigo-50">
                  <h4 className="font-medium text-indigo-700 mb-3">Health Packages</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    {pathologyTests.packages.map(test => <TestCheckbox key={test} test={test} />)}
                  </div>
                </Card>
              </div>
            )}

            {/* Custom Test Entry */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Add Custom Test
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter test name"
                  value={customTest}
                  onChange={(e) => setCustomTest(e.target.value)}
                  className="flex-1"
                  data-testid="custom-test-input"
                />
                <Button onClick={addCustomTest} className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-custom-test">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Selected Tests */}
            {selectedTests.length > 0 && (
              <Card className="p-4 border-indigo-600">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                  Selected Tests ({selectedTests.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTests.map((test) => (
                    <div key={test} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                      <span>{test}</span>
                      <button onClick={() => removeTest(test)} className="hover:text-indigo-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Patient Info for OTP */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                Your Details (for OTP verification)
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                    placeholder="Enter your name"
                    data-testid="patient-name"
                  />
                </div>
                <div>
                  <Label>Mobile Number *</Label>
                  <Input
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    data-testid="patient-phone"
                  />
                </div>
                <div>
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    value={patientInfo.email || ''}
                    onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                    placeholder="your@email.com"
                    data-testid="patient-email"
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll send confirmations, test reports, and status updates to this email.</p>
                </div>
              </div>
            </Card>

            {/* Prescription Upload */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                Upload Prescription (Optional)
              </h3>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-indigo-600 transition-colors">
                    {prescriptionFile ? prescriptionFile.name : 'Click to upload'}
                  </div>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" data-testid="prescription-upload" />
                </label>
                {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
                {prescriptionUrl && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              </div>
            </Card>

            {/* Continue Button */}
            <Button 
              onClick={goToStep2} 
              disabled={selectedTests.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
              data-testid="continue-to-otp"
            >
              Continue to Verify
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: OTP Verification */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-indigo-600" />
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-2">Verify Your Phone</h1>
              <p className="text-muted-foreground">
                We've sent a 6-digit OTP to <span className="font-medium text-foreground">+91 {patientInfo.phone}</span>
              </p>
            </div>

            {/* Mock OTP Display */}
            {mockOtp && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Test Mode:</span>
                  <span>Your OTP is <strong className="text-xl">{mockOtp}</strong></span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">In production, this will be sent via SMS</p>
              </Card>
            )}

            {/* OTP Input */}
            <Card className="p-6">
              <Label className="block text-center mb-4">Enter 6-digit OTP</Label>
              <div className="flex justify-center gap-2 sm:gap-3 mb-6">
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
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold"
                    data-testid={`otp-input-${idx}`}
                  />
                ))}
              </div>

              <Button
                onClick={verifyOtp}
                disabled={otp.join('').length !== 6 || otpLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12"
                data-testid="verify-otp-btn"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Verify OTP
                  </>
                )}
              </Button>

              <div className="text-center mt-4">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500">Resend OTP in {resendTimer}s</p>
                ) : (
                  <Button variant="link" onClick={sendOtp} disabled={otpLoading} className="text-indigo-600">
                    Resend OTP
                  </Button>
                )}
              </div>
            </Card>

            <Button variant="outline" onClick={goToStep1} className="w-full" data-testid="back-to-tests">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tests
            </Button>
          </div>
        )}

        {/* STEP 3: Details & Booking */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-1 text-foreground">Step 3: Booking Details</h1>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Phone verified: +91 {patientInfo.phone}</span>
              </div>
            </div>

            {/* Selected Tests Summary */}
            <Card className="p-4 bg-indigo-50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                Selected Tests ({selectedTests.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedTests.map((test) => (
                  <span key={test} className="bg-white text-indigo-800 px-2 py-1 rounded text-xs">
                    {test}
                  </span>
                ))}
              </div>
            </Card>

            {/* Preferred Date */}
            <Card className="p-4">
              <Label className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-indigo-600" />
                Preferred Date *
              </Label>
              <CalendarComponent
                mode="single"
                selected={preferredDate}
                onSelect={setPreferredDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </Card>

            {/* Address (Optional for Home Visit) */}
            <Card className="p-4">
              <Label className="flex items-center gap-2 mb-2">
                Address (for Home Visit)
              </Label>
              <Textarea
                value={patientInfo.address}
                onChange={(e) => setPatientInfo({ ...patientInfo, address: e.target.value })}
                placeholder="Enter your address if you selected Home Visit package"
                className="min-h-20"
                data-testid="patient-address"
              />
            </Card>

            {/* Payment Method */}
            <Card className="p-4">
              <Label className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Payment Method
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    paymentMethod === 'cod' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                  }`}
                  data-testid="payment-cod"
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-sm font-medium">Cash on Visit</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    paymentMethod === 'card' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                  }`}
                  data-testid="payment-card"
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-sm font-medium">QR / Card on Visit</span>
                </button>
              </div>
            </Card>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !preferredDate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
              data-testid="book-now-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Book via WhatsApp
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Proton;
