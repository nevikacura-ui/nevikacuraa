import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import CuraNotificationRenderer from '@/components/CuraNotification';
import { setupCuraToast } from '@/utils/curaToast';
import { lightTap } from '@/utils/haptics';

// Intercept sonner toast → Radial Pulse notifications
setupCuraToast();
import Home from '@/pages/Home';
import BrandedLoader from '@/components/BrandedLoader';
import IntroScreen from '@/components/IntroScreen';
import PageErrorBoundary from '@/components/PageErrorBoundary';
import { DiaGynSkeleton, MangoSkeleton, PharmacySkeleton, AdminSkeleton, StaffPortalSkeleton, ShimmerCSS } from '@/components/PageSkeletons';
import { useNavigate } from 'react-router-dom';
import RouteTransitionLoader from '@/components/RouteTransitionLoader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AnimatedPage, PageTransitionProvider } from '@/components/PageTransition';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ViewModeProvider } from '@/context/ViewModeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { ThemeLanguageProvider } from '@/context/ThemeLanguageContext';
import { CartAnimationProvider } from '@/components/AddToCartAnimation';
import FloatingCartButton from '@/components/FloatingCartButton';
import ScrollToTop from '@/components/ScrollToTop';
import { FestivalThemeProvider } from '@/components/FestivalBanner';
import './App.css';

// All lazy imports from centralized file
import {
  DiaGynRedesigned, Mango, MangoUltrasound, Pharmacy, OrangeMedcare, OrangeGenerics,
  TrustedFormularyPage, Nutricare, Evara, Glydex, Profile, AdminPanel,
  DiaGynStaffPortal, OrangePharmacyStaffPortal, MangoLabsStaffPortal, TokenDisplay,
  DoctorPortalRedesigned, TrackOrder, MyAppointmentsPage, PatientProfile, OrderTracking, PatientDashboard,
  Feedback, PrivacyPolicy, TermsOfService, AboutUs, MembershipPlans, DoctorProfiles,
  Alyne, ANCFormPublic, DiabetesFormPublic, QueuePage, SettingsPage, PaymentGateway,
  PaymentReturn, PaymentHistoryDashboard, Reneu, PSVNFoundation, MedicineImageUpload,
  ProtonReportDownload, PharmacyProductPage, PharmacyCategory, ShopByBrand, HowToInstall,
  NevikaCuraOne, HealthCard, GiftHealthCards, HealthPlans, CarePackages, CuraWallet,
  CuraOne, CuraXCoins, CuraBonus, SavedAddresses, FamilyMembers, MyFavorites,
  HealthInsights, MedicineScanner, PaymentMethods, FamilyWallet, NevikaLabs,
  ProtonDiagnostics, Nexugene, PrescriptionWallet, AppointmentCalendar, PatientLogin,
  StaffPortalLogin, DoctorPortalLogin, AdminPortalLogin, DoctorEMRDashboard,
  SuperAdminDashboard, Checkout, OnlineAppointmentSuccess, CartPage,
  BookingConfirmationPage, MyOrders, PharmacyCheckout, MangoCheckout, MangoCategory,
  UnifiedCheckout, HealthTimeline, DoctorSearch, LiveOrderTracking, VirtualOrderTracking, DeliveryAgentTracker, PhlebotomistTracker,
  ReturnRefundPolicy, LabReportViewer, ReferralProgram, SymptomChecker, TeleconsultPage,
  RatingPage, MyCura, Portals, PrescriptionScannerPage, MyPrescriptions, VoiceBookingPage,
  MedicineRemindersPage, FamilyHealthPage, OrganViewerPage, BookingAnalyticsPage,
  CuraCoinsPage, HealthScorePage, DoctorInsightsPage, EmergencySOSPage, PaymentSuccess,
  HealthAssistantPage, HyperlocalPage, VideoConsultPage, HealthStreaksPage, WearablesPage,
  MedicalRecordsPage, SmartRemindersPage, RevenueDashboard, HandoffNotes,
  EmergencyHealthCard, EmergencyScanPage, ExpressRxTracker, PostVisitPipeline,
  AdultVaccination, HomeCare, Evercare,
  NotificationBanner, OnboardingTour, PaymentCancel,
} from '@/routes/lazyImports';

