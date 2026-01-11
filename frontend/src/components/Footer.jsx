import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail, MapPin, Clock, Shield, FileText, Users, X } from 'lucide-react';

const Footer = () => {
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
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
              <Button
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                data-testid="footer-whatsapp-btn"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Support
              </Button>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => setShowAbout(true)}
                    className="hover:text-brand-teal transition-colors"
                    data-testid="footer-about-link"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowPrivacy(true)}
                    className="hover:text-brand-teal transition-colors"
                    data-testid="footer-privacy-link"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowTerms(true)}
                    className="hover:text-brand-teal transition-colors"
                    data-testid="footer-terms-link"
                  >
                    Terms & Conditions
                  </button>
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

      {/* About Us Dialog */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-teal" />
              About Us
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              <strong className="text-gray-800">Nevika Cura Healthcare</strong> is a comprehensive healthcare platform dedicated to making quality healthcare accessible to everyone.
            </p>
            <p>
              Founded with a vision to transform healthcare delivery, we offer:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>DiaGyn Healthcare:</strong> Expert consultations with experienced diabetologists and gynecologists</li>
              <li><strong>Proton Diagnostics:</strong> Accurate and affordable diagnostic testing</li>
              <li><strong>Orange Pharmacy:</strong> Quality medicines delivered to your doorstep</li>
              <li><strong>Evara:</strong> Dedicated women's wellness and care programs</li>
            </ul>
            <p>
              Our mission is to provide compassionate, patient-centered care that empowers individuals to take control of their health journey.
            </p>
            <div className="bg-brand-teal/10 p-4 rounded-lg">
              <p className="font-medium text-brand-teal">Our Commitment</p>
              <p className="text-gray-600 mt-1">
                Quality care, transparent pricing, and your health - always our priority.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-teal" />
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-600">
            <p><strong>Last Updated:</strong> January 2026</p>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Information We Collect</h4>
              <p>We collect information you provide directly, including:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Name, email, and phone number</li>
                <li>Health information for appointments and orders</li>
                <li>Payment information (processed securely)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">How We Use Your Information</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>To provide healthcare services</li>
                <li>To send appointment reminders and order updates</li>
                <li>To improve our services</li>
                <li>To comply with legal requirements</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Data Security</h4>
              <p>
                We implement industry-standard security measures to protect your personal and health information. Your data is encrypted and stored securely.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Your Rights</h4>
              <p>
                You have the right to access, correct, or delete your personal data. Contact us at nevikacura@gmail.com for any privacy-related requests.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-teal" />
              Terms & Conditions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-600">
            <p><strong>Last Updated:</strong> January 2026</p>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">1. Services</h4>
              <p>
                Nevika Cura provides healthcare appointment booking, diagnostic test booking, pharmacy services, and wellness programs. We act as a facilitator between patients and healthcare providers.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">2. User Responsibilities</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide accurate personal and health information</li>
                <li>Attend scheduled appointments or cancel in advance</li>
                <li>Pay for services as per the agreed terms</li>
                <li>Use the platform for legitimate healthcare purposes only</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">3. Medical Disclaimer</h4>
              <p>
                Our platform provides general health information and facilitates access to healthcare services. It does not replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical decisions.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">4. Payments & Refunds</h4>
              <p>
                Payment terms vary by service. Refunds are processed as per individual service policies. Contact us for specific refund requests.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">5. Limitation of Liability</h4>
              <p>
                Nevika Cura is not liable for any medical outcomes. Healthcare providers are independently responsible for the quality of care provided.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <p className="text-sm text-gray-600">Monday - Saturday: 9:00 AM - 9:00 PM</p>
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
