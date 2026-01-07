import React, { useState } from 'react';
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
import { ArrowLeft, ArrowRight, Upload, Plus, X, Heart, FlaskConical, Scan, Activity, ShoppingCart, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';
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
    'Doppler Scan',
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
    'Bilirubin (Total, Direct, Indirect)',
    'Alkaline Phosphatase (ALP)',
    'GGT (Gamma GT)',
    'Total Protein',
    'Albumin',
    'Globulin',
    'A/G Ratio',
    // Lipid Profile
    'Total Cholesterol',
    'HDL Cholesterol',
    'LDL Cholesterol',
    'VLDL Cholesterol',
    'Triglycerides',
    'Lipid Profile (Complete)',
    // Thyroid Tests
    'TSH',
    'T3 (Total & Free)',
    'T4 (Total & Free)',
    'Thyroid Profile (T3, T4, TSH)',
    'Anti-TPO Antibodies',
    'Thyroglobulin',
    // Hormone Tests
    'AMH (Anti-Mullerian Hormone)',
    'Beta HCG',
    'Prolactin',
    'FSH',
    'LH',
    'Estradiol (E2)',
    'Progesterone',
    'Testosterone',
    'Cortisol',
    'DHEA-S',
    'Insulin (Fasting)',
    // Vitamin & Mineral Tests
    'Vitamin D (25-OH)',
    'Vitamin B12',
    'Folic Acid',
    'Iron Studies (Serum Iron, TIBC, Ferritin)',
    'Serum Ferritin',
    'Serum Calcium',
    'Serum Magnesium',
    'Serum Zinc',
    // Cardiac Markers
    'Troponin I',
    'Troponin T',
    'CPK (Creatine Phosphokinase)',
    'CPK-MB',
    'LDH',
    'BNP/NT-proBNP',
    'Homocysteine',
    // Inflammation & Infection Markers
    'CRP (C-Reactive Protein)',
    'hs-CRP',
    'Procalcitonin',
    'Blood Culture & Sensitivity',
    'Widal Test',
    'Dengue NS1 Antigen',
    'Dengue IgG/IgM',
    'Malaria (Rapid/Smear)',
    'Typhidot',
    // Coagulation Profile
    'PT/INR',
    'APTT',
    'Bleeding Time',
    'Clotting Time',
    'D-Dimer',
    'Fibrinogen',
    // Autoimmune Tests
    'ANA (Antinuclear Antibody)',
    'RA Factor',
    'Anti-CCP',
    'ASO Titre',
    // Cancer Markers
    'PSA (Total & Free)',
    'CA-125',
    'CA 19-9',
    'CEA',
    'AFP (Alpha Fetoprotein)',
    // Pregnancy Tests
    'Ante Natal Profile',
    'Dual Marker',
    'Triple Marker',
    'Quadruple Marker',
    'TORCH Panel',
    // Miscellaneous
    'G6PD',
    'Serum Amylase',
    'Serum Lipase',
    'Ammonia',
    'Lactate'
  ],
  urine: [
    'Urine Routine & Microscopy',
    'Urine Complete Examination',
    'Urine Culture & Sensitivity',
    '24-Hour Urine Protein',
    '24-Hour Urine Creatinine',
    'Urine Microalbumin',
    'Urine Albumin-Creatinine Ratio (ACR)',
    'Urine Sugar (Fasting/PP)',
    'Urine Ketone Bodies',
    'Urine Bile Salts & Pigments',
    'Urine Pregnancy Test',
    'Urine pH',
    'Urine Specific Gravity',
    'Urine RBC',
    'Urine WBC/Pus Cells',
    'Urine Casts',
    'Urine Crystals',
    'Urine Epithelial Cells',
    'Urine Bence Jones Protein',
    'Urobilinogen',
    '24-Hour Urine Calcium',
    '24-Hour Urine Uric Acid'
  ],
  sputum: [
    'Sputum Routine Examination',
    'Sputum Culture & Sensitivity',
    'Sputum AFB (Acid Fast Bacilli)',
    'Sputum for TB (Gene Xpert)',
    'Sputum Cytology',
    'Sputum for Fungal Elements',
    'Sputum Gram Stain'
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
    'Master Health Checkup'
  ]
};


