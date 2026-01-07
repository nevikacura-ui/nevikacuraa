import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Upload, Plus, Minus, Trash2, Search, Pill, ShoppingCart, X, Package, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '+917039030030';

const Pharmacy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Step state: 1 = Add Medicines, 2 = Enter Details & Payment
  const [currentStep, setCurrentStep] = useState(1);
  
  const [medicines, setMedicines] = useState([]);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [forms, setForms] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  
  // Manual entry state
  const [manualMedicine, setManualMedicine] = useState({ name: '', quantity: 1 });

  useEffect(() => {
    fetchInventory();
    fetchForms();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedForm]);

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedForm) params.append('form', selectedForm);
      
      const response = await axios.get(`${API}/pharmacy/inventory?${params.toString()}`);
      setInventory(response.data.medicines);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API}/pharmacy/forms`);
      setForms(response.data.forms);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const addToCart = (medicine) => {
    const existingIndex = medicines.findIndex(m => m.name === medicine.name);
    if (existingIndex >= 0) {
      const updated = [...medicines];
      updated[existingIndex].quantity += 1;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { ...medicine, quantity: 1 }]);
    }
    toast.success(`Added ${medicine.name} to cart`);
  };

  const addManualMedicine = () => {
    if (!manualMedicine.name.trim()) {
      toast.error('Please enter medicine name');
      return;
    }
    
    const existingIndex = medicines.findIndex(m => m.name.toLowerCase() === manualMedicine.name.toLowerCase());
    if (existingIndex >= 0) {
      const updated = [...medicines];
      updated[existingIndex].quantity += manualMedicine.quantity;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { 
        name: manualMedicine.name.trim(), 
        quantity: manualMedicine.quantity,
        form: 'Manual Entry',
        company: 'Custom'
      }]);
    }
    toast.success(`Added ${manualMedicine.name} to cart`);
    setManualMedicine({ name: '', quantity: 1 });
  };

  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, quantity) => {
    if (quantity < 1) return;
    const updated = [...medicines];
    updated[index].quantity = quantity;
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

  const goToStep2 = () => {
    if (medicines.length === 0) {
      toast.error('Please add at least one medicine to cart');
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

    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        medicines: medicines.map(m => ({ name: m.name, quantity: m.quantity })),
        prescription_url: prescriptionUrl || null,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        delivery_address: deliveryAddress
      };

      if (user) {
        await axios.post(`${API}/pharmacy`, orderData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      const paymentText = paymentMethod === 'cod' ? 'Cash on Delivery' : 'QR Pay / Card on Delivery';
      const medicinesList = medicines.map(m => `• ${m.name} (Qty: ${m.quantity})`).join('\n');
      
      const messageLines = [
        '*New Orange Pharmacy Order*',
        '',
        '*Medicines:*',
        medicinesList,
        '',
        `*Payment Method:* ${paymentText}`,
        prescriptionUrl ? `*Prescription:* ${prescriptionUrl}` : '',
        '',
        '*Delivery Address:*',
        deliveryAddress,
        '',
        '*Customer Details:*',
        `Name: ${patientInfo.name}`,
        `Mobile: ${patientInfo.phone}`
      ].filter(Boolean).join('\n');
      
      const encodedMessage = encodeURIComponent(messageLines);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
      
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

  const totalItems = medicines.reduce((sum, m) => sum + m.quantity, 0);

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
                src="https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg" 
                alt="Orange Pharmacy" 
                className="h-14 w-auto"
                data-testid="pharmacy-logo"
              />
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${currentStep === 1 ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500'}`}>
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Medicines</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${currentStep === 2 ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500'}`}>
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Details & Pay</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* STEP 1: Add Medicines */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-1 text-foreground">Step 1: Add Medicines</h1>
              <p className="font-body text-muted-foreground text-sm">Add medicines manually or browse our inventory</p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                📍 A-4, Sai Darshan, Near Don Bosco High School, Naigaon East
              </p>
            </div>

            {/* Manual Entry Card */}
            <Card className="p-4 border-2 border-orange-200 bg-orange-50/50">
              <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-orange" />
                Add Medicine Manually
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Enter medicine name..."
                    value={manualMedicine.name}
                    onChange={(e) => setManualMedicine({...manualMedicine, name: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addManualMedicine()}
                    data-testid="manual-medicine-name"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setManualMedicine({...manualMedicine, quantity: Math.max(1, manualMedicine.quantity - 1)})}
                    className="h-12 w-12"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={manualMedicine.quantity}
                    onChange={(e) => setManualMedicine({...manualMedicine, quantity: parseInt(e.target.value) || 1})}
                    className="text-center h-12 w-16"
                    data-testid="manual-medicine-qty"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setManualMedicine({...manualMedicine, quantity: manualMedicine.quantity + 1})}
                    className="h-12 w-12"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={addManualMedicine}
                    className="h-12 px-6 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
                    data-testid="add-manual-medicine-btn"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </Card>

            {/* Your Cart */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-brand-orange" />
                  Your Cart ({totalItems} items)
                </h3>
              </div>
              
              {medicines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Your cart is empty</p>
                  <p className="text-sm">Add medicines using the form above or browse below</p>
                </div>
              ) : (
                <div className="space-y-2" data-testid="cart-items">
                  {medicines.map((medicine, index) => (
                    <div 
                      key={`cart-${index}`} 
                      className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl"
                      data-testid={`cart-item-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{medicine.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(index, medicine.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{medicine.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(index, medicine.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeMedicine(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
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

            {/* Browse Inventory */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <Pill className="w-5 h-5 text-brand-orange" />
                Browse Inventory
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search medicines..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    data-testid="medicine-search-input"
                  />
                </div>
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-input bg-background"
                  data-testid="form-filter-select"
                >
                  <option value="">All Forms</option>
                  {forms.map((form) => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">{inventory.length} items found</p>
              
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No medicines found. Use manual entry above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {inventory.map((medicine, index) => (
                    <div
                      key={`${medicine.name}-${index}`}
                      className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl border border-orange-100 hover:border-brand-orange/50 transition-colors"
                      data-testid={`inventory-item-${index}`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-sm truncate">{medicine.name}</p>
                        <p className="text-xs text-muted-foreground">{medicine.form} • {medicine.company}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToCart(medicine)}
                        className="shrink-0 hover:bg-brand-orange hover:text-white hover:border-brand-orange"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Continue Button */}
            <Button 
              className="w-full rounded-full py-6 text-lg font-medium bg-brand-orange hover:bg-brand-orange/90" 
              onClick={goToStep2}
              disabled={medicines.length === 0}
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
              <p className="font-body text-muted-foreground text-sm">Enter delivery details and select payment method</p>
            </div>

            {/* Order Summary */}
            <Card className="p-4 bg-orange-50/50 border-orange-200">
              <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-orange" />
                Order Summary ({totalItems} items)
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {medicines.map((medicine, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-orange-100 last:border-0">
                    <span className="text-sm">{medicine.name}</span>
                    <span className="text-sm font-medium">x{medicine.quantity}</span>
                  </div>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToStep1}
                className="mt-3 text-brand-orange hover:text-brand-orange"
              >
                ← Edit Cart
              </Button>
            </Card>

            {/* Customer Details */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-4">Customer Details</h3>
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
                  <Label htmlFor="delivery-address" className="text-sm font-medium">Delivery Address *</Label>
                  <Textarea
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter complete delivery address with landmark"
                    data-testid="delivery-address-input"
                    className="min-h-24 rounded-xl mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-4">Payment Method</h3>
              <div className="space-y-3">
                <label 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
                  data-testid="payment-cod"
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-brand-orange"
                  />
                  <Banknote className={`w-8 h-8 ${paymentMethod === 'cod' ? 'text-brand-orange' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                  </div>
                </label>
                
                <label 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'qr_card' ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
                  data-testid="payment-qr-card"
                >
                  <input
                    type="radio"
                    name="payment"
                    value="qr_card"
                    checked={paymentMethod === 'qr_card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-brand-orange"
                  />
                  <CreditCard className={`w-8 h-8 ${paymentMethod === 'qr_card' ? 'text-brand-orange' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium">QR Pay / Card on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay via UPI or Card when delivered</p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Place Order Button */}
            <Button 
              className="w-full rounded-full py-6 text-lg font-medium bg-green-600 hover:bg-green-700" 
              onClick={handleSubmit}
              disabled={loading || !patientInfo.name || !patientInfo.phone || !deliveryAddress}
              data-testid="place-order-button"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Place Order via WhatsApp
                </>
              )}
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Your order details will be sent to Orange Pharmacy via WhatsApp
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Pharmacy;
