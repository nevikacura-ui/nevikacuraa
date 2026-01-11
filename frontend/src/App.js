import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Home from '@/pages/Home';
import DiaGyn from '@/pages/DiaGyn';
import Proton from '@/pages/Proton';
import Pharmacy from '@/pages/Pharmacy';
import Evara from '@/pages/Evara';
import Omnia from '@/pages/Omnia';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import StaffPortal from '@/pages/StaffPortal';
import TrackOrder from '@/pages/TrackOrder';
import Feedback from '@/pages/Feedback';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import AboutUs from '@/pages/AboutUs';
import { AuthProvider } from '@/context/AuthContext';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import AutoNotificationPrompt from '@/components/AutoNotificationPrompt';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/diagyn" element={<DiaGyn />} />
            <Route path="/proton" element={<Proton />} />
            <Route path="/pharmacy" element={<Pharmacy />} />
            <Route path="/evara" element={<Evara />} />
            <Route path="/omnia" element={<Omnia />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/staff" element={<StaffPortal />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/feedback/:token" element={<Feedback />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/about" element={<AboutUs />} />
          </Routes>
          <Toaster position="top-center" richColors />
          <PWAInstallPrompt />
          <AutoNotificationPrompt />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;