import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import CashfreeCheckout from '@/components/CashfreeCheckout';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, ArrowRight, Upload, Plus, Minus, X, ShoppingCart, Pill, Search, Package, 
  CreditCard, Banknote, CheckCircle2, Shield, Phone, Loader2, Trash2, Info, FileText,
  Crown, Star, Gift, Trophy, TrendingUp, Medal, ChevronRight, Sparkles, Droplets, Syringe,
  Stethoscope, Grid3X3, List, Heart, Share2, Clock, Truck
} from 'lucide-react';

// Custom Tablet Icon (round pill with score line - NOT capsule)
const TabletIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" fill="currentColor" className={className}>
    {/* Main round tablet */}
    <circle cx="32" cy="32" r="26" fill="currentColor" />
    {/* Score line across the middle */}
    <line x1="10" y1="32" x2="54" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    {/* Subtle highlight */}
    <ellipse cx="24" cy="22" rx="8" ry="5" fill="white" opacity="0.3"/>
  </svg>
);

// Custom Syrup Bottle Icon (medicine bottle with liquid)
const SyrupBottleIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" fill="currentColor" className={className}>
    {/* Bottle cap */}
    <rect x="22" y="4" width="20" height="8" rx="2" fill="currentColor"/>
    {/* Bottle neck */}
    <rect x="24" y="12" width="16" height="6" fill="currentColor"/>
    {/* Main bottle body */}
    <path d="M20 18 L20 54 C20 58 24 60 28 60 L36 60 C40 60 44 58 44 54 L44 18 Z" fill="currentColor"/>
    {/* Liquid level indicator */}
    <rect x="22" y="30" width="20" height="26" rx="2" fill="white" opacity="0.25"/>
    {/* Label area */}
    <rect x="24" y="36" width="16" height="14" rx="1" fill="white" opacity="0.4"/>
    {/* Rx symbol on label */}
    <text x="32" y="47" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">Rx</text>
    {/* Measuring lines */}
    <line x1="42" y1="35" x2="40" y2="35" stroke="white" strokeWidth="1" opacity="0.5"/>
    <line x1="42" y1="42" x2="40" y2="42" stroke="white" strokeWidth="1" opacity="0.5"/>
    <line x1="42" y1="49" x2="40" y2="49" stroke="white" strokeWidth="1" opacity="0.5"/>
  </svg>
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============================================
// DESIGN SYSTEM - Orange Pharmacy Vibrant Theme
// ============================================
const theme = {
  primary: '#EA580C',      // Deep Orange
  primaryLight: '#FDBA74', // Bright Orange light
  secondary: '#F59E0B',    // Amber
  accent: '#DC2626',       // Red accent
  background: '#FFF7ED',   // Warm cream
  surface: '#FFFFFF',
  textPrimary: '#1C1917',
  textSecondary: '#78716C',
  border: '#FDBA74',
  success: '#16A34A',
  error: '#DC2626'
};

// Medicine form icons/images
const getMedicineIcon = (form) => {
  const icons = {
    'Tablet': '💊',
    'Capsule': '💊',
    'Syrup': '🧴',
    'Injection': '💉',
    'Cream': '🧴',
    'Ointment': '🧴',
    'Drops': '💧',
    'Powder': '📦',
    'Inhaler': '💨',
    'Gel': '🧴',
    'Suspension': '🧴',
    'Solution': '💧',
    'Spray': '💨',
    'Patch': '🩹',
    'Suppository': '💊',
    'Manual Entry': '📝'
  };
  return icons[form] || '💊';
};

// Medicine category images - professional stock photos
const categoryImages = {
  // Product-based categories with real images matching reference UI
  'cough-cold': {
    label: 'Cold, Cough & Fever',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop',
    color: 'from-blue-400 to-indigo-500',
    filter: 'cold',
    badge: 'Best Seller'
  },
  'pain-relief': {
    label: 'Pain Relief',
    image: 'https://images.unsplash.com/photo-1641561421178-db8542057811?w=300&h=300&fit=crop',
    color: 'from-red-400 to-rose-500',
    filter: 'pain',
    badge: 'Trending'
  },
  'digestive': {
    label: 'Digestive Health',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop',
    color: 'from-amber-400 to-orange-500',
    filter: 'digestive',
    badge: null
  },
  'vitamins': {
    label: 'Vitamins & Supplements',
    image: 'https://images.unsplash.com/photo-1670850756988-a1943aa0e554?w=300&h=300&fit=crop',
    color: 'from-yellow-400 to-orange-400',
    filter: 'vitamin',
    badge: 'Must Have'
  },
  'diabetes': {
    label: 'Diabetes Care',
    image: 'https://images.unsplash.com/photo-1685660375082-7b9b12260031?w=300&h=300&fit=crop',
    color: 'from-blue-500 to-cyan-500',
    filter: 'diabetes',
    badge: null
  },
  'skin-care': {
    label: 'Skin Care',
    image: 'https://images.unsplash.com/photo-1600634999627-c52556dff978?w=300&h=300&fit=crop',
    color: 'from-pink-400 to-rose-400',
    filter: 'skin',
    badge: 'New'
  },
  'baby-care': {
    label: 'Baby Care',
    image: 'https://images.unsplash.com/photo-1620875638370-8957e4dbd830?w=300&h=300&fit=crop',
    color: 'from-sky-400 to-blue-400',
    filter: 'baby',
    badge: null
  },
  'heart': {
    label: 'Heart Care',
    image: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=300&h=300&fit=crop',
    color: 'from-red-500 to-pink-500',
    filter: 'cardiac',
    badge: null
  },
  'respiratory': {
    label: 'Respiratory',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&h=300&fit=crop',
    color: 'from-teal-400 to-cyan-500',
    filter: 'respiratory',
    badge: null
  },
  'womens-care': {
    label: 'Women Care',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop',
    color: 'from-purple-400 to-violet-500',
    filter: 'women',
    badge: 'Evara'
  },
  'oral-care': {
    label: 'Oral Care',
    image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=300&h=300&fit=crop',
    color: 'from-cyan-400 to-teal-500',
    filter: 'oral',
    badge: null
  },
  'hair-care': {
    label: 'Hair Care',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop',
    color: 'from-amber-500 to-yellow-500',
    filter: 'hair',
    badge: null
  },
  'first-aid': {
    label: 'First Aid',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300&h=300&fit=crop',
    color: 'from-red-500 to-red-600',
    filter: 'first aid',
    badge: 'Essential'
  },
  'devices': {
    label: 'Medical Devices',
    image: 'https://images.unsplash.com/photo-1685485276914-6cefc2417c05?w=300&h=300&fit=crop',
    color: 'from-slate-400 to-gray-500',
    filter: 'device',
    badge: null
  },
  'ayurvedic': {
    label: 'Ayurvedic Wellness',
    image: 'https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=300&h=300&fit=crop',
    color: 'from-green-500 to-emerald-500',
    filter: 'ayurvedic',
    badge: 'Natural'
  },
  'fitness': {
    label: 'Fitness & Nutrition',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300&h=300&fit=crop',
    color: 'from-orange-500 to-red-500',
    filter: 'fitness',
    badge: null
  }
};

