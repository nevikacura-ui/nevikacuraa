import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import Home from '@/pages/Home';
import DiaGyn from '@/pages/DiaGyn';
import Proton from '@/pages/Proton';
import Pharmacy from '@/pages/Pharmacy';
import Evara from '@/pages/Evara';
import Glydex from '@/pages/Glydex';
import Thrive360 from '@/pages/Thrive360';
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
import ReferralProgram from '@/pages/ReferralProgram';
import HealthTips from '@/pages/HealthTips';
import Teleconsultation from '@/pages/Teleconsultation';
import QuickReorder from '@/pages/QuickReorder';
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
// Intro Screen (Loading + Splash combined)
import IntroScreen from '@/components/IntroScreen';
// Page Transitions
import { PageTransition } from '@/components/PageTransition';
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
          <Route path="/" element={<Home />} />
          <Route path="/diagyn" element={<DiaGyn />} />
          <Route path="/proton" element={<Proton />} />
          <Route path="/pharmacy" element={<Pharmacy />} />
          <Route path="/evara" element={<Evara />} />
          <Route path="/glydex" element={<Glydex />} />
          <Route path="/thrive360" element={<Thrive360 />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/staff" element={<StaffPortal />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/feedback/:token" element={<Feedback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/about" element={<AboutUs />} />
          {/* New Feature Routes */}
          <Route path="/my-health" element={<MyHealth />} />
          <Route path="/health-packages" element={<HealthPackages />} />
          <Route path="/referral" element={<ReferralProgram />} />
          <Route path="/health-tips" element={<HealthTips />} />
          <Route path="/teleconsult" element={<Teleconsultation />} />
          <Route path="/quick-reorder" element={<QuickReorder />} />
          {/* High Priority Features */}
          <Route path="/emergency" element={<EmergencyServices />} />
          <Route path="/health-assessment" element={<HealthRiskAssessment />} />
          <Route path="/medication-tracker" element={<MedicationTracker />} />
          <Route path="/doctors" element={<DoctorProfiles />} />
          <Route path="/doctors/:doctorId" element={<DoctorProfiles />} />
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
          {/* Payment Routes */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/payment/history" element={<PaymentHistory />} />
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