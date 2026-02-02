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

  // Health Portal - Wellness & specialty services
  const healthPortal = [
    { name: 'Evara (PCOS Care)', href: '/evara', icon: Flower2, color: 'text-pink-400' },
    { name: 'Glydex (Diabetes)', href: '/glydex', icon: Activity, color: 'text-emerald-500' },
    { name: 'Corvia (Heart Health)', href: '/corvia', icon: Heart, color: 'text-red-500' },
    { name: 'Alyne (Kids Health)', href: '/alyne', icon: Baby, color: 'text-blue-400' },
    { name: 'Aanya (Newborn)', href: '/aanya', icon: Baby, color: 'text-pink-300' },
    { name: 'Thrive 360', href: '/thrive360', icon: Sparkles, color: 'text-purple-500' },
    { name: 'Serena (Mental Health)', href: '/serena', icon: Brain, color: 'text-indigo-500' },
    { name: 'Sonova (Fertility)', href: '/sonova', icon: Heart, color: 'text-rose-400' },
    { name: 'Reneu (Senior Care)', href: '/reneu', icon: HandHeart, color: 'text-teal-500' },
  ];

  return (
    <>
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-gray-300 mt-auto" data-testid="footer">
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
              <div className="flex flex-col gap-3">
                <Button
                  onClick={openWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 rounded-xl"
                  data-testid="footer-whatsapp-btn"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Support
                </Button>
                <a 
                  href="https://drive.google.com/uc?export=download&id=1TaQ5PxgOaRUq_kyDux3lovWLg5Gs4nqi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg"
                  data-testid="footer-download-apk"
                >
                  <Download className="w-4 h-4" />
                  Get the App
                </a>
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
          <div className="border-t border-slate-800 pt-6 mb-6">
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
                to="/admin" 
                className="text-sm text-gray-400 hover:text-teal-400 transition-colors"
                data-testid="footer-admin"
              >
                Admin
              </Link>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="border-t border-slate-800 pt-8 mb-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-5 h-5 text-teal-400" />
                <span className="font-medium">Scan to Visit Website</span>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-xl">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://healthapp-facelift.preview.emergentagent.com&color=0d9488"
                  alt="Nevika Cura Website QR Code"
                  className="w-28 h-28"
                  data-testid="footer-qr-code"
                />
              </div>
              <p className="text-xs text-gray-500">Scan to open Nevika Cura on your phone</p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-6 flex flex-col items-center gap-4">
            {/* Tagline with visual flair */}
            <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-teal-900/50 via-slate-800/50 to-teal-900/50 rounded-full border border-teal-800/30">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse"></span>
                <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-teal-600 rounded-full"></span>
              </div>
              <p className="text-sm font-medium text-teal-100 tracking-wide flex items-center gap-3">
                <span>Crafted by Doctors</span>
                <span className="w-2 h-2 bg-teal-400/60 rounded-full"></span>
                <span>Trusted by Patients</span>
                <span className="w-2 h-2 bg-teal-400/60 rounded-full"></span>
                <span>Managed by Doctors</span>
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-teal-600 rounded-full"></span>
                <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse"></span>
              </div>
            </div>
            
            {/* Copyright */}
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Nevika Cura Healthcare. All rights reserved.
            </p>
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
                  <p className="text-sm text-gray-600">Monday - Saturday: 11:00 AM - 10:00 PM</p>
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
                  <p className="text-sm text-gray-600 mt-1">Amnion Clinic - G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East</p>
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
