import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import ReportTrendsChart from '@/components/ReportTrendsChart';
import ServiceHeader from '@/components/ServiceHeader';
import PackageBuilder from '@/components/PackageBuilder';
import BookingConfirmation from '@/components/BookingConfirmation';
import { toast } from 'sonner';
import axios from 'axios';
import { lightTap, successPattern } from '@/utils/haptics';
import TEST_DETAILS_MAP from '@/lib/test-details';
import { FlaskConical, Heart, Clock, Home, Shield, ChevronRight, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { MangoBanners } from '@/components/mango';
import { theme, pathologyTests, testPreparations, testPreparationInfo, testCategories, popularPackages, popularTests, timeSlots } from '@/data/mangoData';
import MangoTutorial from '@/components/MangoTutorial';

// Refactored sub-components
import MangoContext from './mango/MangoContext';
import MangoBrowseView from './mango/MangoBrowseView';
import MangoTestSelection from './mango/MangoTestSelection';
import MangoOTPStep from './mango/MangoOTPStep';
import MangoBookingStep from './mango/MangoBookingStep';
import MangoCheckoutInlineStep from './mango/MangoCheckoutInlineStep';
import MangoCheckoutDedicated from './mango/MangoCheckoutDedicated';
import MangoModals from './mango/MangoModals';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============================================
// MAIN PROTON COMPONENT
// ============================================
const Proton = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { labCart, addToLabCart, removeFromLabCart, clearLabCart, getLabCartCount, labMembers, labTestAssignments, getTestMember, getMemberById } = useCart();
  
  const getStepFromParams = () => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      if (stepParam === 'checkout') return 4;
      const parsed = parseInt(stepParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) return parsed;
    }
    return 0;
  };
  
  const [currentStep, setCurrentStepInternal] = useState(getStepFromParams);
  
  useEffect(() => {
    const newStep = getStepFromParams();
    if (newStep !== currentStep) setCurrentStepInternal(newStep);
  }, [searchParams]);
  
  const setCurrentStep = (step) => {
    setCurrentStepInternal(step);
    const newParams = new URLSearchParams(searchParams);
    if (step === 0) newParams.delete('step');
    else if (step === 4) newParams.set('step', 'checkout');
    else newParams.set('step', step.toString());
    setSearchParams(newParams, { replace: true });
  };
  
  const selectedTests = labCart.map(t => t.name);
  const setSelectedTests = (tests) => {
    clearLabCart();
    tests.forEach(testName => {
      const testInfo = testPreparationInfo[testName] || { name: testName, price: 0 };
      addToLabCart({ name: testName, price: testInfo.price || 0, parameters: testInfo.parameters });
    });
  };

  const [customTest, setCustomTest] = useState('');
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('09:00-11:00');
  const [patientInfo, setPatientInfo] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('pregnancy');
  const [activeTab, setActiveTab] = useState('pathology');
  const [collectionType, setCollectionType] = useState('home');
  const [showTrends, setShowTrends] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);
  const [showMangoTutorial, setShowMangoTutorial] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [apiTestCatalog, setApiTestCatalog] = useState([]);
  
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await axios.get(`${API}/mango/test-catalog`);
        if (res.data?.tests?.length > 0) setApiTestCatalog(res.data.tests);
      } catch (e) { /* fallback */ }
    };
    fetchCatalog();
  }, []);
  
  const getTestPrice = (testName) => {
    const apiTest = apiTestCatalog.find(t => t.name === testName);
    if (apiTest) return apiTest.price;
    return testPreparationInfo[testName]?.price || 0;
  };
  
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [wishlist, setWishlist] = useState(() => { try { return JSON.parse(localStorage.getItem('mango_wishlist') || '[]'); } catch { return []; } });
  const [showWishlist, setShowWishlist] = useState(false);
  const [hasSavedCart, setHasSavedCart] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState(() => { try { return JSON.parse(localStorage.getItem('mango_recently_viewed') || '[]'); } catch { return []; } });
  
  const trackTestView = (testName) => {
    setRecentlyViewed(prev => {
      const updated = [testName, ...prev.filter(t => t !== testName)].slice(0, 8);
      localStorage.setItem('mango_recently_viewed', JSON.stringify(updated));
      return updated;
    });
  };
  
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogDept, setCatalogDept] = useState('All');
  const [catalogLimit, setCatalogLimit] = useState(20);
  const [organFilter, setOrganFilter] = useState(null);
  const [aiCategories, setAiCategories] = useState({});
  const [catalogSort, setCatalogSort] = useState('');
  const [catalogFilters, setCatalogFilters] = useState({});
  const mangoLightZoneRef = useRef(null);
  const [mangoHeaderLight, setMangoHeaderLight] = useState(false);

  useEffect(() => {
    const handleScroll = () => setMangoHeaderLight(window.scrollY > 800);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentStep]);

  const handleCatalogFilterChange = (key, value) => {
    setCatalogFilters(prev => prev[key] === value ? { ...prev, [key]: '' } : { ...prev, [key]: value });
  };
  const clearCatalogFilters = () => { setCatalogFilters({}); setCatalogSort(''); setCatalogSearch(''); setCatalogDept('All'); setOrganFilter(null); };
  
  const apiCatalogDepts = [...new Set(apiTestCatalog.map(t => t.category || t.department).filter(Boolean))].sort();
  const filteredCatalogTests = apiTestCatalog.filter(t => {
    if (organFilter) {
      if (catalogSearch && !t.name.toLowerCase().includes(catalogSearch.toLowerCase())) return false;
      const ai = aiCategories[t.name];
      if (ai?.category === organFilter) return true;
      const n = t.name.toLowerCase();
      const organKeywords = {
        'Cardiac': ['heart', 'cardiac', 'troponin', 'bnp', 'cpk', 'ecg', 'cholesterol', 'lipid', 'ldl', 'hdl'],
        'Kidney': ['kidney', 'renal', 'creatinine', 'urea', 'bun', 'uric acid', 'gfr', 'urine'],
        'Liver': ['liver', 'hepatic', 'sgpt', 'sgot', 'bilirubin', 'alt', 'ast', 'ggt', 'albumin'],
        'Diabetes': ['diabetes', 'glucose', 'sugar', 'hba1c', 'insulin', 'ogtt', 'fasting', 'pp', 'glycated'],
        'Vitamin': ['vitamin', 'vit d', 'vit b12', 'folate', 'folic', 'zinc', 'magnesium'],
        'Hormones': ['hormone', 'testosterone', 'cortisol', 'dhea', 'fsh', 'lh', 'growth', 'thyroid', 'tsh', 't3', 't4', 'ft3', 'ft4'],
        'Essential': ['health checkup', 'full body', 'complete', 'wellness', 'master', 'package', 'panel', 'profile', 'gut', 'digestive', 'stool'],
        'Pregnancy': ['pregnancy', 'prenatal', 'beta hcg', 'prolactin', 'estrogen', 'progesterone', 'amh', 'rubella', 'torch', 'double marker', 'triple marker', 'anomaly', 'pap'],
        'Bone': ['bone', 'calcium', 'phosphorus', 'dexa', 'osteo', 'arthritis', 'joint', 'collagen', 'vitamin d', 'vit d'],
      };
      return (organKeywords[organFilter] || []).some(k => n.includes(k));
    }
    if (catalogDept !== 'All' && (t.category || t.department) !== catalogDept) return false;
    if (catalogSearch && !t.name.toLowerCase().includes(catalogSearch.toLowerCase())) return false;
    const price = t.price || 0;
    if (catalogFilters.priceRange === 'under500' && price > 500) return false;
    if (catalogFilters.priceRange === '500to1500' && (price < 500 || price > 1500)) return false;
    if (catalogFilters.priceRange === 'above1500' && price < 1500) return false;
    if (catalogFilters.fasting === 'yes' && !t.fasting_required) return false;
    if (catalogFilters.fasting === 'no' && t.fasting_required) return false;
    if (catalogFilters.sampleType && t.sample_type && !t.sample_type.toLowerCase().includes(catalogFilters.sampleType.toLowerCase())) return false;
    return true;
  });
  if (catalogSort === 'price_low') filteredCatalogTests.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (catalogSort === 'price_high') filteredCatalogTests.sort((a, b) => (b.price || 0) - (a.price || 0));
  else if (catalogSort === 'name_az') filteredCatalogTests.sort((a, b) => a.name.localeCompare(b.name));
  else if (catalogSort === 'name_za') filteredCatalogTests.sort((a, b) => b.name.localeCompare(a.name));
  const catalogTestsTotal = filteredCatalogTests.length;
  const displayedCatalogTests = filteredCatalogTests.slice(0, catalogLimit);
  
  useEffect(() => { if (localStorage.getItem('mango_saved_cart')) setHasSavedCart(true); }, []);
  useEffect(() => { localStorage.setItem('mango_wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  
  const toggleWishlist = (test) => {
    const exists = wishlist.some(w => w.name === test.name);
    if (exists) { setWishlist(wishlist.filter(w => w.name !== test.name)); toast.success(`Removed ${test.name} from wishlist`); }
    else { setWishlist([...wishlist, { name: test.name, price: test.price, category: test.category || 'General' }]); toast.success(`Added ${test.name} to wishlist`); }
  };
  const isInWishlist = (testName) => wishlist.some(w => w.name === testName);
  
  const saveCartForLater = () => {
    if (selectedTests.length === 0) { toast.error('No tests selected to save'); return; }
    localStorage.setItem('mango_saved_cart', JSON.stringify({ tests: selectedTests, patientInfo, collectionType, preferredDate: preferredDate.toISOString(), savedAt: new Date().toISOString() }));
    toast.success('Cart saved! You can continue later.'); setHasSavedCart(true);
  };
  const restoreSavedCart = () => {
    const saved = localStorage.getItem('mango_saved_cart');
    if (saved) { const d = JSON.parse(saved); setSelectedTests(d.tests || []); setPatientInfo(prev => ({ ...prev, ...d.patientInfo })); setCollectionType(d.collectionType || 'home'); if (d.preferredDate) setPreferredDate(new Date(d.preferredDate)); toast.success('Cart restored!'); setCurrentStep(1); }
  };
  const clearSavedCart = () => { localStorage.removeItem('mango_saved_cart'); setHasSavedCart(false); toast.success('Saved cart cleared'); };

  const auth = useUnifiedAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState('');
  const otpRefs = useRef([]);
  const [bookingLimits, setBookingLimits] = useState({ canBook: true, activeOrders: 0, loading: true });

  useEffect(() => {
    const testsParam = searchParams.get('tests');
    const fromParam = searchParams.get('from');
    if (testsParam && fromParam === 'glydex') {
      const pre = decodeURIComponent(testsParam).split(',');
      setSelectedTests(pre); setActiveTab('pathology'); setActiveCategory('diabetes');
      toast.success(`${pre.length} test${pre.length > 1 ? 's' : ''} pre-selected from Glydex`);
    }
  }, [searchParams]);

  useEffect(() => {
    const check = async () => {
      if (!patientInfo.phone || patientInfo.phone.length < 10) { setBookingLimits({ canBook: true, activeOrders: 0, loading: false }); return; }
      try {
        const r = await axios.get(`${API}/booking-limits/status`, { params: { phone: patientInfo.phone } });
        setBookingLimits({ canBook: r.data.can_book_diagnostic, activeOrders: r.data.active_diagnostic_orders, loading: false });
      } catch { setBookingLimits({ canBook: true, activeOrders: 0, loading: false }); }
    };
    const t = setTimeout(check, 500);
    return () => clearTimeout(t);
  }, [patientInfo.phone]);

  const toggleTest = (test) => { lightTap(); if (selectedTests.includes(test)) removeFromLabCart(test); else { const ti = testPreparationInfo[test] || { name: test, price: 0 }; addToLabCart({ name: test, price: ti.price || 0, parameters: ti.parameters }); } };
  const addCustomTest = () => { if (customTest.trim() && !selectedTests.includes(customTest.trim())) { lightTap(); addToLabCart({ name: customTest.trim(), price: 0 }); setCustomTest(''); successPattern(); toast.success('Custom test added'); } };
  const removeTest = (test) => { lightTap(); removeFromLabCart(test); };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setPrescriptionFile(file); setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file); if (user) fd.append('user_id', user.id);
      const r = await axios.post(`${API}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data', ...(user && { Authorization: `Bearer ${localStorage.getItem('token')}` }) } });
      setPrescriptionUrl(r.data.url); toast.success('Prescription uploaded successfully');
    } catch { toast.error('Failed to upload prescription'); } finally { setUploading(false); }
  };

  const sendOtp = async () => { if (!patientInfo.phone || patientInfo.phone.length < 10) { toast.error('Please enter a valid mobile number'); return; } const r = await auth.sendOtp(patientInfo.phone, 'lab_booking'); if (r.success) setTimeout(() => otpRefs.current[0]?.focus(), 100); };
  const verifyOtp = async () => { const v = otp.join(''); if (v.length !== 6) { toast.error('Please enter complete 6-digit OTP'); return; } const r = await auth.verifyOtp(patientInfo.phone, v); if (r.success) { setVerificationToken('verified_' + patientInfo.phone); setCurrentStep(3); window.scrollTo(0, 0); } else { setOtp(['', '', '', '', '', '']); otpRefs.current[0]?.focus(); } };
  const handleOtpChange = (index, value) => { if (!/^\d*$/.test(value)) return; const n = [...otp]; n[index] = value.slice(-1); setOtp(n); if (value && index < 5) otpRefs.current[index + 1]?.focus(); };
  const handleOtpKeyDown = (index, e) => { if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus(); };

  const goToStep2 = () => {
    if (selectedTests.length === 0 && !prescriptionUrl) { toast.error('Please select tests OR upload a prescription'); return; }
    if (!patientInfo.name.trim()) { toast.error('Please enter your name'); return; }
    if (!patientInfo.phone || patientInfo.phone.length < 10) { toast.error('Please enter a valid mobile number'); return; }
    if (verificationToken) { setCurrentStep(3); window.scrollTo(0, 0); return; }
    sendOtp(); setCurrentStep(2); window.scrollTo(0, 0);
  };
  const goToStep1 = () => { setCurrentStep(1); setOtp(['', '', '', '', '', '']); window.scrollTo(0, 0); };

  const handleSubmit = async () => {
    if (!preferredDate) { toast.error('Please select a preferred date'); return; }
    if (patientInfo.email && !patientInfo.email.includes('@')) { toast.error('Please enter a valid email address'); return; }
    if (collectionType === 'home' && !patientInfo.address?.trim()) { toast.error('Please enter your address for home sample collection'); return; }
    const totalAmount = labCart.reduce((sum, t) => sum + (t.price || 0), 0);
    const memberAssignments = labCart.map(t => { const m = getMemberById(getTestMember(t.name)); return { test: t.name, memberName: m?.name || patientInfo.name, memberAge: m?.age || '' }; });
    const params = new URLSearchParams({ type: 'mango', name: patientInfo.name, phone: patientInfo.phone, email: patientInfo.email || '', items: selectedTests.join('||'), amount: totalAmount.toString(), address: encodeURIComponent(patientInfo.address || ''), collection: collectionType, date: format(preferredDate, 'yyyy-MM-dd'), time: preferredTimeSlot, members: JSON.stringify(memberAssignments) });
    navigate(`/payment?${params.toString()}`);
  };

  const handlePaymentSuccess = async (paymentInfo) => {
    setLoading(true);
    try {
      const totalAmount = labCart.reduce((s, t) => s + (t.price || 0), 0);
      const ma = labCart.map(t => { const m = getMemberById(getTestMember(t.name)); return { test: t.name, member_name: m?.name || patientInfo.name, member_age: m?.age || '' }; });
      const od = { tests: selectedTests, prescription_url: prescriptionUrl || null, preferred_date: format(preferredDate, 'yyyy-MM-dd'), preferred_time_slot: preferredTimeSlot, patient_name: patientInfo.name, patient_phone: patientInfo.phone, patient_email: patientInfo.email || null, patient_address: collectionType === 'home' ? patientInfo.address : null, payment_method: paymentInfo.method, payment_status: paymentInfo.status || (paymentInfo.method === 'cod' ? 'pending' : 'paid'), total_amount: totalAmount, cashfree_order_id: paymentInfo.orderId || null, collection_type: collectionType, member_assignments: ma };
      const r = await axios.post(`${API}/diagnostics`, od, { headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {} });
      toast.success(collectionType === 'home' ? 'Home sample collection booked!' : 'Test booking confirmed!');
      setBookingDetails({ orderId: r.data?.booking_id || r.data?.id || `MNG-${Date.now()}`, tests: selectedTests, date: format(preferredDate, 'EEEE, MMMM d, yyyy'), timeSlot: preferredTimeSlot, collectionType, trackingPath: '/my-orders', bookingCode: r.data?.booking_code || null });
      setShowBookingConfirmation(true);
    } catch { toast.error('Failed to process booking'); } finally { setLoading(false); }
  };

  const getSelectedTestPreparations = () => selectedTests.filter(t => testPreparations[t]).map(t => ({ test: t, ...testPreparations[t] }));
  const getCurrentCategoryTests = () => { const c = testCategories.find(c => c.id === activeCategory); return c ? c.tests.map(t => t.name) : []; };
  const getAllTests = () => [...new Set([...pathologyTests.blood, ...pathologyTests.urine, ...pathologyTests.sputum, ...pathologyTests.packages])];
  const getFilteredTests = () => { if (!testSearchTerm.trim()) return []; const s = testSearchTerm.toLowerCase(); return getAllTests().filter(t => t.toLowerCase().includes(s)); };
  const filteredTests = getFilteredTests();

  const [selectedTestDetails, setSelectedTestDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsModal, setDetailsModal] = useState(null);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const names = [...new Set([...popularTests.map(t => t.name), ...Object.keys(TEST_DETAILS_MAP || {}).slice(0, 30)])].slice(0, 40);
        const r = await axios.post(`${BACKEND_URL}/api/tests/categorize`, names);
        if (r.data?.tests) setAiCategories(r.data.tests);
      } catch { /* AI categorization not available */ }
    };
    fetchCats();
  }, []);

  const getCategoryStyle = (testName) => {
    const ai = aiCategories[testName];
    if (ai?.category) {
      const COLORS = {
        "Women's Health": { gradient: 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)', label: "Women's Health" },
        "Diabetes": { gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)', label: 'Diabetes' },
        "Cardiac": { gradient: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)', label: 'Cardiac' },
        "Kidney": { gradient: 'linear-gradient(135deg, #6D28D9 0%, #A78BFA 100%)', label: 'Kidney' },
        "Thyroid": { gradient: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', label: 'Thyroid' },
        "Liver": { gradient: 'linear-gradient(135deg, #C2410C 0%, #F97316 100%)', label: 'Liver' },
        "Essential": { gradient: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)', label: 'Essential' },
        "Vitamin": { gradient: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)', label: 'Vitamin' },
        "Hormones": { gradient: 'linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)', label: 'Hormones' },
        "Hematology": { gradient: 'linear-gradient(135deg, #9F1239 0%, #FB7185 100%)', label: 'Hematology' },
        "Infection": { gradient: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)', label: 'Infection' },
        "Allergy": { gradient: 'linear-gradient(135deg, #4338CA 0%, #6366F1 100%)', label: 'Allergy' },
      };
      return COLORS[ai.category] || { gradient: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)', label: ai.category };
    }
    const n = testName.toLowerCase();
    if (n.includes('amh') || n.includes('estradiol') || n.includes('prolactin') || n.includes('fertility')) return { gradient: 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)', label: "Women's Health" };
    if (n.includes('hba1c') || n.includes('blood sugar') || n.includes('glucose') || n.includes('insulin')) return { gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)', label: 'Diabetes' };
    if (n.includes('lipid') || n.includes('cholesterol') || n.includes('cardiac') || n.includes('troponin')) return { gradient: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)', label: 'Cardiac' };
    if (n.includes('kidney') || n.includes('rft') || n.includes('creatinine') || n.includes('uric') || n.includes('urine')) return { gradient: 'linear-gradient(135deg, #6D28D9 0%, #A78BFA 100%)', label: 'Kidney' };
    if (n.includes('thyroid') || n.includes('tsh') || n.includes('t3') || n.includes('t4')) return { gradient: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', label: 'Thyroid' };
    if (n.includes('liver') || n.includes('lft') || n.includes('sgpt') || n.includes('sgot') || n.includes('bilirubin')) return { gradient: 'linear-gradient(135deg, #C2410C 0%, #F97316 100%)', label: 'Liver' };
    return { gradient: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)', label: 'Essential' };
  };

  const fetchTestDetails = async (testName, testObj) => {
    setLoadingDetails(true);
    try { const r = await axios.get(`${BACKEND_URL}/api/tests/details`, { params: { test_name: testName } }); setDetailsModal({ ...testObj, ...r.data, name: testName }); }
    catch { setDetailsModal({ ...testObj, name: testName, description: `${testName} is a diagnostic laboratory test.` }); }
    setLoadingDetails(false);
  };

  const getTestDetails = (name) => {
    if (TEST_DETAILS_MAP[name]) return TEST_DETAILS_MAP[name];
    const base = name.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (TEST_DETAILS_MAP[base]) return TEST_DETAILS_MAP[base];
    const key = Object.keys(TEST_DETAILS_MAP).find(k => name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(base.toLowerCase()));
    return key ? TEST_DETAILS_MAP[key] : {};
  };

  const handlePackageSelect = (pkg) => addToLabCart({ name: pkg.name, price: pkg.price || 0, parameters: pkg.tests?.length || 3, tests: pkg.tests });
  const handleTestSelect = (test) => addToLabCart({ name: test.name, price: test.price || 0, parameters: test.testsIncluded || test.parameters || 1 });

  // ===== Context value - shared with all sub-components =====
  const ctx = {
    navigate, searchParams, setSearchParams, user, currentStep, setCurrentStep,
    selectedTests, setSelectedTests, customTest, setCustomTest, testSearchTerm, setTestSearchTerm,
    prescriptionFile, prescriptionUrl, preferredDate, setPreferredDate, preferredTimeSlot, setPreferredTimeSlot,
    patientInfo, setPatientInfo, paymentMethod, setPaymentMethod, uploading, loading,
    activeCategory, setActiveCategory, activeTab, setActiveTab, collectionType, setCollectionType,
    showTrends, setShowTrends, showPaymentDialog, setShowPaymentDialog, showPackageBuilder, setShowPackageBuilder,
    showMangoTutorial, setShowMangoTutorial, orderTotal, setOrderTotal,
    apiTestCatalog, catalogSearch, setCatalogSearch, catalogDept, setCatalogDept, catalogLimit, setCatalogLimit,
    organFilter, setOrganFilter, aiCategories, catalogSort, setCatalogSort, catalogFilters, catalogTestsTotal,
    displayedCatalogTests, wishlist, showWishlist, setShowWishlist, recentlyViewed, hasSavedCart,
    loadingDetails, detailsModal, setDetailsModal, selectedTestDetails, setSelectedTestDetails,
    otp, setOtp, verificationToken, bookingLimits, mangoHeaderLight, mangoLightZoneRef,
    labCart, addToLabCart, removeFromLabCart, clearLabCart, getLabCartCount, labMembers, labTestAssignments,
    getTestMember, getMemberById, showBookingConfirmation, bookingDetails,
    toggleTest, addCustomTest, removeTest, handleFileUpload, goToStep1, goToStep2, handleSubmit,
    handlePaymentSuccess, getSelectedTestPreparations, getCurrentCategoryTests, getFilteredTests,
    filteredTests, getCategoryStyle, fetchTestDetails, handlePackageSelect, handleTestSelect,
    toggleWishlist, isInWishlist, saveCartForLater, restoreSavedCart, clearSavedCart,
    handleCatalogFilterChange, clearCatalogFilters, getTestPrice, trackTestView, getTestDetails,
    sendOtp, verifyOtp, handleOtpChange, handleOtpKeyDown, apiCatalogDepts,
    auth, otpRefs,
  };

  // ===== Early returns =====
  if (showBookingConfirmation && bookingDetails) {
    const totalAmount = labCart.reduce((s, t) => s + (t.price || 0), 0);
    return <BookingConfirmation type="mango" paymentMethod={paymentMethod} collectionMode={bookingDetails.collectionType}
      orderDetails={{
        orderId: bookingDetails.orderId,
        bookingId: bookingDetails.orderId,
        trackingPath: bookingDetails.trackingPath,
        bookingCode: bookingDetails.bookingCode,
        patientName: patientInfo.name,
        phone: patientInfo.phone,
        date: bookingDetails.date,
        time: bookingDetails.timeSlot,
        timeSlot: bookingDetails.timeSlot,
        amount: totalAmount,
        totalAmount: totalAmount,
        tests: labCart.map(t => ({ name: t.name, price: t.price })),
        items: labCart.map(t => ({ name: t.name, price: t.price })),
      }} />;
  }

  if (currentStep === 4) {
    return <MangoContext.Provider value={ctx}><MangoCheckoutDedicated /></MangoContext.Provider>;
  }

  // ===== Main render =====
  return (
    <MangoContext.Provider value={ctx}>
      <div className="min-h-screen w-full bg-[#050510]" style={{ contain: 'layout style', willChange: 'auto' }}>
        {/* Background glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" style={{ transform: 'translateZ(0)' }}>
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-gradient-to-br from-[#C8F56A]/8 via-[#A3D944]/4 to-transparent rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-gradient-to-br from-[#C8F56A]/6 via-[#D4E157]/3 to-transparent rounded-full blur-[120px]"></div>
        </div>

        <ServiceHeader lightMode={currentStep === 0 && mangoHeaderLight} />

        {/* Hero Section */}
        <div className="bg-gradient-to-b from-[#111111] to-[#0A0A0A] relative overflow-hidden w-full border-b border-[#1A1A1A]">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl bg-[#050510] shadow-lg shadow-[#C8F56A]/10 flex items-center justify-center overflow-hidden border border-[#C8F56A]/20">
                  <img loading="lazy" src="https://customer-assets.emergentagent.com/job_4625448c-b743-44eb-9c92-5eb654622ad3/artifacts/tz9gzbot_file_00000000e58c720bb27d92d685f442c3.png" alt="Mango Health Labs" className="w-full h-full object-cover scale-110" />
                </div>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Blood Test At Home</h1>
                <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-6">
                  <span className="text-[#C8F56A] text-sm sm:text-lg md:text-xl whitespace-nowrap font-semibold">Sample Collection in 60 Mins</span>
                  <span className="text-[#C8F56A] text-lg sm:text-2xl">{'\u21DD'}</span>
                </div>
                <div className="flex justify-center gap-4 sm:gap-8">
                  {[{ icon: Clock, title: 'Reports', sub: 'in 6 Hours' }, { icon: Home, title: 'Home', sub: 'Collection' }, { icon: Shield, title: 'NABL', sub: 'Certified' }].map((b, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-[#1A1A1A] rounded-xl sm:rounded-2xl flex items-center justify-center mb-1 sm:mb-2 border border-[#2A2A2A]"><b.icon className="w-4 h-4 sm:w-6 sm:h-6 text-[#C8F56A]" /></div>
                      <span className="text-white text-xs sm:text-sm font-medium">{b.title}</span>
                      <span className="text-gray-500 text-[10px] sm:text-xs">{b.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#111111] py-3 border-t border-[#1A1A1A]">
            <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-6">
              <button onClick={() => setShowWishlist(true)} className="flex items-center gap-2 text-gray-400 hover:text-[#C8F56A] transition-all" data-testid="open-wishlist-btn">
                <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-[#C8F56A] text-[#C8F56A]' : ''}`} />
                <span className="text-sm font-medium">Wishlist</span>
                {wishlist.length > 0 && <span className="bg-[#C8F56A] text-black text-xs px-2 py-0.5 rounded-full font-bold">{wishlist.length}</span>}
              </button>
              <span className="text-[#2A2A2A]">|</span>
              <span className="text-sm text-gray-500 font-medium"><span className="text-[#C8F56A] font-bold">FREE</span> home sample collection</span>
            </div>
          </div>
        </div>

        {/* How to Book Banner */}
        <div className="bg-[#111111] px-4 pt-3 pb-1">
          <button onClick={() => setShowMangoTutorial(true)} className="w-full flex items-center gap-2.5 py-2 px-3.5 rounded-xl active:scale-[0.98] transition-all"
            style={{ background: 'rgba(200,245,106,0.06)', border: '1px solid rgba(200,245,106,0.15)' }} data-testid="how-to-book-mango">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C8F56A, #10B981)' }}><FlaskConical className="w-3.5 h-3.5 text-black" /></div>
            <span className="text-xs font-bold text-[#C8F56A] flex-1 text-left">How to Book</span>
            <span className="text-[9px] text-[#C8F56A]/50 font-medium">3 steps</span>
            <svg className="w-3.5 h-3.5 text-[#C8F56A]/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        {/* Build Your Own Package Banner */}
        <div className="bg-[#111111] text-white border-b border-[#1A1A1A]" data-testid="package-builder-banner-top">
          <div className="w-full px-4 py-4">
            <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
              <div className="flex items-center gap-4">
                <div className="bg-[#1A1A1A] rounded-2xl p-3 flex-shrink-0 border border-[#2A2A2A]"><FlaskConical className="w-6 h-6 text-[#C8F56A]" /></div>
                <div><p className="font-semibold text-base text-white">Build Your Own Package</p><p className="text-sm text-[#C8F56A]">Select tests &bull; Customize your checkup</p></div>
              </div>
              <Button onClick={() => setShowPackageBuilder(true)} variant="secondary" size="sm"
                className="bg-[#C8F56A] text-black hover:bg-[#D4E157] rounded-full font-bold px-6 py-2 shadow-lg shadow-[#C8F56A]/10" data-testid="package-builder-btn">Build</Button>
            </div>
          </div>
        </div>

        {/* ===== Step Content ===== */}
        {currentStep === 0 ? (
          <MangoBrowseView />
        ) : (
          <>
            {currentStep !== 4 && <MangoBanners setShowPackageBuilder={setShowPackageBuilder} />}
            <main className="w-full px-4 py-4">
              <div className="bg-white rounded-3xl shadow-xl p-4">
                {/* Health Trends */}
                {currentStep !== 4 && patientInfo.phone && patientInfo.phone.length === 10 && (
                  <div className="mb-4">
                    <button onClick={() => setShowTrends(!showTrends)}
                      className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:shadow-md transition-all" data-testid="show-trends-btn">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div>
                        <div className="text-left"><h3 className="font-semibold text-green-600 text-sm">Your Health Trends</h3><p className="text-xs text-green-500">View your previous test results</p></div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-green-600 transition-transform ${showTrends ? 'rotate-90' : ''}`} />
                    </button>
                    {showTrends && <div className="mt-3"><ReportTrendsChart patientId={patientInfo.phone} patientPhone={patientInfo.phone} /></div>}
                  </div>
                )}

                {currentStep === 1 && <MangoTestSelection />}
                {currentStep === 2 && <MangoOTPStep />}
                {currentStep === 3 && <MangoBookingStep />}
                {currentStep === 4 && <MangoCheckoutInlineStep />}
              </div>
            </main>
          </>
        )}

        <MangoModals />
        <PackageBuilder isOpen={showPackageBuilder} onClose={() => setShowPackageBuilder(false)}
          onAddToCart={(tests) => { tests.forEach(t => addToLabCart({ name: t.name, price: t.price || 0 })); toast.success(`Added ${tests.length} tests to cart!`); }} />
        <MangoTutorial open={showMangoTutorial} onClose={() => setShowMangoTutorial(false)} />
      </div>
    </MangoContext.Provider>
  );
};

export default Proton;
