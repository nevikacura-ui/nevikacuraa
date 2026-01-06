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
import { ArrowLeft, Upload, Plus, X, Heart, FlaskConical, Scan, Activity, ShoppingCart } from 'lucide-react';
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

// Pathology Tests - Comprehensive list
const pathologyTests = {
  blood: [
    'Complete Blood Count (CBC)',
    'Hemoglobin (Hb)',
    'Platelet Count',
    'ESR (Erythrocyte Sedimentation Rate)',
    'Blood Group & Rh Typing',
    'Peripheral Blood Smear',
    'Reticulocyte Count',
    'Prothrombin Time (PT/INR)',
    'APTT',
    'D-Dimer',
    'Fibrinogen',
    'Blood Sugar Fasting',
    'Blood Sugar PP (Post Prandial)',
    'Blood Sugar Random',
    'HbA1c (Glycated Hemoglobin)',
    'Glucose Tolerance Test (GTT)',
    'Fasting Insulin',
    'Lipid Profile',
    'Total Cholesterol',
    'HDL Cholesterol',
    'LDL Cholesterol',
    'Triglycerides',
    'VLDL',
    'Liver Function Test (LFT)',
    'SGOT/AST',
    'SGPT/ALT',
    'Alkaline Phosphatase (ALP)',
    'GGT (Gamma GT)',
    'Total Bilirubin',
    'Direct Bilirubin',
    'Total Protein',
    'Albumin',
    'Globulin',
    'Kidney Function Test (KFT/RFT)',
    'Blood Urea',
    'Serum Creatinine',
    'BUN (Blood Urea Nitrogen)',
    'Uric Acid',
    'eGFR',
    'Electrolytes (Na, K, Cl)',
    'Sodium',
    'Potassium',
    'Chloride',
    'Calcium',
    'Phosphorus',
    'Magnesium',
    'Thyroid Profile (T3, T4, TSH)',
    'Free T3',
    'Free T4',
    'TSH',
    'Anti-TPO Antibodies',
    'Thyroglobulin',
    'Vitamin D (25-OH)',
    'Vitamin B12',
    'Folic Acid',
    'Iron Studies',
    'Serum Iron',
    'TIBC',
    'Ferritin',
    'Transferrin Saturation',
    'CRP (C-Reactive Protein)',
    'hs-CRP',
    'Rheumatoid Factor (RA Factor)',
    'ASO Titre',
    'ANA (Anti-Nuclear Antibody)',
    'Anti-dsDNA',
    'Complement C3',
    'Complement C4',
    'HBsAg (Hepatitis B)',
    'Anti-HCV (Hepatitis C)',
    'HIV 1 & 2',
    'VDRL/RPR',
    'Dengue NS1 Antigen',
    'Dengue IgG/IgM',
    'Malaria Antigen',
    'Typhoid (Widal Test)',
    'Typhidot IgM/IgG',
    'Chikungunya IgM',
    'Leptospira IgM',
    'PSA (Prostate Specific Antigen)',
    'Free PSA',
    'CA-125',
    'CA 19-9',
    'CEA',
    'AFP (Alpha Fetoprotein)',
    'Beta HCG',
    'LH (Luteinizing Hormone)',
    'FSH (Follicle Stimulating Hormone)',
    'Prolactin',
    'Estradiol (E2)',
    'Progesterone',
    'Testosterone',
    'DHEA-S',
    'Cortisol',
    'Amylase',
    'Lipase',
    'LDH',
    'CPK (Creatine Phosphokinase)',
    'CPK-MB',
    'Troponin I/T',
    'BNP/NT-proBNP',
    'Homocysteine'
  ],
  urine: [
    'Urine Routine & Microscopy',
    'Urine Culture & Sensitivity',
    'Urine Albumin',
    'Urine Sugar',
    'Urine Protein',
    'Urine Creatinine',
    'Urine Microalbumin',
    'Albumin Creatinine Ratio (ACR)',
    '24-Hour Urine Protein',
    '24-Hour Urine Creatinine',
    'Urine Ketones',
    'Urine Bilirubin',
    'Urine Urobilinogen',
    'Urine pH',
    'Urine Specific Gravity',
    'Urine RBC',
    'Urine WBC/Pus Cells',
    'Urine Epithelial Cells',
    'Urine Casts',
    'Urine Crystals',
    'Urine Pregnancy Test (UPT)',
    'Urine Drug Screen'
  ],
  sputum: [
    'Sputum Routine Examination',
    'Sputum Culture & Sensitivity',
    'Sputum for AFB (Acid Fast Bacilli)',
    'Sputum for TB (GeneXpert/CBNAAT)',
    'Sputum Gram Stain',
    'Sputum Cytology',
    'Sputum for Fungal Elements'
  ],
  stool: [
    'Stool Routine & Microscopy',
    'Stool Culture & Sensitivity',
    'Stool Occult Blood',
    'Stool for Ova & Cysts',
    'Stool for Reducing Substances',
    'Stool pH',
    'Stool Fat (Sudan Stain)',
    'Stool for Rotavirus Antigen',
    'Stool Calprotectin',
    'H. Pylori Stool Antigen'
  ]
};

