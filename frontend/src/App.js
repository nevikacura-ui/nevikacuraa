import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Home from '@/pages/Home';
import DiaGyn from '@/pages/DiaGyn';
import Proton from '@/pages/Proton';
import Pharmacy from '@/pages/Pharmacy';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import { AuthProvider } from '@/context/AuthContext';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <Toaster position="top-center" richColors />
          <PWAInstallPrompt />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;