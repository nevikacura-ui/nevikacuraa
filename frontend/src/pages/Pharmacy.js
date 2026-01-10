import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Upload, Plus, Minus, Trash2, Search, Pill, ShoppingCart, X, Package, CreditCard, Banknote, CheckCircle2, Phone, Shield, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '+917039030030';

const Pharmacy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Step state: 1 = Add Medicines, 2 = OTP Verification, 3 = Enter Details & Payment
  const [currentStep, setCurrentStep] = useState(1);
  
  const [medicines, setMedicines] = useState([]);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
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
  const [totalMedicines, setTotalMedicines] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMedicines, setHasMoreMedicines] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const inventoryListRef = useRef(null);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  
  // Manual entry state
  const [manualMedicine, setManualMedicine] = useState({ name: '', quantity: 1 });
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    fetchInventory();
    fetchForms();
    fetchTotalCount();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchInventory(1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedForm, searchTerm]);

  // Autocomplete effect
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await axios.get(`${API}/pharmacy/autocomplete?q=${encodeURIComponent(searchTerm)}&limit=8`);
        setSuggestions(response.data.suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };
    
    const timer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInventory = async (page = 1, reset = false) => {
    try {
      if (page === 1) setInventoryLoading(true);
      else setLoadingMore(true);
      
      const response = await axios.get(`${API}/pharmacy/all`, {
        params: {
          page,
          per_page: 50,
          search: searchTerm || undefined
        }
      });
      
      if (reset || page === 1) {
        setInventory(response.data.medicines);
      } else {
        setInventory(prev => [...prev, ...response.data.medicines]);
      }
      
      setHasMoreMedicines(page < response.data.total_pages);
      setTotalMedicines(response.data.total);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setInventoryLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const response = await axios.get(`${API}/pharmacy/count`);
      setTotalMedicines(response.data.total);
    } catch (error) {
      console.error('Failed to fetch total count:', error);
    }
  };

  const loadMoreMedicines = () => {
    if (!loadingMore && hasMoreMedicines) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchInventory(nextPage);
    }
  };

  // Scroll handler for infinite scroll
  const handleInventoryScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMoreMedicines && !loadingMore) {
      loadMoreMedicines();
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

  const MAX_QUANTITY = 20; // Maximum 20 strips per medicine

  const addToCart = (medicine) => {
    const existingIndex = medicines.findIndex(m => m.name === medicine.name);
    if (existingIndex >= 0) {
      const updated = [...medicines];
      if (updated[existingIndex].quantity >= MAX_QUANTITY) {
        toast.error(`Maximum ${MAX_QUANTITY} strips allowed per medicine`);
        return;
      }
      updated[existingIndex].quantity += 1;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { ...medicine, quantity: 1 }]);
    }
    toast.success(`Added ${medicine.name} to cart`);
    setShowSuggestions(false);
  };

  const addManualMedicine = () => {
    if (!manualMedicine.name.trim()) {
      toast.error('Please enter medicine name');
      return;
    }
    
    if (manualMedicine.quantity > MAX_QUANTITY) {
      toast.error(`Maximum ${MAX_QUANTITY} strips allowed per medicine`);
      return;
    }
    
    const existingIndex = medicines.findIndex(m => m.name.toLowerCase() === manualMedicine.name.toLowerCase());
    if (existingIndex >= 0) {
      const updated = [...medicines];
      const newQty = updated[existingIndex].quantity + manualMedicine.quantity;
      if (newQty > MAX_QUANTITY) {
        toast.error(`Maximum ${MAX_QUANTITY} strips allowed per medicine. Current: ${updated[existingIndex].quantity}`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { 
        name: manualMedicine.name.trim(), 
        quantity: manualMedicine.quantity,
        form: 'Manual Entry'
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
    if (quantity > MAX_QUANTITY) {
      toast.error(`Maximum ${MAX_QUANTITY} strips allowed per medicine`);
      return;
    }
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
        service: 'pharmacy'
      });
      
      setOtpSent(true);
      setMockOtp(response.data.mock_otp);
      setResendTimer(30);
      toast.success('OTP sent successfully!');
      
      // Focus first OTP input
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
        service: 'pharmacy'
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
    
    // Auto-focus next input
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
    // Allow proceeding if prescription is uploaded OR medicines are added
    if (medicines.length === 0 && !prescriptionUrl) {
      toast.error('Please add medicines to cart OR upload a prescription');
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
        patient_email: patientInfo.email || null,
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
        `Mobile: ${patientInfo.phone} (Verified)`,
        patientInfo.email ? `Email: ${patientInfo.email}` : ''
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
                onClick={() => currentStep > 1 ? goToStep1() : navigate('/')}
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
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${currentStep === 1 ? 'bg-brand-orange text-white' : 'bg-green-100 text-green-600'}`}>
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                <span className="hidden sm:inline">Cart</span>
              </div>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${currentStep === 2 ? 'bg-brand-orange text-white' : currentStep > 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                <span className="hidden sm:inline">Verify</span>
              </div>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${currentStep === 3 ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500'}`}>
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Pay</span>
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
              <p className="text-sm text-muted-foreground">Search from inventory or add manually</p>
            </div>

            {/* Search with Autocomplete */}
            <Card className="p-4" ref={searchRef}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search medicines..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                      className="pl-10"
                      data-testid="medicine-search"
                    />
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {suggestions.map((med, idx) => (
                        <button
                          key={idx}
                          onClick={() => addToCart(med)}
                          className="w-full px-4 py-3 text-left hover:bg-orange-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                          data-testid={`suggestion-${idx}`}
                        >
                          <div>
                            <span className="font-medium text-gray-900">{med.name}</span>
                            <span className="ml-2 text-xs text-gray-500">{med.form}</span>
                          </div>
                          <Plus className="w-4 h-4 text-brand-orange" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="form-filter"
                >
                  <option value="">All Forms</option>
                  {forms.map((form) => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>
            </Card>

            {/* Manual Entry */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4 text-brand-orange" />
                Add Medicine Manually
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Medicine name"
                  value={manualMedicine.name}
                  onChange={(e) => setManualMedicine({ ...manualMedicine, name: e.target.value })}
                  className="flex-1"
                  data-testid="manual-medicine-name"
                />
                <Input
                  type="number"
                  min="1"
                  value={manualMedicine.quantity}
                  onChange={(e) => setManualMedicine({ ...manualMedicine, quantity: parseInt(e.target.value) || 1 })}
                  className="w-20"
                  data-testid="manual-medicine-qty"
                />
                <Button onClick={addManualMedicine} className="bg-brand-orange hover:bg-brand-orange/90" data-testid="add-manual-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Inventory List - Scrollable */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-brand-orange" />
                  Available Medicines
                </h3>
                <span className="text-sm text-muted-foreground bg-orange-100 px-3 py-1 rounded-full">
                  Total: {totalMedicines.toLocaleString()}
                </span>
              </div>
              
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
                  <span className="ml-2 text-muted-foreground">Loading medicines...</span>
                </div>
              ) : (
                <div 
                  ref={inventoryListRef}
                  className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg"
                  onScroll={handleInventoryScroll}
                  data-testid="medicine-list"
                >
                  {inventory.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchTerm ? 'No medicines found matching your search' : 'No medicines available'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {inventory.map((med, idx) => (
                        <button
                          key={`${med.name}-${idx}`}
                          onClick={() => addToCart(med)}
                          className="w-full flex items-center justify-between p-3 hover:bg-orange-50 transition-colors text-left"
                          data-testid={`inventory-item-${idx}`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm block truncate">{med.name}</span>
                            <span className="text-xs text-gray-500">{med.form}</span>
                          </div>
                          <Plus className="w-5 h-5 text-brand-orange flex-shrink-0 ml-2" />
                        </button>
                      ))}
                      {loadingMore && (
                        <div className="p-3 text-center">
                          <Loader2 className="w-5 h-5 animate-spin text-brand-orange inline-block" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
                        </div>
                      )}
                      {!hasMoreMedicines && inventory.length > 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground bg-gray-50">
                          End of list • {inventory.length} medicines shown
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Cart */}
            {medicines.length > 0 && (
              <Card className="p-4 border-brand-orange">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand-orange" />
                  Your Cart ({totalItems} items)
                </h3>
                <div className="space-y-2 mb-4">
                  {medicines.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium text-sm">{med.name}</span>
                        <span className="ml-2 text-xs text-gray-500">{med.form}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(idx, med.quantity - 1)} data-testid={`decrease-qty-${idx}`}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center">{med.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(idx, med.quantity + 1)} data-testid={`increase-qty-${idx}`}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeMedicine(idx)} className="text-red-500" data-testid={`remove-medicine-${idx}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Patient Info for OTP */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-orange" />
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
                <div className="sm:col-span-2">
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    value={patientInfo.email || ''}
                    onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                    placeholder="your@email.com"
                    data-testid="patient-email"
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll send confirmations, order updates, and delivery status to this email.</p>
                </div>
              </div>
            </Card>

            {/* Prescription Upload */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-orange" />
                Upload Prescription (Optional)
              </h3>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <div className="px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-brand-orange transition-colors">
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
              disabled={medicines.length === 0 && !prescriptionUrl}
              className="w-full bg-brand-orange hover:bg-brand-orange/90 h-12 text-lg"
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
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-brand-orange" />
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-2">Verify Your Phone</h1>
              <p className="text-muted-foreground">
                We have sent a 6-digit OTP to <span className="font-medium text-foreground">+91 {patientInfo.phone}</span>
              </p>
            </div>

            {/* Mock OTP Display (for testing) */}
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
                className="w-full bg-brand-orange hover:bg-brand-orange/90 h-12"
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
                  <Button variant="link" onClick={sendOtp} disabled={otpLoading} className="text-brand-orange">
                    Resend OTP
                  </Button>
                )}
              </div>
            </Card>

            <Button variant="outline" onClick={goToStep1} className="w-full" data-testid="back-to-cart">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
          </div>
        )}

        {/* STEP 3: Details & Payment */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-1 text-foreground">Step 3: Delivery & Payment</h1>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Phone verified: +91 {patientInfo.phone}</span>
              </div>
            </div>

            {/* Order Summary */}
            <Card className="p-4 bg-orange-50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-orange" />
                Order Summary ({totalItems} items)
              </h3>
              <div className="space-y-1">
                {medicines.map((med, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{med.name}</span>
                    <span className="text-gray-500">x{med.quantity}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Delivery Address */}
            <Card className="p-4">
              <Label className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-brand-orange" />
                Delivery Address *
              </Label>
              <Textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your complete delivery address with landmark"
                className="min-h-24"
                data-testid="delivery-address"
              />
            </Card>

            {/* Payment Method */}
            <Card className="p-4">
              <Label className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-brand-orange" />
                Payment Method
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    paymentMethod === 'cod' ? 'border-brand-orange bg-orange-50' : 'border-gray-200'
                  }`}
                  data-testid="payment-cod"
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-sm font-medium">Cash on Delivery</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    paymentMethod === 'card' ? 'border-brand-orange bg-orange-50' : 'border-gray-200'
                  }`}
                  data-testid="payment-card"
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-sm font-medium">QR / Card on Delivery</span>
                </button>
              </div>
            </Card>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !deliveryAddress.trim()}
              className="w-full bg-brand-orange hover:bg-brand-orange/90 h-12 text-lg"
              data-testid="place-order-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Place Order via WhatsApp
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Pharmacy;
