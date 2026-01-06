import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Upload, Plus, Minus, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '+917039030030';

const Pharmacy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([{ name: '', quantity: 1 }]);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const addMedicine = () => {
    setMedicines([...medicines, { name: '', quantity: 1 }]);
  };

  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
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
    const validMedicines = medicines.filter(m => m.name.trim());
    
    if (validMedicines.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }

    if (!patientInfo.name || !patientInfo.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        medicines: validMedicines,
        prescription_url: prescriptionUrl || null,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_email: patientInfo.email || null,
        delivery_address: deliveryAddress || null
      };

      if (user) {
        await axios.post(`${API}/pharmacy`, orderData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      const medicinesList = validMedicines.map(m => `${m.name} (Qty: ${m.quantity})`).join('%0A• ');
      const whatsappMessage = `*New Orange Pharmacy Order*%0A%0A*Medicines:*%0A• ${medicinesList}%0A%0A${prescriptionUrl ? `*Prescription:* ${prescriptionUrl}%0A` : ''}${deliveryAddress ? `*Delivery Address:* ${deliveryAddress}%0A` : ''}%0A*Patient Details:*%0AName: ${patientInfo.name}%0APhone: ${patientInfo.phone}${patientInfo.email ? `%0AEmail: ${patientInfo.email}` : ''}`;
      
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`, '_blank');
      
      toast.success('Order sent via WhatsApp!');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to process order');
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
              src="https://customer-assets.emergentagent.com/job_healthcare-trio/artifacts/dvlg3alh_6_20260102_012214_0002.png" 
              alt="Orange Pharmacy" 
              className="h-12 w-auto"
              data-testid="pharmacy-logo"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl mb-2 text-foreground">Order Medicines</h1>
          <p className="font-body text-muted-foreground">Add medicines and we'll deliver to your doorstep</p>
          <p className="font-body text-sm text-muted-foreground mt-2">
            📍 A-4, Sai Darshan, Near Don Bosco High School, Naigaon East
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6">
              <h2 className="font-heading text-2xl font-semibold mb-4">Medicine List</h2>
              <div className="space-y-4">
                {medicines.map((medicine, index) => (
                  <div key={index} className="flex gap-3" data-testid={`medicine-row-${index}`}>
                    <div className="flex-1">
                      <Input
                        placeholder="Medicine name"
                        value={medicine.name}
                        onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                        data-testid={`medicine-name-${index}`}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="w-32">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateMedicine(index, 'quantity', Math.max(1, medicine.quantity - 1))}
                          data-testid={`medicine-decrease-${index}`}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={medicine.quantity}
                          onChange={(e) => updateMedicine(index, 'quantity', parseInt(e.target.value) || 1)}
                          data-testid={`medicine-quantity-${index}`}
                          className="text-center h-12"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateMedicine(index, 'quantity', medicine.quantity + 1)}
                          data-testid={`medicine-increase-${index}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {medicines.length > 1 && (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => removeMedicine(index)}
                        data-testid={`medicine-remove-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                onClick={addMedicine} 
                className="mt-4"
                data-testid="add-medicine-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </Button>
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
              <h2 className="font-heading text-2xl font-semibold mb-4">Delivery Address</h2>
              <Textarea
                placeholder="Enter your complete delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                data-testid="delivery-address-input"
                className="min-h-24 rounded-xl"
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
              <h3 className="font-heading text-xl font-semibold mb-4">Order Summary</h3>
              {medicines.filter(m => m.name.trim()).length > 0 ? (
                <div className="space-y-2 mb-6" data-testid="order-summary-list">
                  {medicines.filter(m => m.name.trim()).map((medicine, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between bg-orange-50 px-3 py-2 rounded-lg"
                      data-testid={`summary-item-${index}`}
                    >
                      <span className="font-body text-sm">{medicine.name}</span>
                      <span className="font-body text-sm font-semibold">x{medicine.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-muted-foreground text-sm mb-6" data-testid="no-medicines-message">
                  No medicines added
                </p>
              )}

              <div className="border-t border-border pt-4 space-y-2 text-sm font-body">
                <p><strong>Total Items:</strong> {medicines.filter(m => m.name.trim()).reduce((sum, m) => sum + m.quantity, 0)}</p>
                {prescriptionFile && <p><strong>Prescription:</strong> Uploaded</p>}
                {deliveryAddress && <p><strong>Delivery:</strong> Required</p>}
              </div>

              <Button 
                className="w-full mt-6 rounded-full py-6 bg-brand-orange hover:bg-brand-orange/90" 
                onClick={handleSubmit}
                disabled={loading || medicines.filter(m => m.name.trim()).length === 0}
                data-testid="place-order-button"
              >
                {loading ? 'Processing...' : 'Place Order via WhatsApp'}
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pharmacy;
