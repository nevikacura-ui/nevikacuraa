import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import Home from '@/pages/Home';
import DiaGyn from '@/pages/DiaGyn';
import Proton from '@/pages/Proton';
import Pharmacy from '@/pages/Pharmacy';
import Evara from '@/pages/Evara';
import Glydex from '@/pages/Glydex';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import AdminPanel from '@/pages/AdminPanel';
import StaffPortal from '@/pages/StaffPortal';
import TrackOrder from '@/pages/TrackOrder';
import Feedback from '@/pages/Feedback';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import AboutUs from '@/pages/AboutUs';
// New Feature Pages
import MyHealth from '@/pages/MyHealth';
import HealthPackages from '@/pages/HealthPackages';
import MembershipPlans from '@/pages/MembershipPlans';
import ReferralProgram from '@/pages/ReferralProgram';
import HealthTips from '@/pages/HealthTips';
import Teleconsultation from '@/pages/Teleconsultation';
import QuickReorder from '@/pages/QuickReorder';
import ColorTest from '@/pages/ColorTest';
// High Priority Features
import EmergencyServices from '@/pages/EmergencyServices';
import HealthRiskAssessment from '@/pages/HealthRiskAssessment';
import MedicationTracker from '@/pages/MedicationTracker';
import DoctorProfiles from '@/pages/DoctorProfiles';
import Billing from '@/pages/Billing';
// Community & Reminders
import Community from '@/pages/Community';
import Reminders from '@/pages/Reminders';
// ALYNE - Kids Health
import Alyne from '@/pages/Alyne';
// ANC Public Form
import ANCFormPublic from '@/pages/ANCFormPublic';
// Diabetes Public Form
import DiabetesFormPublic from '@/pages/DiabetesFormPublic';
// Simple Face Attendance (for debugging)
import SimpleFaceAttendance from '@/pages/SimpleFaceAttendance';
// Live Queue Display
import QueuePage from '@/pages/QueuePage';
// Patient Health Dashboard
import HealthDashboard from '@/pages/HealthDashboard';
import HealthDashboardPage from '@/pages/HealthDashboardPage';
import SettingsPage from '@/pages/SettingsPage';
// Senior Care Charity
import SeniorCare from '@/pages/SeniorCare';
// Smart Medicine Reminders
import SmartReminders from '@/pages/SmartReminders';
// Patient Portal
import PatientPortal from '@/pages/PatientPortal';
// Enhancement Features Page
import EnhancementFeatures from '@/pages/EnhancementFeatures';
// Payment Pages
import { PaymentSuccess, PaymentCancel } from '@/components/PaymentCheckout';
import PaymentHistory from '@/pages/PaymentHistory';
// New Portal Pages (Renamed)
import Serena from '@/pages/Serena';
import Corvia from '@/pages/Corvia';
import Reneu from '@/pages/Reneu';
import Thrive360New from '@/pages/Thrive360New';
import Senova from '@/pages/Senova';
import PSVNFoundation from '@/pages/PSVNFoundation';
import MedicineImageUpload from '@/pages/MedicineImageUpload';
import ProtonReportDownload from '@/pages/ProtonReportDownload';
import PharmacyProductPage from '@/pages/PharmacyProductPage';
import HowToInstall from '@/pages/HowToInstall';
import NevikaCuraOne from '@/pages/NevikaCuraOne';
// Login Page
import LoginPage from '@/pages/LoginPage';
// Intro Screen (Loading + Splash combined)
import IntroScreen from '@/components/IntroScreen';
// Page Transitions
import { AnimatedPage } from '@/components/PageTransition';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ViewModeProvider } from '@/context/ViewModeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { FullScreenNotificationPrompt, SmartNotificationBanner } from '@/components/NotificationPrompt';
import './App.css';

