import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Heart, 
  Stethoscope, 
  Pill, 
  FlaskConical, 
  Users, 
  Activity,
  ArrowLeft,
  Copy,
  CheckCircle,
  Phone,
  Building,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import Footer from '@/components/Footer';

const SeniorCare = () => {
  const navigate = useNavigate();
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [copied, setCopied] = useState(false);

  // UPI Details
  const upiDetails = {
    upiId: 'pinelabs.stq4087704@pineaxis',
    accountName: 'Nevika Cura Healthcare',
    bankName: 'State Bank of Mauritius',
    accountNo: '20229833188288',
    ifsc: 'STCB0000065',
    phone: '+91 9403890429'
  };

  const donationTiers = [
    { amount: 300, label: 'Medicine Kit', impact: '1 month essential medicines for a senior', badge: 'Caregiver' },
    { amount: 500, label: 'Health Checkup', impact: '1 complete Silver Health Checkup', badge: 'Guardian' },
    { amount: 800, label: 'Full Screening', impact: 'Comprehensive diagnostic screening', badge: 'Champion' },
    { amount: 2000, label: 'Complete Care', impact: '1 month complete care package', badge: 'Hero' }
  ];

  const programs = [
    {
      id: 'diagyn',
      icon: Stethoscope,
      title: 'Silver Health Checkup',
      subtitle: 'DiaGyn Clinic Program',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      offerings: [
        { text: 'Free monthly health checkups for seniors', target: '50 seniors/month' },
        { text: 'Subsidized doctor consultations (80% off)', target: '100 seniors/month' },
        { text: 'Free BP, Sugar, Basic vitals monitoring', target: 'Unlimited' }
      ]
    },
    {
      id: 'pharmacy',
      icon: Pill,
      title: 'Medicine for Elders',
      subtitle: 'Orange Pharmacy Program',
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      offerings: [
        { text: 'Free delivery for bedridden seniors', target: 'Unlimited' }
      ]
    },
    {
      id: 'proton',
      icon: FlaskConical,
      title: 'Senior Screening Drive',
      subtitle: 'Proton Diagnostics Program',
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      offerings: [
        { text: 'Free annual health screening packages', target: '200 seniors/year' },
        { text: 'Subsidized lab tests (20% off for 60+)', target: 'Ongoing' },
        { text: 'Free home sample collection for immobile seniors', target: '100/month' }
      ]
    },
    {
      id: 'evara',
      icon: Heart,
      title: "Grandma's Care",
      subtitle: 'Evara Women\'s Wellness Program',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      offerings: [
        { text: 'Free bone density & calcium screening', target: '5 women/month' }
      ]
    },
    {
      id: 'glydex',
      icon: Activity,
      title: 'Sugar-Free Seniors',
      subtitle: 'Glydex Diabetes Care Program',
      color: 'bg-teal-500',
      lightColor: 'bg-teal-50',
      offerings: [
        { text: 'Free HbA1c testing for diabetic seniors', target: 'Ongoing' },
        { text: 'Subsidized insulin & diabetes medicines', target: 'Ongoing' },
        { text: 'Free diabetes management consultations', target: '₹200/visit discount' },
        { text: 'Diabetic diet counseling sessions', target: 'Weekly camps' }
      ]
    }
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDonate = (amount) => {
    setSelectedAmount(amount);
    setShowDonateModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="font-bold text-lg text-gray-800">Give Back</h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 via-transparent to-purple-100/50"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Logo */}
          <div className="mb-6">
            <img 
              src="/icons/psvn-trust-logo.png" 
              alt="PSVN Charitable Trust" 
              className="w-32 h-32 md:w-40 md:h-40 mx-auto object-contain"
              data-testid="charity-logo"
            />
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
            Nevika Cura Senior Care
          </h1>
          <p className="text-lg md:text-xl text-purple-600 font-medium mb-4">
            by PSVN Charitable Trust
          </p>
          <p className="text-2xl md:text-3xl font-serif italic text-green-700 mb-6">
            "Caring for Those Who Cared for Us"
          </p>
          
          {/* Mission */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 md:p-8 shadow-lg border border-green-100 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
              <Heart className="w-5 h-5" />
              <span className="font-semibold">Our Mission</span>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Provide subsidized healthcare services to underprivileged senior citizens (60+ years) 
              who cannot afford medical care. Your small act of kindness can bring them free health 
              checkups, essential medicines, diagnostic screenings, and specialist consultations.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Donate Section */}
      <section className="py-8 bg-gradient-to-r from-green-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-white text-center text-xl md:text-2xl font-bold mb-6">
            Make a Difference Today
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {donationTiers.map((tier) => (
              <button
                key={tier.amount}
                onClick={() => handleDonate(tier.amount)}
                className="bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl p-4 text-center transition-all hover:scale-105"
                data-testid={`donate-${tier.amount}`}
              >
                <p className="text-2xl md:text-3xl font-bold text-white">₹{tier.amount}</p>
                <p className="text-white/90 text-sm mt-1">{tier.label}</p>
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <Button
              onClick={() => handleDonate('custom')}
              className="bg-white text-green-700 hover:bg-green-50 font-semibold px-8 py-3 rounded-full"
              data-testid="donate-custom"
            >
              <Heart className="w-5 h-5 mr-2" />
              Contribute Any Amount
            </Button>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-3">
            Our Programs
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Through our various healthcare modules, we provide comprehensive support to elderly citizens in need.
          </p>
          
          <div className="grid gap-6 md:gap-8">
            {programs.map((program) => (
              <Card key={program.id} className={`overflow-hidden border-0 shadow-lg ${program.lightColor}`}>
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left - Icon & Title */}
                    <div className={`${program.color} p-6 md:p-8 md:w-1/3 flex flex-col justify-center`}>
                      <program.icon className="w-12 h-12 text-white mb-4" />
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{program.title}</h3>
                      <p className="text-white/80 text-sm">{program.subtitle}</p>
                    </div>
                    
                    {/* Right - Offerings */}
                    <div className="p-6 md:p-8 md:w-2/3">
                      <h4 className="font-semibold text-gray-700 mb-4">What We Offer:</h4>
                      <div className="space-y-3">
                        {program.offerings.map((offering, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-gray-700">{offering.text}</p>
                              <p className="text-sm text-gray-500">Target: {offering.target}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Tiers */}
      <section className="py-12 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8">
            Your Impact
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {donationTiers.map((tier) => (
              <div 
                key={tier.amount}
                className="bg-white rounded-xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₹{tier.amount}</span>
                    <span className="text-gray-500 ml-2">- {tier.label}</span>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {tier.badge}
                  </span>
                </div>
                <p className="text-gray-600">{tier.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h2>
          <p className="text-gray-600 mb-6">
            For inquiries about our senior care programs or to volunteer
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="tel:+919403890429" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
            >
              <Phone className="w-5 h-5" />
              +91 9403890429
            </a>
            <a 
              href="https://wa.me/919403890429?text=I'm interested in the Senior Care Initiative" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-green-600 text-green-600 rounded-full hover:bg-green-50 transition-colors"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Donation Modal */}
      <Dialog open={showDonateModal} onOpenChange={setShowDonateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <Heart className="w-8 h-8 text-green-500 mx-auto mb-2" />
              Contribute to Senior Care
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Selected Amount */}
            {selectedAmount && selectedAmount !== 'custom' && (
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-gray-600">You're donating</p>
                <p className="text-3xl font-bold text-green-600">₹{selectedAmount}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {donationTiers.find(t => t.amount === selectedAmount)?.impact}
                </p>
              </div>
            )}

            {/* UPI Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Pay via UPI
              </h3>
              <div 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100"
                onClick={() => copyToClipboard(upiDetails.upiId)}
              >
                <div>
                  <p className="text-sm text-gray-500">UPI ID</p>
                  <p className="font-mono font-medium">{upiDetails.upiId}</p>
                </div>
                <Button variant="ghost" size="sm">
                  {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Bank Transfer
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name</span>
                  <span className="font-medium">{upiDetails.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank</span>
                  <span className="font-medium">{upiDetails.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account No.</span>
                  <span className="font-mono">{upiDetails.accountNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IFSC Code</span>
                  <span className="font-mono">{upiDetails.ifsc}</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Confirmation */}
            <div className="pt-2">
              <p className="text-sm text-gray-500 text-center mb-3">
                After payment, please share the screenshot on WhatsApp for acknowledgment
              </p>
              <a 
                href={`https://wa.me/919403890429?text=Hi, I've made a donation of ₹${selectedAmount || ''} to Senior Care Initiative. Please confirm.`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Phone className="w-5 h-5 mr-2" />
                  Confirm on WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeniorCare;
