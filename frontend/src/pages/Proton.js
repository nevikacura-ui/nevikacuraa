import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Upload, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '+917039040040';

const commonTests = [
  'Complete Blood Count (CBC)',
  'Lipid Profile',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Thyroid Profile (T3, T4, TSH)',
  'HbA1c (Diabetes)',
  'Vitamin D',
  'Vitamin B12',
  'Blood Sugar (Fasting & PP)',
  'Urine Routine',
  'ECG',
  'X-Ray Chest',
  'Ultrasound Abdomen'
];

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
    email: user?.email || ''
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

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
      toast.error('Please fill all required fields');
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
      const whatsappMessage = `*New Proton Diagnostics Order*%0A%0A*Tests Requested:*%0A• ${testsList}%0A%0A*Preferred Date:* ${format(preferredDate, 'dd MMM yyyy')}%0A${prescriptionUrl ? `*Prescription:* ${prescriptionUrl}%0A` : ''}%0A*Patient Details:*%0AName: ${patientInfo.name}%0APhone: ${patientInfo.phone}${patientInfo.email ? `%0AEmail: ${patientInfo.email}` : ''}`;
      
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
              className="h-12 w-auto"
              data-testid="proton-logo"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl mb-2 text-foreground">Diagnostic Tests</h1>
          <p className="font-body text-muted-foreground">Select tests and book your appointment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6">
              <h2 className="font-heading text-2xl font-semibold mb-4">Select Tests</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commonTests.map(test => (
                  <div 
                    key={test} 
                    className="flex items-center space-x-2"
                    data-testid={`test-checkbox-${test.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Checkbox
                      id={test}
                      checked={selectedTests.includes(test)}
                      onCheckedChange={() => toggleTest(test)}
                    />
                    <label
                      htmlFor={test}
                      className="font-body text-sm cursor-pointer"
                    >
                      {test}
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Label className="font-heading mb-2">Add Custom Test</Label>
                <div className="flex gap-2">
                  <Input
                    value={customTest}
                    onChange={(e) => setCustomTest(e.target.value)}
                    placeholder="Enter test name"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTest()}
                    data-testid="custom-test-input"
                    className="h-12 rounded-xl"
                  />
                  <Button 
                    onClick={addCustomTest}
                    data-testid="add-custom-test-button"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-heading text-2xl font-semibold mb-4">Upload Prescription (Optional)</h2>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                {prescriptionFile ? (
                  <div className="space-y-2">
                    <p className="font-body text-sm text-foreground">{prescriptionFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {uploading ? 'Uploading...' : 'Uploaded successfully'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-body text-muted-foreground mb-4">Click to upload prescription</p>
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

            <Card className="p-6">
              <h2 className="font-heading text-2xl font-semibold mb-4">Preferred Date</h2>
              <CalendarComponent
                mode="single"
                selected={preferredDate}
                onSelect={setPreferredDate}
                disabled={(date) => date < new Date()}
                className="rounded-xl border"
                data-testid="preferred-date-calendar"
              />
            </Card>

            <Card className="p-6">
              <h2 className="font-heading text-2xl font-semibold mb-4">Patient Details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient-name">Full Name *</Label>
                  <Input
                    id="patient-name"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                    data-testid="patient-name-input"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-phone">Phone Number *</Label>
                  <Input
                    id="patient-phone"
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({...patientInfo, phone: e.target.value})}
                    data-testid="patient-phone-input"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-email">Email (Optional)</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    value={patientInfo.email}
                    onChange={(e) => setPatientInfo({...patientInfo, email: e.target.value})}
                    data-testid="patient-email-input"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="font-heading text-xl font-semibold mb-4">Selected Tests</h3>
              {selectedTests.length > 0 ? (
                <div className="space-y-2 mb-6" data-testid="selected-tests-list">
                  {selectedTests.map(test => (
                    <div 
                      key={test} 
                      className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-lg"
                      data-testid={`selected-test-${test.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <span className="font-body text-sm">{test}</span>
                      <button 
                        onClick={() => removeTest(test)}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid={`remove-test-${test.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-muted-foreground text-sm mb-6" data-testid="no-tests-message">
                  No tests selected
                </p>
              )}

              <div className="border-t border-border pt-4 space-y-2 text-sm font-body">
                <p><strong>Preferred Date:</strong> {format(preferredDate, 'dd MMM yyyy')}</p>
                {prescriptionFile && <p><strong>Prescription:</strong> Uploaded</p>}
              </div>

              <Button 
                className="w-full mt-6 rounded-full py-6" 
                onClick={handleSubmit}
                disabled={loading || selectedTests.length === 0}
                data-testid="submit-order-button"
              >
                {loading ? 'Processing...' : 'Book Tests via WhatsApp'}
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Proton;