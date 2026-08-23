import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, Phone, Mail, MapPin, Clock, Shield, FileText, Users, X, Download, Smartphone, HandHeart,
  Stethoscope, TestTube, ShoppingBag, Heart, Baby, Activity, Flower2, Brain, Sparkles, Pill
} from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);

  const openWhatsApp = () => {
    window.open('https://wa.me/919403890429?text=Hi, I need help with Nevika Cura Healthcare services.', '_blank');
  };

  // My Services - Core clinical services
  const myServices = [
    { name: 'DiaGyn Healthcare', href: '/diagyn', icon: Stethoscope, color: 'text-rose-500' },
    { name: 'Mango Health Labs', href: '/mango', icon: TestTube, color: 'text-orange-500' },
    { name: 'Orange Pharmacy', href: '/pharmacy', icon: Pill, color: 'text-orange-500' },
  ];

  // Health Portal - 4 core wellness portals
  const healthPortal = [
    { name: 'Evara (PCOS Care)', href: '/evara', icon: Flower2, color: 'text-pink-400' },
    { name: 'Glydex (Diabetes)', href: '/glydex', icon: Activity, color: 'text-emerald-500' },
    { name: 'Reneu (Wellness)', href: '/reneu', icon: Sparkles, color: 'text-teal-500' },
    { name: 'ALYNE (Kids Health)', href: '/alyne', icon: Baby, color: 'text-blue-400' },
  ];

  // Special Features
  const specialFeatures = [
    { name: 'PSVN Foundation', href: '/psvn-foundation', icon: HandHeart, color: 'text-emerald-400' },
  ];

  return (
    <>
      <footer className="dark-page bg-gradient-to-b from-slate-900 to-slate-950 text-gray-300 mt-auto" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/icons/icon-72x72.png" 
                  alt="Nevika Cura" 
                  className="w-12 h-12 rounded-xl shadow-lg"
                />
                <div>
                  <span className="font-heading text-xl font-bold text-white">Nevika Cura</span>
                  <p className="text-xs text-gray-500">Your Healthcare Partner</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Comprehensive healthcare solutions for appointments, diagnostics, pharmacy, and specialized wellness programs.
              </p>
              <div className="flex items-center gap-3">
                <a 
                  href="https://drive.google.com/uc?export=download&id=1TaQ5PxgOaRUq_kyDux3lovWLg5Gs4nqi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #14B8A6, #0EA5E9)' }}
                  data-testid="footer-download-apk"
                  title="Install App"
                >
                  <Download className="w-5 h-5 text-white" />
                </a>
                <span className="text-xs text-gray-500">Install App</span>
              </div>
            </div>

            {/* My Services Column */}
            <div>
              <h4 className="font-semibold text-white mb-5 flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-orange-400 to-rose-500 rounded-full"></div>
                My Services
              </h4>
              <ul className="space-y-3">
                {myServices.map((service) => (
                  <li key={service.name}>
                    <Link
                      to={service.href}
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group"
                      data-testid={`footer-${service.href.slice(1)}`}
                    >
                      <service.icon className={`w-4 h-4 ${service.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-sm">{service.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Health Portal Column */}
            <div>
              <h4 className="font-semibold text-white mb-5 flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-purple-400 to-pink-500 rounded-full"></div>
                Health Portal
              </h4>
              <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                {healthPortal.map((service) => (
                  <li key={service.name}>
                    <Link
                      to={service.href}
                      className="flex items-center gap-2.5 text-gray-400 hover:text-white transition-colors group"
                      data-testid={`footer-${service.href.slice(1)}`}
                    >
                      <service.icon className={`w-3.5 h-3.5 ${service.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-sm">{service.name}</span>
                    </Link>
                  </li>
                ))}
                {/* Special Features in desktop view */}
                <li className="pt-3 mt-3 border-t border-slate-800">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Special</span>
                </li>
                {specialFeatures.map((feature) => (
                  <li key={feature.name}>
                    <Link
                      to={feature.href}
                      className="flex items-center gap-2.5 text-gray-400 hover:text-white transition-colors group"
                    >
                      <feature.icon className={`w-3.5 h-3.5 ${feature.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-sm">{feature.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Quick Links Column */}
            <div>
              <h4 className="font-semibold text-white mb-5 flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-teal-400 to-blue-500 rounded-full"></div>
                Contact & Links
              </h4>
              <ul className="space-y-3 text-sm mb-6">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-teal-400" />
                  </div>
                  <a href="tel:+919403890429" className="hover:text-teal-400 transition-colors">9403890429</a>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <a href="https://wa.me/919403890429" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">WhatsApp Us</a>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <a href="mailto:help@nevikacura.com" className="hover:text-blue-400 transition-colors">help@nevikacura.com</a>
                </li>
              </ul>
              
              <div className="pt-4 border-t border-slate-800">
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/about" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-about-link">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-privacy-link">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-terms-link">
                      Terms & Conditions
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={() => setShowContact(true)}
                      className="text-gray-400 hover:text-white transition-colors"
                      data-testid="footer-contact-link"
                    >
                      Contact Us
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Portal Links Section */}
          <div className="border-t border-slate-800 pt-4 mb-4">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link 
                to="/senior-care" 
                className="inline-flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
                data-testid="footer-give-back"
              >
                <HandHeart className="w-4 h-4" />
                Give Back
              </Link>
              <span className="text-slate-700">|</span>
              <Link 
                to="/staff" 
                className="text-sm text-gray-400 hover:text-teal-400 transition-colors"
                data-testid="footer-staff-portal"
              >
                Staff Portal
              </Link>
              <span className="text-slate-700">|</span>
              <Link 
                to="/admin-login" 
                className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
                data-testid="footer-admin"
              >
                <Shield className="w-4 h-4" />
                Admin Portal
              </Link>
            </div>
          </div>

          {/* Social Media Icons — Minimalist */}
          <div className="border-t border-slate-800 pt-4 mb-4">
            <div className="flex items-center justify-center gap-4">
              {[
                { href: 'https://www.facebook.com/share/1DjepDF7Uh/', label: 'Facebook', testId: 'social-facebook', icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z"/></svg>
                )},
                { href: 'https://www.instagram.com/nevikacura', label: 'Instagram', testId: 'social-instagram', icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                )},
                { href: 'https://www.threads.com/@nevikacura', label: 'Threads', testId: 'social-threads', icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.199.408-2.3 1.33-3.104.81-.706 1.963-1.131 3.236-1.194 1.032-.05 1.99.058 2.856.317-.048-1.442-.489-2.396-1.322-2.853-.53-.291-1.215-.422-2.037-.389-1.233.05-2.14.527-2.55 1.125l-1.7-1.127C8.38 5.4 10.058 4.695 12.043 4.613c1.205-.052 2.27.142 3.164.577 1.398.68 2.2 1.907 2.388 3.653.037.351.043.71.019 1.072.645.282 1.228.648 1.728 1.091 1.073.953 1.737 2.237 1.917 3.716.215 1.755-.26 3.752-1.91 5.37-1.85 1.814-4.105 2.632-7.163 2.908ZM12.39 13.74c-.93.047-1.665.282-2.122.682-.53.462-.7 1.047-.673 1.532.033.627.373 1.158.957 1.495.615.356 1.406.506 2.228.462 1.078-.058 1.907-.463 2.465-1.198.39-.513.675-1.2.808-2.065-.826-.291-1.76-.452-2.776-.452-.29 0-.584.014-.887.044Z"/></svg>
                )},
                { href: 'https://youtube.com/@nevikacura', label: 'YouTube', testId: 'social-youtube', icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"/></svg>
                )},
                { href: 'https://x.com/nevikacura', label: 'X', testId: 'social-twitter', icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[16px] h-[16px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                )},
              ].map((social) => (
                <a
                  key={social.testId}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={social.testId}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:scale-110 transition-all duration-300"
                  style={{ background: 'rgba(148,163,184,0.12)' }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-4 flex flex-col items-center gap-3">
            {/* Crafted by Doctors — Gradient Translucent Tags */}
            <div className="flex items-center justify-center gap-3" data-testid="crafted-by-card">
              <span
                className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,184,166,0.18), rgba(56,189,248,0.12))',
                  border: '1px solid rgba(20,184,166,0.2)',
                  backdropFilter: 'blur(12px)',
                  color: 'rgba(153,246,228,0.9)',
                }}
              >
                Crafted by Doctors
              </span>
              <span
                className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(236,72,153,0.12))',
                  border: '1px solid rgba(168,85,247,0.2)',
                  backdropFilter: 'blur(12px)',
                  color: 'rgba(216,180,254,0.9)',
                }}
              >
                Trusted by Patients
              </span>
            </div>
            
            {/* Copyright & Version */}
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Nevika Cura Healthcare. All rights reserved.
            </p>
            <p className="text-[10px] text-gray-600" data-testid="app-version">v2.1.0</p>
          </div>
        </div>
      </footer>

      {/* Contact Us Dialog */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-teal-500" />
              Contact Us
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4">
              <a 
                href="tel:+919403890429"
                className="flex items-center gap-4 p-4 rounded-xl border hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Call Us</p>
                  <p className="text-sm text-gray-600">+91 9403890429</p>
                </div>
              </a>

              <a 
                href="https://wa.me/919403890429"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl border hover:bg-green-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">WhatsApp</p>
                  <p className="text-sm text-gray-600">+91 9403890429</p>
                </div>
              </a>

              <a 
                href="mailto:help@nevikacura.com"
                className="flex items-center gap-4 p-4 rounded-xl border hover:bg-blue-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Email</p>
                  <p className="text-sm text-gray-600">help@nevikacura.com</p>
                </div>
              </a>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Working Hours</p>
                  <p className="text-sm text-gray-600">Monday - Saturday: 11:30 AM - 10:00 PM</p>
                  <p className="text-sm text-gray-600">Sunday: Emergency only</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Locations</p>
                  <p className="text-sm text-gray-600">Pushpa Clinic - A-4, Sai Darshan, Near Don Bosco High School, Naigaon East</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Footer;