// Wrapper component to access auth context
function AppContent() {
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  
  // Check if intro should be shown
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    const patientToken = localStorage.getItem('patientToken');
    const staffToken = localStorage.getItem('staffToken');
    const isStaffPage = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
    
    if (hasSeenSplash || user || patientToken || (staffToken && isStaffPage)) {
      setShowIntro(false);
    }
  }, [user]);
  
  const handleIntroComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowIntro(false);
  };
  
  return (
    <>
      {/* Intro Screen (Loading animation -> Splash) */}
      {showIntro && (
        <IntroScreen onComplete={handleIntroComplete} user={user} />
      )}
      <div className="App">
        <Routes>
          <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
          <Route path="/diagyn" element={<AnimatedPage><DiaGyn /></AnimatedPage>} />
          <Route path="/proton" element={<AnimatedPage><Proton /></AnimatedPage>} />
          <Route path="/pharmacy" element={<AnimatedPage><Pharmacy /></AnimatedPage>} />
          <Route path="/evara" element={<AnimatedPage><Evara /></AnimatedPage>} />
          <Route path="/glydex" element={<AnimatedPage><Glydex /></AnimatedPage>} />
          {/* New Portal Routes (Renamed) */}
          <Route path="/serena" element={<AnimatedPage><Serena /></AnimatedPage>} />
          <Route path="/corvia" element={<AnimatedPage><Corvia /></AnimatedPage>} />
          <Route path="/reneu" element={<AnimatedPage><Reneu /></AnimatedPage>} />
          <Route path="/thrive360" element={<AnimatedPage><Thrive360New /></AnimatedPage>} />
          <Route path="/senova" element={<AnimatedPage><Senova /></AnimatedPage>} />
          <Route path="/psvn-foundation" element={<AnimatedPage><PSVNFoundation /></AnimatedPage>} />
          <Route path="/aanya" element={<AnimatedPage><Alyne /></AnimatedPage>} />
          <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/staff" element={<StaffPortal />} />
          <Route path="/track" element={<AnimatedPage><TrackOrder /></AnimatedPage>} />
          <Route path="/feedback/:token" element={<Feedback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/about" element={<AboutUs />} />
          {/* New Feature Routes */}
          <Route path="/my-health" element={<AnimatedPage><MyHealth /></AnimatedPage>} />
          <Route path="/health-packages" element={<AnimatedPage><HealthPackages /></AnimatedPage>} />
          <Route path="/membership-plans" element={<AnimatedPage><MembershipPlans /></AnimatedPage>} />
          <Route path="/referral" element={<AnimatedPage><ReferralProgram /></AnimatedPage>} />
          <Route path="/health-tips" element={<AnimatedPage><HealthTips /></AnimatedPage>} />
          <Route path="/teleconsult" element={<AnimatedPage><Teleconsultation /></AnimatedPage>} />
          <Route path="/quick-reorder" element={<AnimatedPage><QuickReorder /></AnimatedPage>} />
          <Route path="/color-test" element={<ColorTest />} />
          {/* High Priority Features */}
          <Route path="/emergency" element={<AnimatedPage><EmergencyServices /></AnimatedPage>} />
          <Route path="/health-assessment" element={<AnimatedPage><HealthRiskAssessment /></AnimatedPage>} />
          <Route path="/medication-tracker" element={<AnimatedPage><MedicationTracker /></AnimatedPage>} />
          <Route path="/doctors" element={<AnimatedPage><DoctorProfiles /></AnimatedPage>} />
          <Route path="/doctors/:doctorId" element={<AnimatedPage><DoctorProfiles /></AnimatedPage>} />
          <Route path="/billing" element={<Billing />} />
          {/* Community & Reminders */}
          <Route path="/community" element={<Community />} />
          <Route path="/reminders" element={<Reminders />} />
          {/* ALYNE - Kids Health */}
          <Route path="/alyne" element={<Alyne />} />
          {/* ANC Public Form */}
          <Route path="/anc-form/:formId" element={<ANCFormPublic />} />
          {/* Diabetes Public Form */}
          <Route path="/diabetes-form/:formId" element={<DiabetesFormPublic />} />
          {/* Simple Face Attendance - for debugging */}
          <Route path="/face-attendance" element={<SimpleFaceAttendance />} />
          {/* Live Queue Display - Public */}
          <Route path="/queue" element={<QueuePage />} />
          {/* Patient Health Dashboard */}
          <Route path="/health-dashboard" element={<HealthDashboardPage />} />
          {/* Settings Page */}
          <Route path="/settings" element={<SettingsPage />} />
          {/* Senior Care Charity */}
          <Route path="/senior-care" element={<SeniorCare />} />
          {/* Smart Medicine Reminders */}
          <Route path="/smart-reminders" element={<SmartReminders />} />
          {/* Patient Portal */}
          <Route path="/patient-portal" element={<PatientPortal />} />
          {/* Enhancement Features */}
          <Route path="/features" element={<EnhancementFeatures />} />
          {/* How to Install App */}
          <Route path="/install" element={<AnimatedPage><HowToInstall /></AnimatedPage>} />
          {/* Payment Routes */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/payment/history" element={<PaymentHistory />} />
          {/* Medicine Image Upload - No Login Required */}
          <Route path="/medicine-images" element={<MedicineImageUpload />} />
          {/* Proton Report Download - Patient Access */}
          <Route path="/report/:bookingId" element={<ProtonReportDownload />} />
          <Route path="/report" element={<ProtonReportDownload />} />
          {/* Pharmacy Product Page - Full Page View */}
          <Route path="/pharmacy/product/:productId" element={<PharmacyProductPage />} />
          {/* Nevika Cura ONE Membership Page */}
          <Route path="/one" element={<AnimatedPage><NevikaCuraOne /></AnimatedPage>} />
        </Routes>
        <Toaster position="top-center" richColors />
        <PWAInstallPrompt />
        <SmartNotificationBanner />
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ViewModeProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ViewModeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;