const Proton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Step state: 1 = Select Tests, 2 = Enter Details & Payment
  const [currentStep, setCurrentStep] = useState(1);
  
  const [selectedTests, setSelectedTests] = useState([]);
  const [customTest, setCustomTest] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('imaging');

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

  const goToStep2 = () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }
    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const goToStep1 = () => {
    setCurrentStep(1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!patientInfo.name || !patientInfo.phone) {
      toast.error('Please fill name and mobile number');
      return;
    }

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
        `Mobile: ${patientInfo.phone}`
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
                onClick={() => currentStep === 2 ? goToStep1() : navigate('/')}
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/saez5270_5_20260107_021040_0002.jpg" 
                alt="Proton Diagnostics" 
                className="h-14 w-auto"
                data-testid="proton-logo"
              />
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${currentStep === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <FlaskConical className="w-4 h-4" />
                <span className="hidden sm:inline">Tests</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${currentStep === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Details & Pay</span>
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
              <p className="font-body text-muted-foreground text-sm">Choose from imaging or pathology tests</p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                📍 A-3, Sai Darshan, Near Don Bosco High School, Naigaon East
              </p>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeTab === 'imaging' ? 'default' : 'outline'}
                onClick={() => setActiveTab('imaging')}
                className="rounded-full"
                data-testid="imaging-tab"
              >
                <Scan className="w-4 h-4 mr-2" />
                Imaging
              </Button>
              <Button
                variant={activeTab === 'pathology' ? 'default' : 'outline'}
                onClick={() => setActiveTab('pathology')}
                className="rounded-full"
                data-testid="pathology-tab"
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                Pathology
              </Button>
            </div>

            {/* Imaging Section */}
            {activeTab === 'imaging' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-500" />
                    ECG
                  </h3>
                  <div className="space-y-1">
                    {imagingTests.ecg.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    Sonography
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {imagingTests.sonography.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Pathology Section */}
            {activeTab === 'pathology' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-red-600">🩸 Blood Tests ({pathologyTests.blood.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-[400px] overflow-y-auto pr-2">
                    {pathologyTests.blood.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-amber-600">🧪 Urine Tests ({pathologyTests.urine.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-[300px] overflow-y-auto pr-2">
                    {pathologyTests.urine.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-teal-600">🫁 Sputum Tests ({pathologyTests.sputum.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {pathologyTests.sputum.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-indigo-600">📦 Health Packages</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {pathologyTests.packages.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Manual Entry */}
            <Card className="p-4 border-2 border-indigo-200 bg-indigo-50/50">
              <h3 className="font-heading text-lg font-semibold mb-3">
                <Plus className="w-5 h-5 inline mr-2" />
                Add Custom Test
              </h3>
              <div className="flex gap-2">
                <Input
                  value={customTest}
                  onChange={(e) => setCustomTest(e.target.value)}
                  placeholder="Enter test name not in list..."
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTest()}
                  data-testid="custom-test-input"
                  className="h-12 rounded-xl"
                />
                <Button 
                  onClick={addCustomTest}
                  className="h-12 px-6 rounded-xl"
                  data-testid="add-custom-test-button"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </Card>

            {/* Selected Tests Summary */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                Selected Tests ({selectedTests.length})
              </h3>
              
              {selectedTests.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No tests selected yet</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto" data-testid="selected-tests-list">
                  {selectedTests.map(test => (
                    <span 
                      key={test} 
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                    >
                      {test}
                      <button 
                        onClick={() => removeTest(test)}
                        className="hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* Upload Prescription */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3">Upload Prescription (Optional)</h3>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                {prescriptionFile ? (
                  <div className="space-y-1">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-sm font-medium truncate">{prescriptionFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {uploading ? 'Uploading...' : 'Uploaded successfully'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="prescription-upload"
                      data-testid="prescription-upload-input"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('prescription-upload').click()}
                      data-testid="prescription-upload-button"
                    >
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Continue Button */}
            <Button 
              className="w-full rounded-full py-6 text-lg font-medium bg-indigo-600 hover:bg-indigo-700" 
              onClick={goToStep2}
              disabled={selectedTests.length === 0}
              data-testid="continue-to-details-btn"
            >
              Continue to Details & Payment
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: Enter Details & Payment */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-1 text-foreground">Step 2: Your Details</h1>
              <p className="font-body text-muted-foreground text-sm">Enter your details and select payment method</p>
            </div>

            {/* Booking Summary */}
            <Card className="p-4 bg-indigo-50/50 border-indigo-200">
              <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-600" />
                Booking Summary ({selectedTests.length} tests)
              </h3>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                {selectedTests.map(test => (
                  <span key={test} className="inline-block px-2 py-1 bg-white rounded text-sm border border-indigo-100">
                    {test}
                  </span>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToStep1}
                className="mt-3 text-indigo-600 hover:text-indigo-700"
              >
                ← Edit Tests
              </Button>
            </Card>

            {/* Preferred Date */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3">Preferred Date</h3>
              <CalendarComponent
                mode="single"
                selected={preferredDate}
                onSelect={(date) => {
                  if (date) {
                    setPreferredDate(date);
                  }
                }}
                disabled={(date) => date < new Date()}
                className="rounded-xl border mx-auto"
                data-testid="preferred-date-calendar"
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                Selected: <strong>{preferredDate ? format(preferredDate, 'dd MMMM yyyy') : 'No date selected'}</strong>
              </p>
            </Card>

            {/* Patient Details */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-4">Patient Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient-name" className="text-sm font-medium">Full Name *</Label>
                  <Input
                    id="patient-name"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                    placeholder="Enter your full name"
                    data-testid="patient-name-input"
                    className="h-12 rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-phone" className="text-sm font-medium">Mobile Number *</Label>
                  <Input
                    id="patient-phone"
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({...patientInfo, phone: e.target.value})}
                    placeholder="Enter 10-digit mobile number"
                    data-testid="patient-phone-input"
                    className="h-12 rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-address" className="text-sm font-medium">Address (Optional)</Label>
                  <Textarea
                    id="patient-address"
                    value={patientInfo.address}
                    onChange={(e) => setPatientInfo({...patientInfo, address: e.target.value})}
                    placeholder="Enter your address"
                    data-testid="patient-address-input"
                    className="min-h-20 rounded-xl mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-4">Payment Method</h3>
              <div className="space-y-3">
                <label 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}
                  data-testid="payment-cod"
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <Banknote className={`w-8 h-8 ${paymentMethod === 'cod' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium">Cash on Visit</p>
                    <p className="text-sm text-muted-foreground">Pay at the diagnostic center</p>
                  </div>
                </label>
                
                <label 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'qr_card' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}
                  data-testid="payment-qr-card"
                >
                  <input
                    type="radio"
                    name="payment"
                    value="qr_card"
                    checked={paymentMethod === 'qr_card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <CreditCard className={`w-8 h-8 ${paymentMethod === 'qr_card' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium">QR Pay / Card on Visit</p>
                    <p className="text-sm text-muted-foreground">Pay via UPI or Card at center</p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Book Tests Button */}
            <Button 
              className="w-full rounded-full py-6 text-lg font-medium bg-green-600 hover:bg-green-700" 
              onClick={handleSubmit}
              disabled={loading || !patientInfo.name || !patientInfo.phone}
              data-testid="submit-order-button"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Book Tests via WhatsApp
                </>
              )}
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Your booking details will be sent to Proton Diagnostics via WhatsApp
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Proton;