// Category Card Component with product images and badges
const CategoryCard = ({ category, isActive, onClick }) => {
  const cat = categoryImages[category];
  
  if (!cat) return null;
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center transition-all duration-300 ease-out group 
        active:scale-95
        ${isActive 
          ? 'scale-105' 
          : 'hover:scale-105 hover:-translate-y-1'
        }`}
      data-testid={`category-${category}`}
    >
      {/* Circular Image Container */}
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-md transition-all duration-300
        ${isActive 
          ? 'ring-3 ring-orange-400 shadow-lg shadow-orange-200' 
          : 'hover:shadow-lg group-hover:ring-2 group-hover:ring-orange-200'
        }`}
      >
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
        
        {/* Badge */}
        {cat.badge && (
          <div className={`absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ${
            cat.badge === 'Trending' ? 'bg-rose-500 text-white' :
            cat.badge === 'New' ? 'bg-green-500 text-white' :
            cat.badge === 'Best Seller' ? 'bg-amber-500 text-white' :
            cat.badge === 'Must Have' ? 'bg-purple-500 text-white' :
            cat.badge === 'Essential' ? 'bg-red-500 text-white' :
            cat.badge === 'Natural' ? 'bg-emerald-500 text-white' :
            cat.badge === 'Evara' ? 'bg-pink-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            ★
          </div>
        )}
        
        {/* Product Image */}
        <img 
          src={cat.image}
          alt={cat.label}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Active checkmark */}
        {isActive && (
          <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-orange-500 bg-white rounded-full" />
          </div>
        )}
      </div>
      
      {/* Label below image */}
      <span className={`mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[70px] sm:max-w-[80px] transition-all duration-300
        ${isActive 
          ? 'text-orange-600 font-semibold' 
          : 'text-gray-700 group-hover:text-orange-600'
        }`}
      >
        {cat.label}
      </span>
    </button>
  );
};

// ============================================
// STEP PROGRESS COMPONENT
// ============================================
const StepProgress = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Cart', icon: ShoppingCart },
    { num: 2, label: 'Verify', icon: Shield },
    { num: 3, label: 'Pay', icon: CreditCard }
  ];
  
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {steps.map((step, idx) => (
        <React.Fragment key={step.num}>
          <div className={`
            flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all
            ${currentStep === step.num 
              ? 'bg-orange-500 text-white shadow-lg' 
              : currentStep > step.num 
                ? 'bg-emerald-100 text-emerald-600' 
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
// MAIN PHARMACY COMPONENT
// ============================================
const Pharmacy = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchRef = useRef(null);
  const inventoryListRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [totalMedicines, setTotalMedicines] = useState(0);
  const [hasMoreMedicines, setHasMoreMedicines] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [manualMedicine, setManualMedicine] = useState({ name: '', quantity: 1 });
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  
  // Product Detail Dialog State (Blinkit-style)
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [otpMethod, setOtpMethod] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  // Loyalty State
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [showLoyaltyInfo, setShowLoyaltyInfo] = useState(false);
  const [loyaltyTiers, setLoyaltyTiers] = useState(null);
  const [loyaltyFAQ, setLoyaltyFAQ] = useState(null);
  const [loyaltyTerms, setLoyaltyTerms] = useState(null);
  const [userLoyaltyStatus, setUserLoyaltyStatus] = useState(null);
  const [loyaltyTab, setLoyaltyTab] = useState('program');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  const [leaderboardInfo, setLeaderboardInfo] = useState({});
  const [frequentlyOrdered, setFrequentlyOrdered] = useState([]);
  const [loadingFrequent, setLoadingFrequent] = useState(false);
  
  // Refill Reminder & Subscription States
  const [showRefillDialog, setShowRefillDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [refillForm, setRefillForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'Daily',
    reminder_time: '08:00',
    reminder_type: 'sms'
  });
  const [subscriptionForm, setSubscriptionForm] = useState({
    medicines: [],
    delivery_day: 1,
    delivery_frequency: 'monthly'
  });
  const [refillReminders, setRefillReminders] = useState([]);
  const [subscriptionBoxes, setSubscriptionBoxes] = useState([]);
  const [loadingRefills, setLoadingRefills] = useState(false);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  
  const [bookingLimits, setBookingLimits] = useState({
    canBook: true,
    activeOrders: 0,
    loading: true
  });

  // Check for reorder data on mount
  useEffect(() => {
    if (location.state?.reorderMedicines) {
      setMedicines(location.state.reorderMedicines);
      toast.success(`${location.state.reorderMedicines.length} medicines added for reorder`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch data on mount
  useEffect(() => {
    fetchForms();
    fetchTotalCount();
    fetchInventory(1, true);
    if (user) {
      fetchLoyaltyPoints();
      fetchFrequentlyOrdered();
    }
  }, [user]);

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
          canBook: response.data.can_book_pharmacy,
          activeOrders: response.data.active_pharmacy_orders,
          loading: false
        });
      } catch (error) {
        setBookingLimits({ canBook: true, activeOrders: 0, loading: false });
      }
    };
    const debounce = setTimeout(checkBookingLimits, 500);
    return () => clearTimeout(debounce);
  }, [patientInfo.phone]);

  // Autocomplete suggestions - trigger from 1st character
  useEffect(() => {
    if (searchTerm.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const response = await axios.get(`${API}/pharmacy/search`, {
          params: { q: searchTerm, limit: 15, form: selectedForm || undefined }
        });
        setSuggestions(response.data.medicines || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };
    const timer = setTimeout(fetchSuggestions, 150);  // Faster response
    return () => clearTimeout(timer);
  }, [searchTerm, selectedForm]);

  // Filter inventory when search term, form, or category changes
  useEffect(() => {
    const filterInventory = async () => {
      setCurrentPage(1);
      setInventoryLoading(true);
      try {
        const response = await axios.get(`${API}/pharmacy/all`, {
          params: { 
            page: 1, 
            per_page: 50, 
            search: searchTerm || undefined,
            form: selectedForm || undefined,
            category: selectedCategory || undefined
          }
        });
        setInventory(response.data.medicines || []);
        setHasMoreMedicines(1 < response.data.total_pages);
        setTotalMedicines(response.data.total);
      } catch (error) {
        console.error('Failed to filter inventory:', error);
      } finally {
        setInventoryLoading(false);
      }
    };
    
    const debounce = setTimeout(filterInventory, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, selectedForm, selectedCategory]);

  // Resend timer
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

  // Fetch leaderboard when period changes
  useEffect(() => {
    if (loyaltyTab === 'leaderboard') {
      fetchLeaderboard(leaderboardPeriod);
    }
  }, [loyaltyTab, leaderboardPeriod]);

  const fetchInventory = async (page = 1, reset = false) => {
    try {
      if (page === 1) setInventoryLoading(true);
      else setLoadingMore(true);
      
      const response = await axios.get(`${API}/pharmacy/all`, {
        params: { page, per_page: 50, search: searchTerm || undefined }
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
      console.error('Failed to fetch frequent orders:', error);
    }
    setLoadingFrequent(false);
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

  // Fetch Refill Reminders
  const fetchRefillReminders = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) return;
    setLoadingRefills(true);
    try {
      const response = await axios.get(`${API}/pharmacy/refill-reminders/${patientInfo.phone}`);
      setRefillReminders(response.data.reminders || []);
    } catch (error) {
      console.error('Failed to fetch refill reminders:', error);
    }
    setLoadingRefills(false);
  };

  // Create Refill Reminder
  const createRefillReminder = async () => {
    if (!refillForm.medicine_name.trim()) {
      toast.error('Please enter medicine name');
      return;
    }
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter your phone number first');
      return;
    }
    try {
      await axios.post(`${API}/pharmacy/refill-reminder`, {
        patient_phone: patientInfo.phone,
        patient_name: patientInfo.name || 'Patient',
        medicine_name: refillForm.medicine_name,
        dosage: refillForm.dosage,
        frequency: refillForm.frequency,
        reminder_time: refillForm.reminder_time,
        reminder_type: refillForm.reminder_type
      });
      toast.success('Refill reminder created! You will be notified when it\'s time to reorder.');
      setShowRefillDialog(false);
      setRefillForm({ medicine_name: '', dosage: '', frequency: 'Daily', reminder_time: '08:00', reminder_type: 'sms' });
      fetchRefillReminders();
    } catch (error) {
      toast.error('Failed to create reminder');
    }
  };

  // Fetch Subscription Boxes
  const fetchSubscriptionBoxes = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) return;
    setLoadingSubscriptions(true);
    try {
      const response = await axios.get(`${API}/pharmacy/subscription-box/${patientInfo.phone}`);
      setSubscriptionBoxes(response.data.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch subscription boxes:', error);
    }
    setLoadingSubscriptions(false);
  };

  // Create Subscription Box
  const createSubscriptionBox = async () => {
    if (medicines.length === 0) {
      toast.error('Please add medicines to your cart first');
      return;
    }
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter your phone number first');
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address');
      return;
    }
    try {
      await axios.post(`${API}/pharmacy/subscription-box`, {
        patient_phone: patientInfo.phone,
        patient_name: patientInfo.name || 'Patient',
        patient_email: patientInfo.email || null,
        medicines: medicines.map(m => ({ name: m.name, quantity: m.quantity })),
        delivery_address: deliveryAddress,
        delivery_day: subscriptionForm.delivery_day,
        delivery_frequency: subscriptionForm.delivery_frequency
      });
      toast.success('Monthly subscription created! Your medicines will be auto-delivered.');
      setShowSubscriptionDialog(false);
      fetchSubscriptionBoxes();
    } catch (error) {
      toast.error('Failed to create subscription');
    }
  };

  // Pause/Resume Subscription
  const toggleSubscription = async (subscriptionId, currentStatus) => {
    try {
      const endpoint = currentStatus === 'active' ? 'pause' : 'resume';
      await axios.post(`${API}/pharmacy/subscription-box/${subscriptionId}/${endpoint}`);
      toast.success(`Subscription ${endpoint === 'pause' ? 'paused' : 'resumed'}!`);
      fetchSubscriptionBoxes();
    } catch (error) {
      toast.error('Failed to update subscription');
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

  const discountAmount = (pointsToUse / 100) * 10;
  const MAX_QUANTITY = 20;

  const loadMoreMedicines = () => {
    if (!loadingMore && hasMoreMedicines) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchInventory(nextPage);
    }
  };

  const handleInventoryScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMoreMedicines && !loadingMore) {
      loadMoreMedicines();
    }
  };

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
        toast.error(`Maximum ${MAX_QUANTITY} strips allowed. Current: ${updated[existingIndex].quantity}`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { name: manualMedicine.name.trim(), quantity: manualMedicine.quantity, form: 'Manual Entry' }]);
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
      const response = await axios.post(`${API}/otp/send`, { phone: patientInfo.phone, service: 'pharmacy' });
      setOtpSent(true);
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
      const response = await axios.post(`${API}/otp/verify`, { phone: patientInfo.phone, otp: otpValue, service: 'pharmacy' });
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
    if (!patientInfo.email || !patientInfo.email.includes('@')) {
      toast.error('Please enter a valid email address for order updates');
      return;
    }
    // Skip OTP step - directly go to address/delivery step
    // OTP verification disabled to reduce costs. Email is used for order tracking.
    setCurrentStep(3);
    window.scrollTo(0, 0);
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
    if (!patientInfo.email || !patientInfo.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    // Estimate total (pharmacist will confirm final bill)
    const itemCount = medicines.reduce((sum, m) => sum + m.quantity, 0);
    const estimated = itemCount * 100; // Rough estimate ₹100 per item
    setEstimatedTotal(estimated);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = async (paymentInfo) => {
    setLoading(true);
    try {
      const orderData = {
        medicines: medicines.map(m => ({ name: m.name, quantity: m.quantity })),
        prescription_url: prescriptionUrl || null,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_email: patientInfo.email || null,
        delivery_address: deliveryAddress,
        points_used: user ? pointsToUse : 0,
        payment_method: paymentInfo.method,
        cashfree_order_id: paymentInfo.orderId || null
      };
      await axios.post(`${API}/pharmacy`, orderData, {
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      toast.success('Order confirmed! SMS sent to you and Orange Pharmacy.');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process order');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = medicines.reduce((sum, m) => sum + m.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F5F5F4]">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-amber-500 sticky top-0 z-50 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => currentStep > 1 ? goToStep1() : navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg" 
                alt="Orange Pharmacy" 
                className="h-12 sm:h-14 w-auto rounded-lg bg-white p-1"
                data-testid="pharmacy-logo"
              />
            </div>
            <StepProgress currentStep={currentStep} />
          </div>
        </div>
      </header>

      {/* How It Works Banner */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-100">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-slate-800 font-heading">How to Order Medicines</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { num: 1, title: 'Add Medicines', desc: 'Search or type name & quantity' },
              { num: 2, title: 'Verify & Address', desc: 'Confirm via OTP, enter address' },
              { num: 3, title: 'Pharmacist Call', desc: 'We confirm order & final bill' },
              { num: 4, title: 'Delivery', desc: 'Get invoice in My Orders', success: true }
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-2 p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.success ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consultation Help Banner - For users confused about what to order */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white" data-testid="consultation-help-banner">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Not sure what to order?</p>
                <p className="text-xs opacity-90">Book a FREE consultation • Pharmacist will call & generate prescription</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/diagyn')}
              variant="secondary"
              size="sm"
              className="bg-white text-teal-600 hover:bg-teal-50 rounded-full font-semibold flex-shrink-0"
              data-testid="book-consultation-btn"
            >
              Book Consult
            </Button>
          </div>
        </div>
      </div>

      {/* Loyalty Program Banner */}
      <div 
        className="bg-gradient-to-r from-orange-500 to-amber-500 text-white cursor-pointer hover:from-orange-600 hover:to-amber-600 transition-colors"
        onClick={() => { setShowLoyaltyInfo(true); fetchLoyaltyProgramInfo(); }}
        data-testid="loyalty-banner"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
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

      {/* Smart Pharmacy Features - Refill Reminders & Subscription Box */}
      <div className="bg-gradient-to-br from-slate-50 to-orange-50 border-b border-orange-100" data-testid="smart-pharmacy-features">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-slate-800">Smart Pharmacy Features</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Refill Reminders Card */}
            <button
              onClick={() => { setShowRefillDialog(true); fetchRefillReminders(); }}
              className="p-4 bg-white rounded-2xl border-2 border-transparent hover:border-orange-300 shadow-sm hover:shadow-md transition-all text-left group"
              data-testid="refill-reminders-btn"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">Refill Reminders</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Never miss a dose! Get SMS/WhatsApp reminders when medicine runs low.</p>
                  {refillReminders.length > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-medium">
                      {refillReminders.length} active
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Monthly Subscription Box Card */}
            <button
              onClick={() => { setShowSubscriptionDialog(true); fetchSubscriptionBoxes(); }}
              className="p-4 bg-white rounded-2xl border-2 border-transparent hover:border-orange-300 shadow-sm hover:shadow-md transition-all text-left group"
              data-testid="subscription-box-btn"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">Subscription Box</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Auto-delivery every month. Save 10% on regular medicines.</p>
                  {subscriptionBoxes.length > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full font-medium">
                      {subscriptionBoxes.length} active
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Health Concerns Filter */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Quick shop by health concern:</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: 'diabetes', name: 'Diabetes', icon: '🩸', filter: 'diabetes' },
              { id: 'heart', name: 'Heart Care', icon: '❤️', filter: 'cardiac' },
              { id: 'pain', name: 'Pain Relief', icon: '💊', filter: 'pain' },
              { id: 'digestive', name: 'Digestive', icon: '🫃', filter: 'digestive' },
              { id: 'skin', name: 'Skin Care', icon: '✨', filter: 'skin' },
              { id: 'respiratory', name: 'Cold & Cough', icon: '🫁', filter: 'cold' },
              { id: 'vitamins', name: 'Vitamins', icon: '💪', filter: 'vitamin' },
              { id: 'eye', name: 'Eye Care', icon: '👁️', filter: 'eye' },
              { id: 'bone', name: 'Bone & Joint', icon: '🦴', filter: 'bone' },
              { id: 'mental', name: 'Mental Health', icon: '🧠', filter: 'mental' },
              { id: 'thyroid', name: 'Thyroid', icon: '🦋', filter: 'thyroid' },
              { id: 'immunity', name: 'Immunity', icon: '🛡️', filter: 'immunity' }
            ].map((concern) => (
              <button
                key={concern.id}
                onClick={() => setSelectedCategory(selectedCategory === concern.filter ? '' : concern.filter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  selectedCategory === concern.filter 
                    ? 'bg-orange-500 text-white border border-orange-500' 
                    : 'bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700'
                }`}
                data-testid={`health-concern-${concern.id}`}
              >
                <span>{concern.icon}</span>
                {concern.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* STEP 1: Add Medicines */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Add Your Medicines
              </h1>
              <p className="text-slate-500" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Search from 4,000+ medicines or add manually
              </p>
            </div>

            {/* Search with Autocomplete */}
            <Card className="p-5 rounded-2xl border-orange-100 shadow-sm" ref={searchRef}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search medicines..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => searchTerm.length >= 1 && setShowSuggestions(true)}
                      className="pl-10 rounded-xl border-orange-200 focus:border-orange-400 focus:ring-orange-200"
                      data-testid="medicine-search"
                    />
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-orange-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                      <div className="px-3 py-2 text-xs text-slate-500 bg-orange-50 border-b border-orange-100">
                        {suggestions.length} matches found
                      </div>
                      {suggestions.map((med, idx) => {
                        // Highlight matching text
                        const name = med.name || '';
                        const lowerName = name.toLowerCase();
                        const lowerSearch = searchTerm.toLowerCase();
                        const matchIndex = lowerName.indexOf(lowerSearch);
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => addToCart(med)}
                            className="w-full px-4 py-3 text-left hover:bg-orange-50 border-b border-orange-50 last:border-0 flex items-center justify-between transition-colors"
                            data-testid={`suggestion-${idx}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getMedicineIcon(med.form)}</span>
                              <div>
                                <span className="font-medium text-slate-800">
                                  {matchIndex >= 0 ? (
                                    <>
                                      {name.substring(0, matchIndex)}
                                      <span className="bg-yellow-200 text-orange-700 font-semibold">
                                        {name.substring(matchIndex, matchIndex + searchTerm.length)}
                                      </span>
                                      {name.substring(matchIndex + searchTerm.length)}
                                    </>
                                  ) : name}
                                </span>
                                <span className="ml-2 text-xs text-orange-600">{med.form}</span>
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-orange-500" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="h-10 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm focus:border-orange-400"
                  data-testid="form-filter"
                >
                  <option value="">All Forms</option>
                  {forms.map((form) => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>
            </Card>

            {/* Category Cards - Product Image Categories (12 total) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Package className="w-5 h-5 text-orange-500" />
                  Shop by Category
                </h3>
                {selectedCategory && (
                  <button 
                    onClick={() => setSelectedCategory('')}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Clear Filter ✕
                  </button>
                )}
              </div>
              {/* Grid: 4 cols on mobile (4x3), 6 cols on desktop (2x6) */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                <CategoryCard 
                  category="cough-cold" 
                  isActive={selectedCategory === 'cold'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'cold' ? '' : 'cold')} 
                />
                <CategoryCard 
                  category="pain-relief" 
                  isActive={selectedCategory === 'pain'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'pain' ? '' : 'pain')} 
                />
                <CategoryCard 
                  category="digestive" 
                  isActive={selectedCategory === 'digestive'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'digestive' ? '' : 'digestive')} 
                />
                <CategoryCard 
                  category="vitamins" 
                  isActive={selectedCategory === 'vitamin'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'vitamin' ? '' : 'vitamin')} 
                />
                <CategoryCard 
                  category="diabetes" 
                  isActive={selectedCategory === 'diabetes'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'diabetes' ? '' : 'diabetes')} 
                />
                <CategoryCard 
                  category="skin-care" 
                  isActive={selectedCategory === 'skin'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'skin' ? '' : 'skin')} 
                />
                <CategoryCard 
                  category="baby-care" 
                  isActive={selectedCategory === 'baby'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'baby' ? '' : 'baby')} 
                />
                <CategoryCard 
                  category="heart" 
                  isActive={selectedCategory === 'cardiac'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'cardiac' ? '' : 'cardiac')} 
                />
                <CategoryCard 
                  category="respiratory" 
                  isActive={selectedCategory === 'respiratory'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'respiratory' ? '' : 'respiratory')} 
                />
                <CategoryCard 
                  category="womens-care" 
                  isActive={selectedCategory === 'women'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'women' ? '' : 'women')} 
                />
                <CategoryCard 
                  category="ayurvedic" 
                  isActive={selectedCategory === 'ayurvedic'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'ayurvedic' ? '' : 'ayurvedic')} 
                />
                <CategoryCard 
                  category="fitness" 
                  isActive={selectedCategory === 'fitness'} 
                  onClick={() => setSelectedCategory(selectedCategory === 'fitness' ? '' : 'fitness')} 
                />
              </div>
            </div>

            {/* Manual Entry */}
            <Card className="p-5 rounded-2xl border-orange-100">
              <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Pill className="w-4 h-4 text-orange-500" />
                Add Medicine Manually
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Medicine name"
                  value={manualMedicine.name}
                  onChange={(e) => setManualMedicine({ ...manualMedicine, name: e.target.value })}
                  className="flex-1 rounded-xl border-orange-200 focus:border-orange-400"
                  data-testid="manual-medicine-name"
                />
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={manualMedicine.quantity}
                  onChange={(e) => setManualMedicine({ ...manualMedicine, quantity: Math.min(parseInt(e.target.value) || 1, 20) })}
                  className="w-20 rounded-xl border-orange-200"
                  data-testid="manual-medicine-qty"
                />
                <Button onClick={addManualMedicine} className="bg-orange-500 hover:bg-orange-600 rounded-xl" data-testid="add-manual-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Frequently Ordered */}
            {user && frequentlyOrdered.length > 0 && (
              <Card className="p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Quick Reorder - Your Frequently Ordered
                </h3>
                <div className="flex flex-wrap gap-2">
                  {frequentlyOrdered.slice(0, 6).map((med, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => addToCart({ name: med.name, form: med.form || 'Tablet' })}
                      className="bg-white hover:bg-orange-100 border-orange-200 rounded-xl"
                      data-testid={`frequent-med-${idx}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {med.name}
                      <span className="ml-1 text-xs text-slate-400">({med.order_count}x)</span>
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* Inventory List - Blinkit Style */}
            <Card className="p-5 rounded-2xl border-orange-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Package className="w-4 h-4 text-orange-500" />
                  Available Medicines
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 bg-orange-100 px-3 py-1 rounded-full">
                    {totalMedicines.toLocaleString()} items
                  </span>
                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-orange-500' : 'text-slate-400'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-orange-500' : 'text-slate-400'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <span className="ml-3 text-slate-500">Loading medicines...</span>
                </div>
              ) : (
                <div 
                  ref={inventoryListRef}
                  className="max-h-[500px] overflow-y-auto"
                  onScroll={handleInventoryScroll}
                  data-testid="medicine-list"
                >
                  {inventory.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      {searchTerm ? 'No medicines found matching your search' : 'No medicines available'}
                    </div>
                  ) : viewMode === 'grid' ? (
                    /* GRID VIEW - Blinkit Style */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {inventory.map((med, idx) => (
                        <div
                          key={`${med.name}-${idx}`}
                          className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer group"
                          onClick={() => navigate(`/pharmacy/product/${encodeURIComponent(med.name)}`, { state: { product: med } })}
                          data-testid={`inventory-item-${idx}`}
                        >
                          {/* Product Image */}
                          <div className="aspect-square bg-gradient-to-br from-orange-50 to-amber-50 p-4 relative">
                            {med.image ? (
                              <img 
                                src={med.image} 
                                alt={med.name}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                              />
                            ) : null}
                            <div className={`${med.image ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
                              <span className="text-5xl">{getMedicineIcon(med.form)}</span>
                            </div>
                            {/* Quick Add Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); addToCart(med); }}
                              className="absolute bottom-2 right-2 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          {/* Product Info */}
                          <div className="p-3">
                            <span className="text-[10px] text-orange-600 font-semibold uppercase tracking-wide">{med.form}</span>
                            <h4 className="font-medium text-sm text-slate-800 leading-tight line-clamp-2 mt-1 min-h-[2.5rem]">
                              {med.name}
                            </h4>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-400">Tap for details</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); addToCart(med); }}
                                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> ADD
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* LIST VIEW */
                    <div className="divide-y divide-orange-50 border border-orange-100 rounded-xl overflow-hidden">
                      {inventory.map((med, idx) => (
                        <div
                          key={`${med.name}-${idx}`}
                          onClick={() => navigate(`/pharmacy/product/${encodeURIComponent(med.name)}`, { state: { product: med } })}
                          className="flex items-center gap-4 p-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-colors cursor-pointer group"
                          data-testid={`inventory-item-${idx}`}
                        >
                          {/* Image */}
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {med.image ? (
                              <img src={med.image} alt={med.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <span className="text-3xl">{getMedicineIcon(med.form)}</span>
                            )}
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-orange-600 font-semibold uppercase">{med.form}</span>
                            <h4 className="font-medium text-sm text-slate-800 truncate">{med.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Tap for more details</p>
                          </div>
                          {/* Add Button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(med); }}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-4 h-4" /> ADD
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {loadingMore && (
                    <div className="p-4 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500 inline-block" />
                    </div>
                  )}
                  {!hasMoreMedicines && inventory.length > 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 bg-orange-50 rounded-xl mt-3">
                      End of list • {inventory.length} medicines shown
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Cart */}
            {medicines.length > 0 && (
              <Card className="p-5 rounded-2xl border-orange-400 bg-orange-50/50">
                <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <ShoppingCart className="w-4 h-4 text-orange-500" />
                  Your Cart ({totalItems} items)
                </h3>
                <div className="space-y-2 mb-4">
                  {medicines.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-orange-200 shadow-sm">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl" role="img" aria-label={med.form}>{getMedicineIcon(med.form)}</span>
                        <div>
                          <span className="font-semibold text-sm text-slate-800">{med.name}</span>
                          <span className="block text-xs text-orange-600">{med.form}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="rounded-lg border-orange-300 hover:bg-orange-100" onClick={() => updateQuantity(idx, med.quantity - 1)} data-testid={`decrease-qty-${idx}`}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold text-orange-600">{med.quantity}</span>
                        <Button size="sm" variant="outline" className="rounded-lg border-orange-300 hover:bg-orange-100" onClick={() => updateQuantity(idx, med.quantity + 1)} disabled={med.quantity >= 20} data-testid={`increase-qty-${idx}`}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeMedicine(idx)} className="text-red-500 hover:text-red-600 hover:bg-red-50" data-testid={`remove-medicine-${idx}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Patient Info */}
            <Card className="p-5 rounded-2xl border-orange-100">
              <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Phone className="w-4 h-4 text-orange-500" />
                Your Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-600 text-sm">Full Name *</Label>
                  <Input
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                    placeholder="Enter your name"
                    className="mt-1.5 rounded-xl border-orange-200 focus:border-orange-400"
                    data-testid="patient-name"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm">Mobile Number *</Label>
                  <Input
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    className="mt-1.5 rounded-xl border-orange-200 focus:border-orange-400"
                    data-testid="patient-phone"
                  />
                  {!bookingLimits.loading && !bookingLimits.canBook && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      <p className="font-semibold">Order Limit Reached</p>
                      <p>You have {bookingLimits.activeOrders} active pharmacy orders.</p>
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
                    className="mt-1.5 rounded-xl border-orange-200 focus:border-orange-400"
                    data-testid="patient-email"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Required for order updates and invoice</p>
                </div>
              </div>
            </Card>

            {/* Prescription Upload */}
            <Card className="p-5 rounded-2xl border-orange-100">
              <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Upload className="w-4 h-4 text-orange-500" />
                Upload Prescription (Optional)
              </h3>
              <label className="cursor-pointer block">
                <div className={`px-4 py-6 border-2 border-dashed rounded-xl transition-colors text-center ${prescriptionUrl ? 'border-emerald-400 bg-emerald-50' : 'border-orange-200 hover:border-orange-400'}`}>
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </div>
                  ) : prescriptionUrl ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                      {prescriptionFile?.name || 'Prescription uploaded'}
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-orange-300" />
                      <p>Click to upload prescription image or PDF</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" data-testid="prescription-upload" />
              </label>
              
              {prescriptionUrl && (
                <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <p className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Prescription Preview
                  </p>
                  {prescriptionFile?.type?.includes('image') || prescriptionUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={prescriptionUrl} alt="Prescription" className="max-h-40 rounded border border-orange-200 object-contain" />
                  ) : (
                    <a href={prescriptionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      View PDF Prescription
                    </a>
                  )}
                </div>
              )}
            </Card>

            {/* Continue Button */}
            <Button 
              onClick={goToStep2} 
              disabled={medicines.length === 0 && !prescriptionUrl}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
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
            <Card className="p-8 rounded-3xl border-orange-100 shadow-lg">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mb-5">
                  <Shield className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    data-testid={`otp-input-${idx}`}
                  />
                ))}
              </div>

              <Button
                onClick={verifyOtp}
                disabled={otp.join('').length !== 6 || otpLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-6 rounded-full font-semibold"
                data-testid="verify-otp-btn"
              >
                {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
              </Button>

              <div className="text-center mt-5">
                {resendTimer > 0 ? (
                  <p className="text-sm text-slate-500">Resend OTP in {resendTimer}s</p>
                ) : (
                  <button onClick={sendOtp} disabled={otpLoading} className="text-sm text-orange-500 font-medium hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>
            </Card>

            <Button variant="outline" onClick={goToStep1} className="w-full rounded-full border-orange-200" data-testid="back-to-cart">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
          </div>
        )}

        {/* STEP 3: Delivery & Payment */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Phone verified: +91 {patientInfo.phone}</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Complete Your Order
              </h1>
            </div>

            {/* Order Summary */}
            <Card className="p-5 rounded-2xl bg-orange-50/50 border-orange-200">
              <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <ShoppingCart className="w-4 h-4 text-orange-500" />
                Order Summary ({totalItems} items)
              </h3>
              <div className="space-y-2">
                {medicines.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">{med.name}</span>
                    <span className="text-sm font-medium text-orange-600">x{med.quantity}</span>
                  </div>
                ))}
              </div>
              {prescriptionUrl && (
                <div className="mt-3 pt-3 border-t border-orange-200 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Prescription attached
                </div>
              )}
            </Card>

            {/* Loyalty Points */}
            {user && loyaltyPoints > 0 && (
              <Card className="p-5 rounded-2xl border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Star className="w-4 h-4 text-amber-500" />
                  Use Loyalty Points
                </h3>
                <p className="text-sm text-slate-600 mb-3">You have <span className="font-bold text-amber-600">{loyaltyPoints} points</span> (100 pts = ₹10 off)</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max={loyaltyPoints}
                    value={pointsToUse}
                    onChange={(e) => setPointsToUse(Math.min(parseInt(e.target.value) || 0, loyaltyPoints))}
                    className="w-32 rounded-xl border-amber-200"
                    data-testid="points-input"
                  />
                  <span className="text-sm text-slate-600">= ₹{discountAmount.toFixed(2)} discount</span>
                </div>
              </Card>
            )}

            {/* Delivery Address */}
            <Card className="p-5 rounded-2xl border-orange-100">
              <Label className="flex items-center gap-2 mb-2 font-medium text-slate-800">
                Delivery Address *
              </Label>
              <Textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your complete delivery address with landmark"
                className="min-h-24 rounded-xl border-orange-200 focus:border-orange-400"
                data-testid="delivery-address"
              />
            </Card>

            {/* Payment Method */}
            <Card className="p-5 rounded-2xl border-orange-100">
              <Label className="flex items-center gap-2 mb-3 font-medium text-slate-800">
                <CreditCard className="w-4 h-4 text-orange-500" />
                Payment Method
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-orange-100 hover:border-orange-300'
                  }`}
                  data-testid="payment-cod"
                >
                  <Banknote className="w-6 h-6 text-orange-500" />
                  <span className="text-sm font-medium text-slate-800">Cash on Delivery</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'card' ? 'border-orange-500 bg-orange-50' : 'border-orange-100 hover:border-orange-300'
                  }`}
                  data-testid="payment-card"
                >
                  <CreditCard className="w-6 h-6 text-orange-500" />
                  <span className="text-sm font-medium text-slate-800">QR / Card on Delivery</span>
                </button>
              </div>
            </Card>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !deliveryAddress.trim() || !bookingLimits.canBook}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              data-testid="place-order-btn"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Place Order</>
              )}
            </Button>
          </div>
        )}
      </main>

      {/* Loyalty Program Dialog */}
      <Dialog open={showLoyaltyInfo} onOpenChange={setShowLoyaltyInfo}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Crown className="w-6 h-6 text-amber-500" />
              Orange Pharmacy Loyalty Program
            </DialogTitle>
          </DialogHeader>

          <Tabs value={loyaltyTab} onValueChange={setLoyaltyTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-4 bg-orange-100 rounded-xl p-1">
              <TabsTrigger value="program" className="rounded-lg data-[state=active]:bg-white">Program</TabsTrigger>
              <TabsTrigger value="leaderboard" className="rounded-lg data-[state=active]:bg-white">Top 10</TabsTrigger>
              <TabsTrigger value="faq" className="rounded-lg data-[state=active]:bg-white">FAQ</TabsTrigger>
              <TabsTrigger value="terms" className="rounded-lg data-[state=active]:bg-white">Terms</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {/* Program Tab */}
              <TabsContent value="program" className="m-0 space-y-4">
                {/* User Status */}
                {user && userLoyaltyStatus && (
                  <Card className="p-4 bg-gradient-to-r from-orange-100 to-amber-100 border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-800">Your Status</p>
                        <p className="text-2xl font-bold text-orange-600">{loyaltyPoints} Points</p>
                      </div>
                      <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                        userLoyaltyStatus.tier === 'gold' ? 'bg-yellow-400 text-yellow-900' :
                        userLoyaltyStatus.tier === 'silver' ? 'bg-gray-300 text-gray-700' :
                        'bg-orange-400 text-orange-900'
                      }`}>
                        {userLoyaltyStatus.tier?.toUpperCase() || 'BRONZE'}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Tier Cards */}
                <div className="space-y-3">
                  {[
                    { tier: 'Bronze', color: 'orange', min: '₹0-399', points: '1 pt/₹100', benefits: ['Earn points on every purchase', 'Track order history'] },
                    { tier: 'Silver', color: 'gray', min: '₹400-999', points: '1.5 pts/₹100', benefits: ['All Bronze benefits', '5% discount on medicines', 'Priority delivery'] },
                    { tier: 'Gold', color: 'yellow', min: '₹1000+', points: '2 pts/₹100', benefits: ['All Silver benefits', '10% discount', 'FREE delivery', '10-Visit Reward!'] }
                  ].map((t) => (
                    <Card key={t.tier} className={`p-4 border-${t.color}-200 bg-${t.color}-50/50`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          t.tier === 'Gold' ? 'bg-yellow-400' : t.tier === 'Silver' ? 'bg-gray-300' : 'bg-orange-400'
                        }`}>
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{t.tier}</h4>
                          <p className="text-xs text-slate-500">{t.min} per bill • {t.points}</p>
                        </div>
                      </div>
                      <ul className="text-sm text-slate-600 space-y-1 ml-13">
                        {t.benefits.map((b, i) => <li key={i}>• {b}</li>)}
                      </ul>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="m-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Top Customers
                  </h3>
                  <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {['weekly', 'monthly', 'all'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setLeaderboardPeriod(p)}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${
                          leaderboardPeriod === p ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                        data-testid={`leaderboard-${p}`}
                      >
                        {p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : 'All Time'}
                      </button>
                    ))}
                  </div>
                </div>

                {leaderboardLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                ) : leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <Card key={idx} className={`p-3 ${
                        idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' :
                        idx === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300' :
                        idx === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' : ''
                      }`} data-testid={`leaderboard-entry-${idx}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-orange-400 text-orange-900' : 'bg-slate-100 text-slate-500'
                          }`}>
                            #{entry.rank}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-slate-800">{entry.display_name}</span>
                            <div className="text-xs text-slate-500">{entry.total_orders} orders</div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <span className="font-bold text-orange-600">{entry.points}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center bg-slate-50">
                    <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No rankings yet. Be the first!</p>
                  </Card>
                )}
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" className="m-0">
                {loyaltyFAQ?.faqs ? (
                  <div className="space-y-3">
                    {loyaltyFAQ.faqs.map((faq, idx) => (
                      <Card key={idx} className="p-4">
                        <h4 className="font-semibold text-slate-800 mb-2">Q: {faq.q}</h4>
                        <p className="text-sm text-slate-600">{faq.a}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">Loading FAQ...</div>
                )}
              </TabsContent>

              {/* Terms Tab */}
              <TabsContent value="terms" className="m-0">
                {loyaltyTerms?.sections ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg">{loyaltyTerms.title}</h3>
                      <p className="text-xs text-slate-500">Effective: {loyaltyTerms.effective_date}</p>
                    </div>
                    {loyaltyTerms.sections.map((section, idx) => (
                      <div key={idx} className="border-b pb-3 last:border-0">
                        <h4 className="font-semibold text-slate-800 mb-2">{section.title}</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {section.content.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">Loading Terms...</div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Refill Reminders Dialog */}
      <Dialog open={showRefillDialog} onOpenChange={setShowRefillDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Refill Reminders
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Create New Reminder Form */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-slate-800 mb-3">Create New Reminder</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-slate-600">Medicine Name *</Label>
                  <Input
                    value={refillForm.medicine_name}
                    onChange={(e) => setRefillForm({...refillForm, medicine_name: e.target.value})}
                    placeholder="e.g., Metformin 500mg"
                    className="mt-1"
                    data-testid="refill-medicine-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-slate-600">Dosage</Label>
                    <Input
                      value={refillForm.dosage}
                      onChange={(e) => setRefillForm({...refillForm, dosage: e.target.value})}
                      placeholder="e.g., 1 tablet"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600">Frequency</Label>
                    <select
                      value={refillForm.frequency}
                      onChange={(e) => setRefillForm({...refillForm, frequency: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-slate-600">Reminder Time</Label>
                    <Input
                      type="time"
                      value={refillForm.reminder_time}
                      onChange={(e) => setRefillForm({...refillForm, reminder_time: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600">Notify Via</Label>
                    <select
                      value={refillForm.reminder_type}
                      onChange={(e) => setRefillForm({...refillForm, reminder_type: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={createRefillReminder}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  data-testid="create-refill-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Reminder
                </Button>
              </div>
            </Card>

            {/* Existing Reminders */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Your Active Reminders</h4>
              {loadingRefills ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : refillReminders.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {refillReminders.map((reminder, idx) => (
                    <Card key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{reminder.medicine_name}</p>
                        <p className="text-xs text-slate-500">{reminder.frequency} • {reminder.reminder_time}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-4 bg-slate-50 text-center">
                  <p className="text-sm text-slate-500">No reminders yet. Create one above!</p>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Box Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Monthly Subscription Box
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Benefits */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <h4 className="font-semibold text-purple-800 mb-2">Why Subscribe?</h4>
              <ul className="space-y-1.5 text-sm text-purple-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  Save 10% on every order
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  Free home delivery
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  Never run out of medicines
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  Pause or cancel anytime
                </li>
              </ul>
            </div>

            {/* Create Subscription */}
            {medicines.length > 0 ? (
              <Card className="p-4 border-purple-200">
                <h4 className="font-semibold text-slate-800 mb-3">Subscribe to Your Cart</h4>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-2">Medicines in cart:</p>
                    {medicines.slice(0, 3).map((med, idx) => (
                      <p key={idx} className="text-sm font-medium text-slate-700">{med.name} × {med.quantity}</p>
                    ))}
                    {medicines.length > 3 && (
                      <p className="text-xs text-slate-400">+{medicines.length - 3} more</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-slate-600">Delivery Day</Label>
                      <select
                        value={subscriptionForm.delivery_day}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, delivery_day: parseInt(e.target.value)})}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      >
                        {[1,5,10,15,20,25].map(day => (
                          <option key={day} value={day}>{day}th of month</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-600">Frequency</Label>
                      <select
                        value={subscriptionForm.delivery_frequency}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, delivery_frequency: e.target.value})}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="bimonthly">Every 2 Months</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={createSubscriptionBox}
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    data-testid="create-subscription-btn"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Subscription (Save 10%)
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800 text-center">
                  Add medicines to your cart first, then subscribe for auto-delivery!
                </p>
              </Card>
            )}

            {/* Existing Subscriptions */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Your Subscriptions</h4>
              {loadingSubscriptions ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : subscriptionBoxes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {subscriptionBoxes.map((sub, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm text-slate-800">{sub.medicines?.length || 0} medicines</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {sub.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {sub.delivery_frequency} delivery on {sub.delivery_day}th
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSubscription(sub.id, sub.status)}
                        className="w-full"
                      >
                        {sub.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-4 bg-slate-50 text-center">
                  <p className="text-sm text-slate-500">No subscriptions yet.</p>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Bottom Navigation */}
      <BottomNav />

      {/* Cashfree Payment Dialog */}
      <CashfreeCheckout
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        orderDetails={{
          type: 'pharmacy',
          amount: estimatedTotal,
          productId: `PHARMACY_${Date.now()}`,
          customerName: patientInfo.name,
          customerEmail: patientInfo.email,
          customerPhone: patientInfo.phone
        }}
        onPaymentSuccess={handlePaymentSuccess}
        allowCOD={true}
        returnPath="/pharmacy"
      />
    </div>
  );
};

export default Pharmacy;
