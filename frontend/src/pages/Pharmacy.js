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
import { ArrowLeft, ArrowRight, Upload, Plus, Minus, Trash2, Search, Pill, ShoppingCart, X, Package, CreditCard, Banknote, CheckCircle2, Phone, Shield, Loader2, Gift, Crown, Award, Star, Info, ChevronRight, FileText, Trophy, Medal, TrendingUp, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [otpMethod, setOtpMethod] = useState(''); // 'sms' or 'mock'
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  
  // Loyalty points state
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);
  
  // Loyalty Program Info state
  const [showLoyaltyInfo, setShowLoyaltyInfo] = useState(false);
  const [loyaltyTiers, setLoyaltyTiers] = useState(null);
  const [loyaltyFAQ, setLoyaltyFAQ] = useState(null);
  const [loyaltyTerms, setLoyaltyTerms] = useState(null);
  const [userLoyaltyStatus, setUserLoyaltyStatus] = useState(null);
  const [loyaltyTab, setLoyaltyTab] = useState('overview'); // overview, leaderboard, faq, terms
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all'); // all, weekly, monthly
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardInfo, setLeaderboardInfo] = useState({ total_participants: 0, period_label: 'All Time' });

  // Frequently ordered state
  const [frequentlyOrdered, setFrequentlyOrdered] = useState([]);
  const [loadingFrequent, setLoadingFrequent] = useState(false);

  // Check for reorder data on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reorder') === 'true') {
      const reorderData = localStorage.getItem('reorder_data');
      if (reorderData) {
        try {
          const data = JSON.parse(reorderData);
          setMedicines(data.medicines || []);
          setDeliveryAddress(data.delivery_address || '');
          setPatientInfo(prev => ({
            ...prev,
            name: data.patient_name || prev.name,
            phone: data.patient_phone || prev.phone
          }));
          localStorage.removeItem('reorder_data');
          toast.success('Previous order loaded! Review and proceed.');
        } catch (e) {
          console.error('Failed to parse reorder data:', e);
        }
      }
    }
  }, []);

  // Fetch frequently ordered medicines for logged-in users
  const fetchFrequentlyOrdered = async () => {
    if (!user) return;
    setLoadingFrequent(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/pharmacy/frequently-ordered`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFrequentlyOrdered(response.data.medicines || []);
    } catch (error) {
      console.error('Failed to fetch frequently ordered:', error);
    }
    setLoadingFrequent(false);
  };

  useEffect(() => {
    fetchInventory();
    fetchForms();
    fetchTotalCount();
    // Fetch loyalty points and frequently ordered for logged-in users
    if (user) {
      fetchLoyaltyPoints();
      fetchFrequentlyOrdered();
    }
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

  const fetchLoyaltyPoints = async () => {
    if (!user) return;
    setLoadingPoints(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/user/loyalty-points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoyaltyPoints(response.data.loyalty_points || 0);
    } catch (error) {
      console.error('Failed to fetch loyalty points:', error);
    }
    setLoadingPoints(false);
  };

  const fetchLoyaltyProgramInfo = async () => {
    try {
      const [tiersRes, faqRes, termsRes] = await Promise.all([
        axios.get(`${API}/pharmacy/loyalty/tiers`),
        axios.get(`${API}/pharmacy/loyalty/faq`),
        axios.get(`${API}/pharmacy/loyalty/terms-and-conditions`)
      ]);
      setLoyaltyTiers(tiersRes.data);
      setLoyaltyFAQ(faqRes.data);
      setLoyaltyTerms(termsRes.data);
      
      // Fetch user status if logged in
      if (user) {
        const statusRes = await axios.get(`${API}/pharmacy/loyalty/user-status?user_id=${user.id}`);
        setUserLoyaltyStatus(statusRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch loyalty info:', error);
    }
  };

  const fetchLeaderboard = async (period = 'all') => {
    setLeaderboardLoading(true);
    try {
      const response = await axios.get(`${API}/pharmacy/loyalty/leaderboard?limit=10&period=${period}`);
      setLeaderboard(response.data.leaderboard || []);
      setLeaderboardInfo({
        total_participants: response.data.total_participants || 0,
        period_label: response.data.period_label || 'All Time',
        last_updated: response.data.last_updated
      });
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLeaderboard([]);
    }
    setLeaderboardLoading(false);
  };

  // Fetch leaderboard when period changes or tab switches to leaderboard
  useEffect(() => {
    if (loyaltyTab === 'leaderboard') {
      fetchLeaderboard(leaderboardPeriod);
    }
  }, [loyaltyTab, leaderboardPeriod]);

  // Calculate discount from points (100 pts = ₹10)
  const discountAmount = (pointsToUse / 100) * 10;

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
      setMockOtp(response.data.mock_otp || '');
      setOtpMethod(response.data.method || 'mock');
      setResendTimer(30);
      toast.success(response.data.method === 'sms' ? 'OTP sent to your phone!' : 'OTP sent successfully!');
      
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
        delivery_address: deliveryAddress,
        points_used: user ? pointsToUse : 0
      };

      // Save to backend (sends SMS to patient and Orange Pharmacy staff)
      await axios.post(`${API}/pharmacy`, orderData, {
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      
      toast.success('Order confirmed! SMS sent to you and Orange Pharmacy.');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || 'Failed to process order');
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

      {/* How It Works - Order Flow Guide */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800">How to Order Medicines</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-gray-800">Add Medicines</p>
                <p className="text-xs text-gray-500">Search or type medicine name & quantity. Upload prescription if needed.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-gray-800">Verify & Address</p>
                <p className="text-xs text-gray-500">Confirm via OTP, enter delivery address & payment mode.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-gray-800">Pharmacist Call</p>
                <p className="text-xs text-gray-500">Our pharmacist calls to confirm order & final bill. You approve before dispatch.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
              <div>
                <p className="text-sm font-medium text-gray-800">Delivery & Invoice</p>
                <p className="text-xs text-gray-500">Order delivered to your location. Download invoice in My Orders.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty Program Banner */}
      <div 
        className="bg-gradient-to-r from-orange-500 to-amber-500 text-white cursor-pointer hover:from-orange-600 hover:to-amber-600 transition-colors"
        onClick={() => { setShowLoyaltyInfo(true); fetchLoyaltyProgramInfo(); }}
        data-testid="loyalty-banner"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">Orange Pharmacy Loyalty Program</p>
              <p className="text-xs opacity-90">Earn points on every purchase • Bronze | Silver | Gold tiers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && loyaltyPoints > 0 && (
              <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-semibold">
                {loyaltyPoints} pts
              </div>
            )}
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>

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
                  max="20"
                  value={manualMedicine.quantity}
                  onChange={(e) => setManualMedicine({ ...manualMedicine, quantity: Math.min(parseInt(e.target.value) || 1, 20) })}
                  className="w-20"
                  data-testid="manual-medicine-qty"
                />
                <Button onClick={addManualMedicine} className="bg-brand-orange hover:bg-brand-orange/90" data-testid="add-manual-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Frequently Ordered - Only for logged in users */}
            {user && frequentlyOrdered.length > 0 && (
              <Card className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-orange" />
                  Quick Reorder - Your Frequently Ordered
                </h3>
                <div className="flex flex-wrap gap-2">
                  {frequentlyOrdered.slice(0, 6).map((med, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => addToCart({ name: med.name, form: med.form || 'Tablet' })}
                      className="bg-white hover:bg-orange-100 border-orange-200"
                      data-testid={`frequent-med-${idx}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {med.name}
                      <span className="ml-1 text-xs text-gray-500">({med.order_count}x)</span>
                    </Button>
                  ))}
                </div>
              </Card>
            )}

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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateQuantity(idx, med.quantity + 1)} 
                          disabled={med.quantity >= 20}
                          data-testid={`increase-qty-${idx}`}
                        >
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
                  <p className="text-xs text-gray-500 mt-1">We&apos;ll send confirmations, order updates, and delivery status to this email.</p>
                </div>
              </div>
            </Card>

            {/* Prescription Upload with Preview */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-orange" />
                Upload Prescription (Optional)
              </h3>
              <div className="space-y-3">
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
                {/* Prescription Preview */}
                {prescriptionUrl && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Prescription Preview
                    </p>
                    {prescriptionFile?.type?.includes('image') || prescriptionUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={prescriptionUrl} 
                        alt="Prescription preview" 
                        className="max-h-40 rounded border border-gray-200 object-contain"
                      />
                    ) : (
                      <a 
                        href={prescriptionUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-orange-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        View PDF Prescription
                      </a>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setPrescriptionFile(null); setPrescriptionUrl(''); }} 
                      className="mt-2 text-red-500 h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                )}
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
                {otpMethod === 'sms' 
                  ? <>We have sent a 6-digit OTP via SMS to <span className="font-medium text-foreground">+91 {patientInfo.phone}</span></>
                  : <>We have sent a 6-digit OTP to <span className="font-medium text-foreground">+91 {patientInfo.phone}</span></>
                }
              </p>
            </div>

            {/* Mock OTP Display - Only shown in test mode */}
            {mockOtp && otpMethod === 'mock' && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Test Mode:</span>
                  <span>Your OTP is <strong className="text-xl">{mockOtp}</strong></span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">In production, this will be sent via SMS</p>
              </Card>
            )}
            
            {/* SMS Sent Confirmation */}
            {otpMethod === 'sms' && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>OTP sent via SMS. Please check your phone.</span>
                </div>
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
              {pointsToUse > 0 && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Loyalty Discount ({pointsToUse} pts)
                    </span>
                    <span className="text-green-600 font-medium">-₹{discountAmount}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Loyalty Points Redemption - Only for logged-in users */}
            {user && loyaltyPoints > 0 && (
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    Redeem Loyalty Points
                  </h3>
                  <div className="text-right">
                    <p className="text-xl font-bold text-amber-600">{loyaltyPoints}</p>
                    <p className="text-xs text-gray-500">Available Points</p>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-amber-200 mb-3">
                  <p className="text-xs text-gray-600 mb-2">100 points = ₹10 discount</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-sm">Points to Redeem</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          value={pointsToUse || ''}
                          onChange={(e) => {
                            const val = Math.min(parseInt(e.target.value) || 0, loyaltyPoints);
                            setPointsToUse(Math.max(0, val));
                          }}
                          placeholder="0"
                          max={loyaltyPoints}
                          min={0}
                          className="w-24 text-center"
                          data-testid="points-input"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPointsToUse(loyaltyPoints)}
                          className="text-xs whitespace-nowrap"
                          data-testid="use-all-points"
                        >
                          Use All
                        </Button>
                        {pointsToUse > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPointsToUse(0)}
                            className="text-xs text-gray-500"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    {pointsToUse > 0 && (
                      <div className="text-right bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600">Your Discount</p>
                        <p className="text-2xl font-bold text-green-600">₹{discountAmount}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-gray-500">
                  Points will be deducted after successful order placement
                </p>
              </Card>
            )}

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
                  Place Order
                </>
              )}
            </Button>
          </div>
        )}
      </main>

      {/* Loyalty Program Dialog */}
      <Dialog open={showLoyaltyInfo} onOpenChange={setShowLoyaltyInfo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Crown className="w-6 h-6" />
              Orange Pharmacy Loyalty Program
            </DialogTitle>
            <DialogDescription className="text-orange-100">
              Earn rewards on every purchase
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={loyaltyTab} onValueChange={setLoyaltyTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 mx-4 mt-2 flex-shrink-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Top 10
              </TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0">
                {/* User Status Card */}
                {userLoyaltyStatus && (
                  <Card className="p-4 mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">Your Status</h3>
                      <span className="px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                        {userLoyaltyStatus.frequent_tier?.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-2xl font-bold text-orange-600">{userLoyaltyStatus.loyalty_points}</p>
                        <p className="text-xs text-gray-500">Points</p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-2xl font-bold text-amber-600">{userLoyaltyStatus.gold_visits}/10</p>
                        <p className="text-xs text-gray-500">Gold Visits</p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-2xl font-bold text-green-600">{userLoyaltyStatus.total_orders}</p>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                    </div>
                    {userLoyaltyStatus.gold_reward_eligible && (
                      <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-lg text-center">
                        <p className="text-sm font-semibold text-yellow-800">🎉 Gold Reward Unlocked! Claim your benefits.</p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Tier Cards */}
                <h3 className="font-semibold text-gray-800 mb-3">Loyalty Tiers</h3>
                <div className="space-y-3 mb-4">
                  {/* Bronze */}
                  <Card className="p-4 border-l-4 border-l-amber-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">BRONZE</h4>
                        <p className="text-xs text-gray-500">Any Purchase Amount</p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 ml-13">
                      <li>• Earn 1 loyalty point per ₹100 spent</li>
                      <li>• 2× points on Diagnostics</li>
                      <li>• 20 bonus points on medicine refills</li>
                      <li>• Redeem points for discounts & free delivery</li>
                    </ul>
                  </Card>

                  {/* Silver */}
                  <Card className="p-4 border-l-4 border-l-gray-400">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">SILVER</h4>
                        <p className="text-xs text-gray-500">₹500+ per bill</p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 ml-13">
                      <li>• All Bronze benefits</li>
                      <li>• Extra 5% discount on medicines</li>
                      <li>• FREE delivery on qualifying orders</li>
                    </ul>
                  </Card>

                  {/* Gold */}
                  <Card className="p-4 border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-800">GOLD</h4>
                        <p className="text-xs text-yellow-600">₹1000+ per bill</p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-700 space-y-1 ml-13">
                      <li>• All Silver benefits</li>
                      <li>• Extra 10% discount on medicines</li>
                      <li>• FREE delivery always</li>
                      <li className="font-semibold text-yellow-700">• 10-Visit Reward: Extra discount + Free Health Checkup!</li>
                    </ul>
                  </Card>
                </div>

                {/* How It Works */}
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> How It Works
                  </h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal ml-4">
                    <li>Share your registered mobile number at billing</li>
                    <li>Your tier is decided by your bill amount (Bronze/Silver/Gold)</li>
                    <li>Points and visit count are added automatically</li>
                    <li>Track everything in the Nevika Cura app</li>
                  </ol>
                </Card>
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="m-0">
                {/* Period Selector */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Top Customers
                  </h3>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {[
                      { value: 'weekly', label: 'Week' },
                      { value: 'monthly', label: 'Month' },
                      { value: 'all', label: 'All Time' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setLeaderboardPeriod(option.value)}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${
                          leaderboardPeriod === option.value
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        data-testid={`leaderboard-${option.value}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats Bar */}
                <Card className="p-3 mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-600">{leaderboardInfo.period_label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Medal className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-gray-800">{leaderboardInfo.total_participants} participants</span>
                    </div>
                  </div>
                </Card>

                {/* Leaderboard List */}
                {leaderboardLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                ) : leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <Card 
                        key={idx} 
                        className={`p-3 transition-all hover:shadow-md ${
                          idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' :
                          idx === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300' :
                          idx === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' :
                          'bg-white'
                        }`}
                        data-testid={`leaderboard-entry-${idx}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {entry.badge ? entry.badge.icon : `#${entry.rank}`}
                          </div>

                          {/* Name & Tier */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 truncate">{entry.display_name}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                entry.tier === 'gold' ? 'bg-yellow-100 text-yellow-700' :
                                entry.tier === 'silver' ? 'bg-gray-100 text-gray-600' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {entry.tier.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              <span>{entry.total_orders} orders</span>
                              {entry.gold_visits > 0 && (
                                <span className="flex items-center gap-1">
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                  {entry.gold_visits} gold visits
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Points */}
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <span className="font-bold text-lg text-orange-600">{entry.points}</span>
                            </div>
                            <span className="text-xs text-gray-400">points</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center bg-gray-50">
                    <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h4 className="font-semibold text-gray-600 mb-1">No Rankings Yet</h4>
                    <p className="text-sm text-gray-400">
                      Be the first to earn points and claim the top spot!
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Make purchases to start earning loyalty points
                    </p>
                  </Card>
                )}

                {/* Call to Action */}
                <Card className="p-4 mt-4 bg-gradient-to-r from-orange-100 to-amber-100 border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-800">Want to climb the ranks?</h4>
                      <p className="text-xs text-orange-600">Earn 1 point per ₹100 spent. 2× points on diagnostics!</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" className="m-0">
                {loyaltyFAQ?.faqs ? (
                  <div className="space-y-3">
                    {loyaltyFAQ.faqs.map((faq, idx) => (
                      <Card key={idx} className="p-4">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-start gap-2">
                          <span className="text-orange-500 font-bold">Q:</span>
                          {faq.q}
                        </h4>
                        <p className="text-sm text-gray-600 ml-5">{faq.a}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">Loading FAQ...</div>
                )}
              </TabsContent>

              {/* Terms Tab */}
              <TabsContent value="terms" className="m-0">
                {loyaltyTerms?.sections ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg">{loyaltyTerms.title}</h3>
                      <p className="text-xs text-gray-500">Effective: {loyaltyTerms.effective_date}</p>
                    </div>
                    
                    {loyaltyTerms.sections.map((section, idx) => (
                      <div key={idx} className="border-b pb-3 last:border-0">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-500" />
                          {section.title}
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {section.content.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    
                    <Card className="p-3 bg-gray-50 text-xs text-gray-500 text-center">
                      Last Updated: {loyaltyTerms.last_updated}
                      <br />
                      {loyaltyTerms.acceptance}
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">Loading Terms...</div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pharmacy;
