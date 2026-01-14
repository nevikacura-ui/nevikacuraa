import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, MapPin, Clock, Shield, FileText, Users, X, Download, Smartphone } from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);

  const openWhatsApp = () => {
    window.open('https://wa.me/919403890429?text=Hi, I need help with Nevika Cura Healthcare services.', '_blank');
  };

  return (
    <>
      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="/icons/icon-72x72.png" 
                  alt="Nevika Cura" 
                  className="w-10 h-10 rounded-lg"
                />
                <span className="font-heading text-xl font-bold text-white">Nevika Cura</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Your trusted healthcare partner for appointments, diagnostics, pharmacy, and women's wellness.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={openWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  data-testid="footer-whatsapp-btn"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Support
                </Button>
                <a 
                  href="https://customer-assets.emergentagent.com/job_nevikacura-3/artifacts/f1z0yrfn_Nevika%20Cura.apk"
                  download
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-md text-sm font-medium transition-colors"
                  data-testid="footer-download-apk"
                >
                  <Download className="w-4 h-4" />
                  Download Android App
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a 
                    href="/about"
                    className="hover:text-brand-teal transition-colors"
                    data-testid="footer-about-link"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a 
                    href="/privacy"
                    className="hover:text-brand-teal transition-colors"
                    data-testid="footer-privacy-link"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a 
                    href="/terms"
                    className="hover:text-brand-teal transition-colors"
                    data-testid="footer-terms-link"
                  >
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <button 
                    onClick={() => setShowContact(true)}
                    className="hover:text-brand-teal transition-colors"
                    data-testid="footer-contact-link"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-white mb-4">Our Services</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/diagyn" className="hover:text-brand-teal transition-colors">DiaGyn Healthcare</a></li>
                <li><a href="/proton" className="hover:text-brand-teal transition-colors">Proton Diagnostics</a></li>
                <li><a href="/pharmacy" className="hover:text-brand-teal transition-colors">Orange Pharmacy</a></li>
                <li><a href="/evara" className="hover:text-brand-teal transition-colors">Evara Women's Wellness</a></li>
                <li><a href="/glydex" className="hover:text-brand-teal transition-colors">Glydex Diabetes Care</a></li>
                <li><a href="/alyne" className="hover:text-brand-teal transition-colors">ALYNE Kids Health</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-teal" />
                  <a href="tel:+919403890429" className="hover:text-brand-teal">9403890429</a>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <a href="https://wa.me/919403890429" target="_blank" rel="noopener noreferrer" className="hover:text-brand-teal">9403890429</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-teal" />
                  <a href="mailto:help@nevikacura.com" className="hover:text-brand-teal">help@nevikacura.com</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Portal Links Section */}
          <div className="border-t border-gray-800 pt-6 mb-6">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a 
                href="/profile" 
                className="text-sm text-gray-400 hover:text-brand-teal transition-colors"
                data-testid="footer-my-orders"
              >
                My Orders
              </a>
              <span className="text-gray-700">|</span>
              <a 
                href="/staff" 
                className="text-sm text-gray-400 hover:text-brand-teal transition-colors"
                data-testid="footer-staff-portal"
              >
                Staff Portal
              </a>
              <span className="text-gray-700">|</span>
              <a 
                href="/admin" 
                className="text-sm text-gray-400 hover:text-brand-teal transition-colors"
                data-testid="footer-admin"
              >
                Admin
              </a>
            </div>
          </div>

          {/* QR Code Download Section */}
          <div className="border-t border-gray-800 pt-6 mb-6">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-5 h-5 text-brand-teal" />
                <span className="font-medium">Scan to Download App</span>
              </div>
              <div className="bg-white p-2 rounded-lg">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://customer-assets.emergentagent.com/job_nevikacura-3/artifacts/f1z0yrfn_Nevika%20Cura.apk"
                  alt="Download Nevika Cura App QR Code"
                  className="w-28 h-28"
                  data-testid="footer-qr-code"
                />
              </div>
              <p className="text-xs text-gray-500">Android App • No browser bar</p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Nevika Cura Healthcare. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Made with ❤️ in India</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Us Dialog */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-brand-teal" />
              Contact Us
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4">
              <a 
                href="tel:+919403890429"
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-brand-teal" />
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
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-green-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">WhatsApp</p>
                  <p className="text-sm text-gray-600">+91 9403890429</p>
                </div>
              </a>

              <a 
                href="mailto:help@nevikacura.com"
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Email</p>
                  <p className="text-sm text-gray-600">help@nevikacura.com</p>
                </div>
              </a>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Working Hours</p>
                  <p className="text-sm text-gray-600">Monday - Saturday: 11:00 AM - 10:00 PM</p>
                  <p className="text-sm text-gray-600">Sunday: Emergency only</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Locations</p>
                  <p className="text-sm text-gray-600">Pushpa Clinic - A-1, Sai Darshan, Near Don Bosco High School, Naigaon East</p>
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