const Proton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('imaging');
  const [showCart, setShowCart] = useState(false);

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

  const handleSubmit = async () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }

    if (!patientInfo.name || !patientInfo.phone) {
      toast.error('Please fill name and phone number');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        tests: selectedTests,
        prescription_url: prescriptionUrl || null,
        preferred_date: format(preferredDate, 'yyyy-MM-dd'),
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_email: patientInfo.email || null
      };

      if (user) {
        await axios.post(`${API}/diagnostics`, orderData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      const testsList = selectedTests.join('%0A• ');
      const whatsappMessage = `*New Proton Diagnostics Order*%0A%0A*Tests Requested:*%0A• ${testsList}%0A%0A*Preferred Date:* ${format(preferredDate, 'dd MMM yyyy')}%0A${patientInfo.address ? `*Address:* ${patientInfo.address}%0A` : ''}${prescriptionUrl ? `*Prescription:* ${prescriptionUrl}%0A` : ''}%0A*Patient Details:*%0AName: ${patientInfo.name}%0APhone: ${patientInfo.phone}${patientInfo.email ? `%0AEmail: ${patientInfo.email}` : ''}`;
      
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`, '_blank');
      
      toast.success('Test booking sent via WhatsApp!');
      
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
                onClick={() => navigate('/')}
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_healthcare-trio/artifacts/9na5ps29_7_20260102_012214_0003.png" 
                alt="Proton Diagnostics" 
                className="h-16 w-auto"
                data-testid="proton-logo"
              />
            </div>
            <Button 
              onClick={() => setShowCart(!showCart)}
              className="relative rounded-full bg-indigo-600 hover:bg-indigo-700"
              data-testid="cart-toggle-button"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Tests
              {selectedTests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {selectedTests.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-2 text-foreground">Diagnostic Tests</h1>
          <p className="font-body text-muted-foreground">Select tests from our comprehensive catalog</p>
          <p className="font-body text-sm text-muted-foreground mt-1">
            📍 A-3, Sai Darshan, Near Don Bosco High School, Naigaon East
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Selection - Left Side */}
          <div className="lg:col-span-2 space-y-6">
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
                {/* ECG */}
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

                {/* Sonography */}
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
                {/* Blood Tests */}
                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-red-600">
                    🩸 Blood Tests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-[400px] overflow-y-auto pr-2">
                    {pathologyTests.blood.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>

                {/* Urine Tests */}
                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-yellow-600">
                    🧪 Urine Tests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-[300px] overflow-y-auto pr-2">
                    {pathologyTests.urine.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>

                {/* Sputum Tests */}
                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-green-600">
                    💨 Sputum Tests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {pathologyTests.sputum.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>

                {/* Stool Tests */}
                <Card className="p-4">
                  <h3 className="font-heading text-lg font-semibold mb-3 text-amber-700">
                    🔬 Stool Tests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {pathologyTests.stool.map(test => (
                      <TestCheckbox key={test} test={test} />
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Manual Entry */}
            <Card className="p-4">
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
                  className="rounded-xl"
                  data-testid="add-custom-test-button"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </Card>
          </div>

          {/* Cart & Order - Right Side */}
          <div className={`lg:col-span-1 space-y-4 ${showCart ? 'block' : 'hidden lg:block'}`}>
            {/* Selected Tests */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-semibold">Selected Tests</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowCart(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {selectedTests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="no-tests-message">
                  No tests selected yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto" data-testid="selected-tests-list">
                  {selectedTests.map(test => (
                    <div 
                      key={test} 
                      className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-lg text-sm"
                    >
                      <span className="truncate flex-1">{test}</span>
                      <button 
                        onClick={() => removeTest(test)}
                        className="text-muted-foreground hover:text-red-500 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm font-medium mt-3 pt-3 border-t">
                Total: <span className="text-indigo-600">{selectedTests.length} tests</span>
              </p>
            </Card>

            {/* Preferred Date */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3">Preferred Date</h3>
              <CalendarComponent
                mode="single"
                selected={preferredDate}
                onSelect={setPreferredDate}
                disabled={(date) => date < new Date()}
                className="rounded-xl border w-full"
                data-testid="preferred-date-calendar"
              />
            </Card>

            {/* Upload Prescription */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3">Prescription (Optional)</h3>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                {prescriptionFile ? (
                  <div className="space-y-1">
                    <p className="text-sm truncate">{prescriptionFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {uploading ? 'Uploading...' : '✓ Uploaded'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
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
                      size="sm"
                      onClick={() => document.getElementById('prescription-upload').click()}
                      data-testid="prescription-upload-button"
                    >
                      Upload
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Patient Details */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3">Patient Details</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="patient-name" className="text-sm">Full Name *</Label>
                  <Input
                    id="patient-name"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                    data-testid="patient-name-input"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-phone" className="text-sm">Mobile Number *</Label>
                  <Input
                    id="patient-phone"
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({...patientInfo, phone: e.target.value})}
                    data-testid="patient-phone-input"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-address" className="text-sm">Address</Label>
                  <Textarea
                    id="patient-address"
                    value={patientInfo.address}
                    onChange={(e) => setPatientInfo({...patientInfo, address: e.target.value})}
                    placeholder="Enter your address"
                    data-testid="patient-address-input"
                    className="min-h-16 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-email" className="text-sm">Email (Optional)</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    value={patientInfo.email}
                    onChange={(e) => setPatientInfo({...patientInfo, email: e.target.value})}
                    data-testid="patient-email-input"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </Card>

            {/* Submit Button */}
            <Button 
              className="w-full rounded-full py-6 bg-indigo-600 hover:bg-indigo-700 text-lg font-medium" 
              onClick={handleSubmit}
              disabled={loading || selectedTests.length === 0}
              data-testid="submit-order-button"
            >
              {loading ? 'Processing...' : 'Book Tests via WhatsApp'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Proton;