const retryLazy = (fn) => lazy(() => fn().catch(() => { window.location.reload(); return fn(); }));

const NotFoundPage = () => {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--bg-404, #F8FAFB)' }}>
      <p className="text-7xl font-black mb-2" style={{ color: 'rgba(0,0,0,0.08)' }}>404</p>
      <p className="text-lg font-semibold mb-1" style={{ color: '#1a1a2e' }}>Page not found</p>
      <p className="text-sm text-gray-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <button onClick={() => nav('/')} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
        style={{ background: 'linear-gradient(135deg, #0D9488, #10B981)' }} data-testid="404-go-home">
        Go Home
      </button>
    </div>
  );
};

function AppContent() {
  const { user } = useAuth();

  const shouldSkipIntro = () => {
    if (localStorage.getItem('intro_done')) return true;
    const isRootPath = window.location.pathname === '/' || window.location.pathname === '';
    if (!isRootPath) return true;
    const patientToken = localStorage.getItem('patientToken');
    if (patientToken || user) return true;
    return false;
  };

  const [showIntro, setShowIntro] = useState(() => !shouldSkipIntro());

  useEffect(() => {
    if (showIntro && user) {
      setShowIntro(false);
      localStorage.setItem('intro_done', '1');
    }
  }, [user, showIntro]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    localStorage.setItem('intro_done', '1');
    if (!localStorage.getItem('onboarding_done')) {
      setTimeout(() => setShowOnboarding(true), 800);
    }
  };

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !!localStorage.getItem('intro_done') && !localStorage.getItem('onboarding_done');
  });

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const el = e.target.closest('button, a, [role="button"], [data-testid], input[type="checkbox"], input[type="radio"]');
      if (el) lightTap();
    };
    document.addEventListener('click', handleGlobalClick, { passive: true });
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <>
      {showIntro && (
        <IntroScreen onComplete={handleIntroComplete} user={user} />
      )}
      <div className="App grain-texture" style={showIntro ? { display: 'none' } : undefined}>
        <ScrollToTop />
        <RouteTransitionLoader />
        <Suspense fallback={null}><NotificationBanner /></Suspense>
        {showOnboarding && <Suspense fallback={null}><OnboardingTour onComplete={() => setShowOnboarding(false)} /></Suspense>}
        <PageErrorBoundary pageName="app">
        <Routes>
          {/* Core Services */}
          <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
          <Route path="/my-cura" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><MyCura /></AnimatedPage></Suspense>} />
          <Route path="/portals" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Portals /></AnimatedPage></Suspense>} />
          <Route path="/diagyn" element={<Suspense fallback={<div style={{background:'#0A0A0F',minHeight:'100vh'}}/>}><AnimatedPage><DiaGynRedesigned /></AnimatedPage></Suspense>} />

          {/* Mango Labs */}
          <Route path="/mango" element={<Suspense fallback={<><ShimmerCSS /><MangoSkeleton /></>}><AnimatedPage><Mango /></AnimatedPage></Suspense>} />
          <Route path="/mango/ultrasound" element={<Suspense fallback={<BrandedLoader variant="mango" />}><AnimatedPage><MangoUltrasound /></AnimatedPage></Suspense>} />
          <Route path="/mango/checkout" element={<Suspense fallback={<BrandedLoader variant="mango" />}><MangoCheckout /></Suspense>} />
          <Route path="/mango/category/:slug" element={<Suspense fallback={<BrandedLoader variant="mango" />}><MangoCategory /></Suspense>} />
          <Route path="/labs" element={<Suspense fallback={<BrandedLoader variant="mango" />}><AnimatedPage><NevikaLabs /></AnimatedPage></Suspense>} />
          <Route path="/proton" element={<Suspense fallback={<BrandedLoader variant="mango" />}><AnimatedPage><ProtonDiagnostics /></AnimatedPage></Suspense>} />
          <Route path="/nexugene" element={<Suspense fallback={<BrandedLoader variant="mango" />}><AnimatedPage><Nexugene /></AnimatedPage></Suspense>} />

          {/* Orange Pharmacy */}
          <Route path="/orange" element={<Suspense fallback={<><ShimmerCSS /><PharmacySkeleton /></>}><AnimatedPage><OrangeMedcare /></AnimatedPage></Suspense>} />
          <Route path="/orange-generics" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><OrangeGenerics /></AnimatedPage></Suspense>} />
          <Route path="/pharmacy" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><Pharmacy /></AnimatedPage></Suspense>} />
          <Route path="/nutricare" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><Nutricare /></AnimatedPage></Suspense>} />
          <Route path="/pharmacy/checkout" element={<Suspense fallback={<BrandedLoader variant="orange" />}><PharmacyCheckout /></Suspense>} />
          <Route path="/pharmacy/product/:productId" element={<Suspense fallback={<BrandedLoader variant="orange" />}><PharmacyProductPage /></Suspense>} />
          <Route path="/pharmacy/brands" element={<Suspense fallback={<BrandedLoader variant="orange" />}><ShopByBrand /></Suspense>} />
          <Route path="/pharmacy/brands/:brandName" element={<Suspense fallback={<BrandedLoader variant="orange" />}><ShopByBrand /></Suspense>} />
          <Route path="/pharmacy/category/:categoryName" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><PharmacyCategory /></AnimatedPage></Suspense>} />
          <Route path="/orange-select" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><TrustedFormularyPage /></AnimatedPage></Suspense>} />
          <Route path="/trusted-formulary" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><TrustedFormularyPage /></AnimatedPage></Suspense>} />

          {/* Sub-Portals */}
          <Route path="/evara" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Evara /></AnimatedPage></Suspense>} />
          <Route path="/glydex" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Glydex /></AnimatedPage></Suspense>} />
          <Route path="/reneu" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Reneu /></AnimatedPage></Suspense>} />
          <Route path="/aanya" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Alyne /></AnimatedPage></Suspense>} />
          <Route path="/alyne" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Alyne /></AnimatedPage></Suspense>} />
          <Route path="/psvn-foundation" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><PSVNFoundation /></AnimatedPage></Suspense>} />

          {/* User Pages */}
          <Route path="/profile" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Profile /></AnimatedPage></Suspense>} />
          <Route path="/my-orders" element={<Suspense fallback={<BrandedLoader />}><MyOrders /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<BrandedLoader />}><PatientLogin /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<BrandedLoader />}><SettingsPage /></Suspense>} />
          <Route path="/doctors" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><DoctorProfiles /></AnimatedPage></Suspense>} />
          <Route path="/doctors/:doctorId" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><DoctorProfiles /></AnimatedPage></Suspense>} />

          {/* Admin & Staff */}
          <Route path="/admin" element={<Suspense fallback={<BrandedLoader />}><AdminPanel /></Suspense>} />
          <Route path="/admin-panel" element={<Suspense fallback={<BrandedLoader />}><AdminPanel /></Suspense>} />
          <Route path="/staff" element={<Suspense fallback={<BrandedLoader />}><StaffPortalLogin /></Suspense>} />
          <Route path="/doctor-login" element={<Suspense fallback={<BrandedLoader />}><DoctorPortalLogin /></Suspense>} />
          <Route path="/admin-login" element={<Suspense fallback={<BrandedLoader />}><AdminPortalLogin /></Suspense>} />
          <Route path="/super-admin" element={<Suspense fallback={<><ShimmerCSS /><AdminSkeleton /></>}><SuperAdminDashboard /></Suspense>} />
          <Route path="/diagyn-staff" element={<Suspense fallback={<><ShimmerCSS /><StaffPortalSkeleton /></>}><DiaGynStaffPortal /></Suspense>} />
          <Route path="/pharmacy-staff" element={<Suspense fallback={<><ShimmerCSS /><StaffPortalSkeleton /></>}><OrangePharmacyStaffPortal /></Suspense>} />
          <Route path="/mango-staff" element={<Suspense fallback={<><ShimmerCSS /><StaffPortalSkeleton /></>}><MangoLabsStaffPortal /></Suspense>} />
          <Route path="/token-display" element={<Suspense fallback={<BrandedLoader />}><TokenDisplay /></Suspense>} />
          <Route path="/doctor-portal" element={<Suspense fallback={<BrandedLoader variant="diagyn" />}><DoctorPortalRedesigned /></Suspense>} />
          <Route path="/doctor-portal/emr/:bookingId" element={<Suspense fallback={<BrandedLoader variant="diagyn" />}><DoctorEMRDashboard /></Suspense>} />
          <Route path="/doctor-portal/payment-success" element={<Suspense fallback={<BrandedLoader />}><PaymentReturn /></Suspense>} />
          <Route path="/revenue-dashboard" element={<Suspense fallback={<BrandedLoader />}><RevenueDashboard /></Suspense>} />
          <Route path="/handoff-notes" element={<Suspense fallback={<BrandedLoader />}><HandoffNotes /></Suspense>} />
          <Route path="/payment-return" element={<Suspense fallback={<BrandedLoader />}><PaymentReturn /></Suspense>} />

          {/* Booking & Orders */}
          <Route path="/booking-confirmation" element={<Suspense fallback={<BrandedLoader />}><BookingConfirmationPage /></Suspense>} />
          <Route path="/track" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><TrackOrder /></AnimatedPage></Suspense>} />
          <Route path="/my-appointments" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><MyAppointmentsPage /></AnimatedPage></Suspense>} />
          <Route path="/order-tracking" element={<Suspense fallback={<BrandedLoader />}><OrderTracking /></Suspense>} />
          <Route path="/patient-profile" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><PatientProfile /></AnimatedPage></Suspense>} />
          <Route path="/my-portal" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><PatientDashboard /></AnimatedPage></Suspense>} />
          <Route path="/patient-profile/addresses" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><SavedAddresses /></AnimatedPage></Suspense>} />
          <Route path="/patient-profile/family" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><FamilyMembers /></AnimatedPage></Suspense>} />
          <Route path="/patient-profile/favorites" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><MyFavorites /></AnimatedPage></Suspense>} />
          <Route path="/cura-wallet" element={<Suspense fallback={<BrandedLoader variant="curapay" />}><AnimatedPage><CuraWallet /></AnimatedPage></Suspense>} />
          <Route path="/cura-one" element={<Suspense fallback={<BrandedLoader variant="curaone" />}><AnimatedPage><CuraOne /></AnimatedPage></Suspense>} />
          <Route path="/cura-coins" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><CuraXCoins /></AnimatedPage></Suspense>} />
          <Route path="/cura-bonus" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><CuraBonus /></AnimatedPage></Suspense>} />
          <Route path="/health-insights" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HealthInsights /></AnimatedPage></Suspense>} />
          <Route path="/medicine-scanner" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><MedicineScanner /></AnimatedPage></Suspense>} />
          <Route path="/payment-methods" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><PaymentMethods /></AnimatedPage></Suspense>} />
          <Route path="/family-wallet" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><FamilyWallet /></AnimatedPage></Suspense>} />
          <Route path="/feedback/:token" element={<Suspense fallback={<BrandedLoader />}><Feedback /></Suspense>} />

          {/* Legal */}
          <Route path="/privacy" element={<Suspense fallback={<BrandedLoader />}><PrivacyPolicy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<BrandedLoader />}><TermsOfService /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<BrandedLoader />}><AboutUs /></Suspense>} />

          {/* Features */}
          <Route path="/membership-plans" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><MembershipPlans /></AnimatedPage></Suspense>} />
          <Route path="/install" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HowToInstall /></AnimatedPage></Suspense>} />
          <Route path="/abha" element={<Navigate to="/" replace />} />
          <Route path="/health-assistant" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HealthAssistantPage /></AnimatedPage></Suspense>} />
          <Route path="/cura-plus" element={<Navigate to="/cura-one" replace />} />
          <Route path="/nearby" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HyperlocalPage /></AnimatedPage></Suspense>} />
          <Route path="/video-consult" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><VideoConsultPage /></AnimatedPage></Suspense>} />
          <Route path="/health-streaks" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HealthStreaksPage /></AnimatedPage></Suspense>} />
          <Route path="/wearables" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><WearablesPage /></AnimatedPage></Suspense>} />

          {/* Public Forms & Queue */}
          <Route path="/anc-form/:formId" element={<Suspense fallback={<BrandedLoader />}><ANCFormPublic /></Suspense>} />
          <Route path="/diabetes-form/:formId" element={<Suspense fallback={<BrandedLoader />}><DiabetesFormPublic /></Suspense>} />
          <Route path="/queue" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><QueuePage /></AnimatedPage></Suspense>} />
          <Route path="/health-timeline" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HealthTimeline /></AnimatedPage></Suspense>} />
          <Route path="/emergency-card" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><EmergencyHealthCard /></AnimatedPage></Suspense>} />
          <Route path="/emergency-scan/:cardId" element={<Suspense fallback={<BrandedLoader />}><EmergencyScanPage /></Suspense>} />
          <Route path="/express-rx" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><ExpressRxTracker /></AnimatedPage></Suspense>} />
          <Route path="/post-visit" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><PostVisitPipeline /></AnimatedPage></Suspense>} />
          <Route path="/adult-vaccination" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><AdultVaccination /></AnimatedPage></Suspense>} />
          <Route path="/home-care" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HomeCare /></AnimatedPage></Suspense>} />
          <Route path="/evercare" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><Evercare /></AnimatedPage></Suspense>} />

          {/* Payment */}
          <Route path="/pay" element={<Suspense fallback={<BrandedLoader />}><PaymentGateway /></Suspense>} />
          <Route path="/payment-success" element={<Suspense fallback={<BrandedLoader />}><PaymentSuccess /></Suspense>} />
          <Route path="/payment/success" element={<Suspense fallback={<BrandedLoader />}><PaymentSuccess /></Suspense>} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/payment-history" element={<Suspense fallback={<BrandedLoader />}><PaymentHistoryDashboard /></Suspense>} />
          <Route path="/checkout" element={<Suspense fallback={<BrandedLoader />}><Checkout /></Suspense>} />
          <Route path="/online-appointment-success" element={<Suspense fallback={<BrandedLoader />}><OnlineAppointmentSuccess /></Suspense>} />
          <Route path="/cart" element={<Suspense fallback={<BrandedLoader />}><CartPage /></Suspense>} />
          <Route path="/unified-checkout" element={<Suspense fallback={<BrandedLoader />}><UnifiedCheckout /></Suspense>} />

          {/* Medicine & Reports */}
          <Route path="/medicine-images" element={<Suspense fallback={<BrandedLoader />}><MedicineImageUpload /></Suspense>} />
          <Route path="/report/:bookingId" element={<Suspense fallback={<BrandedLoader />}><ProtonReportDownload /></Suspense>} />
          <Route path="/report" element={<Suspense fallback={<BrandedLoader />}><ProtonReportDownload /></Suspense>} />
          <Route path="/prescriptions" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><PrescriptionWallet /></AnimatedPage></Suspense>} />
          <Route path="/appointment-calendar" element={<Suspense fallback={<BrandedLoader variant="diagyn" />}><AnimatedPage><AppointmentCalendar /></AnimatedPage></Suspense>} />

          {/* Membership & Revenue */}
          <Route path="/one" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><NevikaCuraOne /></AnimatedPage></Suspense>} />
          <Route path="/health-card" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HealthCard /></AnimatedPage></Suspense>} />
          <Route path="/gift-cards" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><GiftHealthCards /></AnimatedPage></Suspense>} />
          <Route path="/health-plans" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HealthPlans /></AnimatedPage></Suspense>} />
          <Route path="/care-programs" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><CarePackages /></AnimatedPage></Suspense>} />

          {/* Feature Pages */}
          <Route path="/doctor-search" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><DoctorSearch /></AnimatedPage></Suspense>} />
          <Route path="/live-tracking" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><LiveOrderTracking /></AnimatedPage></Suspense>} />
          <Route path="/track-delivery" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><VirtualOrderTracking /></AnimatedPage></Suspense>} />
          <Route path="/deliver/:orderId" element={<Suspense fallback={<BrandedLoader variant="orange" />}><DeliveryAgentTracker /></Suspense>} />
          <Route path="/deliver" element={<Suspense fallback={<BrandedLoader variant="orange" />}><DeliveryAgentTracker /></Suspense>} />
          <Route path="/collect/:bookingId" element={<Suspense fallback={<BrandedLoader variant="mango" />}><PhlebotomistTracker /></Suspense>} />
          <Route path="/collect" element={<Suspense fallback={<BrandedLoader variant="mango" />}><PhlebotomistTracker /></Suspense>} />
          <Route path="/return-refund-policy" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><ReturnRefundPolicy /></AnimatedPage></Suspense>} />
          <Route path="/lab-reports" element={<Suspense fallback={<BrandedLoader variant="mango" />}><AnimatedPage><LabReportViewer /></AnimatedPage></Suspense>} />
          <Route path="/referral" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><ReferralProgram /></AnimatedPage></Suspense>} />
          <Route path="/symptom-checker" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><SymptomChecker /></AnimatedPage></Suspense>} />
          <Route path="/teleconsult" element={<Suspense fallback={<BrandedLoader variant="diagyn" />}><AnimatedPage><TeleconsultPage /></AnimatedPage></Suspense>} />
          <Route path="/rate-visit" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><RatingPage /></AnimatedPage></Suspense>} />
          <Route path="/prescription-scanner" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><PrescriptionScannerPage /></AnimatedPage></Suspense>} />
          <Route path="/my-prescriptions" element={<Suspense fallback={<BrandedLoader variant="orange" />}><AnimatedPage><MyPrescriptions /></AnimatedPage></Suspense>} />
          <Route path="/voice-booking" element={<Suspense fallback={<BrandedLoader variant="diagyn" />}><AnimatedPage><VoiceBookingPage /></AnimatedPage></Suspense>} />
          <Route path="/medicine-reminders" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><MedicineRemindersPage /></AnimatedPage></Suspense>} />
          <Route path="/family-health" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><FamilyHealthPage /></AnimatedPage></Suspense>} />
          <Route path="/organ-viewer" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><OrganViewerPage /></AnimatedPage></Suspense>} />
          <Route path="/booking-analytics" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><BookingAnalyticsPage /></AnimatedPage></Suspense>} />
          <Route path="/curacoins" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><CuraCoinsPage /></AnimatedPage></Suspense>} />
          <Route path="/health-score" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><HealthScorePage /></AnimatedPage></Suspense>} />
          <Route path="/health-calendar" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage>{React.createElement(retryLazy(() => import('@/pages/HealthCalendarPage')))}</AnimatedPage></Suspense>} />
          <Route path="/doctor-insights" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><DoctorInsightsPage /></AnimatedPage></Suspense>} />
          <Route path="/emergency-sos" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><EmergencySOSPage /></AnimatedPage></Suspense>} />
          <Route path="/medical-records" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><MedicalRecordsPage /></AnimatedPage></Suspense>} />
          <Route path="/smart-reminders" element={<Suspense fallback={<BrandedLoader />}><AnimatedPage><SmartRemindersPage /></AnimatedPage></Suspense>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </PageErrorBoundary>
        <Toaster position="top-center" richColors toastOptions={{ style: { display: 'none' } }} />
        <CuraNotificationRenderer />
        <FloatingCartButton />
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <FestivalThemeProvider>
      <ThemeLanguageProvider>
      <LanguageProvider>
        <ViewModeProvider>
          <CartProvider>
            <WishlistProvider>
            <CartAnimationProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </CartAnimationProvider>
            </WishlistProvider>
          </CartProvider>
        </ViewModeProvider>
      </LanguageProvider>
      </ThemeLanguageProvider>
      </FestivalThemeProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
