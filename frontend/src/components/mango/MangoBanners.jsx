import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Shield, Stethoscope, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MangoBanners({ setShowPackageBuilder }) {
  const navigate = useNavigate();

  return (
    <>
      {/* How It Works Banner */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-green-500/20">
        <div className="w-full px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-800 font-heading">How to Book Diagnostic Tests</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { num: 1, title: 'Select Tests', desc: 'Choose tests or upload prescription' },
              { num: 2, title: 'Fill Details', desc: 'Enter name, phone, address' },
              { num: 3, title: 'Phlebotomist Call', desc: 'We confirm timing & location' },
              { num: 4, title: 'Reports Ready', desc: 'Download from My Orders', success: true }
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-2 p-3 bg-white rounded-xl shadow-sm border border-green-100 hover:shadow-md transition-all">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.success ? 'bg-green-700 text-white' : 'bg-green-500 text-white'}`}>
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

      {/* Trust Badges */}
      <div className="py-4 border-b border-green-500/30 bg-green-500/10 backdrop-blur-sm" data-testid="proton-trust-badges">
        <div className="w-full px-4">
          <div className="flex justify-between items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'trusted-labs', icon: Shield, title: 'Trusted &', subtitle: 'Accredited Labs', gradient: 'from-green-500 to-green-600', bg: 'bg-green-500/10' },
              { id: 'doctor-curated', icon: Stethoscope, title: 'Doctor', subtitle: 'Curated Packages', gradient: 'from-green-600 to-green-500', bg: 'bg-green-500/20' },
              { id: 'home-sample', icon: Clock, title: 'Home Sample', subtitle: 'Collection', gradient: 'from-green-500 to-green-600', bg: 'bg-green-500/10' },
              { id: 'fast-reports', icon: CheckCircle2, title: 'Accurate &', subtitle: 'Fast Reports', gradient: 'from-green-600 to-green-500', bg: 'bg-green-500/20' }
            ].map((badge) => (
              <div key={badge.id} className="flex flex-col items-center text-center min-w-[80px] flex-1" data-testid={`proton-trust-${badge.id}`}>
                <div className={`w-14 h-14 rounded-2xl ${badge.bg} flex items-center justify-center mb-2 shadow-sm`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center`}>
                    <badge.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-green-700 leading-tight">{badge.title}</p>
                <p className="text-xs font-medium text-green-700 leading-tight">{badge.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consultation Help Banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white" data-testid="consultation-help-banner">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Not sure which test to book?</p>
                <p className="text-xs opacity-90">Consult our doctors for recommendations</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/diagyn')}
              variant="secondary"
              size="sm"
              className="bg-white text-green-600 hover:bg-green-50 rounded-full font-semibold flex-shrink-0"
              data-testid="book-doctor-btn"
            >
              Consult Doctor
            </Button>
          </div>
        </div>
      </div>

      {/* Build Your Own Package Banner */}
      <div className="bg-[#1E493F] text-white border-b border-[#163832]" data-testid="package-builder-banner">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Build Your Own Package</p>
                <p className="text-xs text-green-300">Select tests to build your package</p>
              </div>
            </div>
            <Button
              onClick={() => setShowPackageBuilder(true)}
              variant="secondary"
              size="sm"
              className="bg-white text-[#1E493F] hover:bg-green-50 rounded-full font-semibold flex-shrink-0"
              data-testid="package-builder-btn"
            >
              Build Package
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
