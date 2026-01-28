import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, HandHeart, Heart, Users, Gift, Stethoscope, Home,
  Calendar, CheckCircle2, Phone, Shield, Sparkles, Award
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const PSVNFoundation = () => {
  const navigate = useNavigate();

  const initiatives = [
    { icon: Stethoscope, title: 'Free Health Camps', desc: 'Regular health checkups for underserved communities' },
    { icon: Heart, title: 'Patient Support Fund', desc: 'Financial assistance for critical treatments' },
    { icon: Users, title: 'Community Outreach', desc: 'Health awareness & education programs' },
    { icon: Gift, title: 'Medicine Assistance', desc: 'Free medicines for those in need' },
    { icon: Home, title: 'Senior Care Support', desc: 'Home care for elderly without family support' },
    { icon: Award, title: 'Healthcare Scholarships', desc: 'Supporting future healthcare professionals' }
  ];

  const features = [
    { icon: Shield, text: 'Transparent Operations' },
    { icon: Heart, text: 'Community Focused' },
    { icon: CheckCircle2, text: '100% Donation Utilized' },
    { icon: Sparkles, text: 'Impact Reports' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]">
        {/* Header with PSVN Foundation Logo */}
        <header className="bg-gradient-to-r from-pink-500 to-rose-500 text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="psvn-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white/90">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/p3zt5ovj_Pink%20Simple%20Charity%20Logo_20260128_183244_0000.png" 
                    alt="PSVN Foundation" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold">PSVN Foundation</h1>
                  <p className="text-sm opacity-90">Care. Compassion. Community.</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Trust Badges */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center gap-4 overflow-x-auto">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-pink-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Hero Section */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Healthcare for All</h2>
            <p className="text-slate-600 mb-4">
              PSVN Foundation is committed to making quality healthcare accessible to everyone. 
              Through free health camps, patient support, and community programs, we serve those in need.
            </p>
            <div className="flex gap-3">
              <Button className="bg-pink-600 hover:bg-pink-700 rounded-xl" data-testid="psvn-donate-btn">
                <Gift className="w-4 h-4 mr-2" />
                Donate Now
              </Button>
              <Button variant="outline" className="rounded-xl border-pink-300 text-pink-600">
                <Users className="w-4 h-4 mr-2" />
                Volunteer
              </Button>
            </div>
          </Card>

          {/* Impact Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4 text-center bg-white">
              <p className="text-3xl font-bold text-pink-600">10K+</p>
              <p className="text-sm text-slate-600">Patients Helped</p>
            </Card>
            <Card className="p-4 text-center bg-white">
              <p className="text-3xl font-bold text-pink-600">50+</p>
              <p className="text-sm text-slate-600">Health Camps</p>
            </Card>
            <Card className="p-4 text-center bg-white">
              <p className="text-3xl font-bold text-pink-600">₹5L+</p>
              <p className="text-sm text-slate-600">Medicines Given</p>
            </Card>
          </div>

          {/* Mission Banner */}
          <Card className="p-4 mb-6 bg-pink-50 border-pink-200">
            <div className="flex items-start gap-3">
              <Heart className="w-6 h-6 text-pink-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-pink-800">Our Mission</h4>
                <p className="text-sm text-pink-700">
                  "No one should be denied healthcare due to financial constraints. Together, we can make a difference."
                </p>
              </div>
            </div>
          </Card>

          {/* Initiatives Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Initiatives</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {initiatives.map((initiative, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group" data-testid={`psvn-initiative-${idx}`}>
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-pink-600 transition-colors">
                  <initiative.icon className="w-6 h-6 text-pink-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{initiative.title}</h4>
                <p className="text-sm text-slate-500">{initiative.desc}</p>
              </Card>
            ))}
          </div>

          {/* Contact Banner */}
          <Card className="p-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-center">
            <HandHeart className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Join Our Mission</h3>
            <p className="opacity-90 mb-4">Every contribution makes a difference. Support healthcare for all.</p>
            <Button variant="secondary" className="bg-white text-pink-600 hover:bg-pink-50">
              <Phone className="w-4 h-4 mr-2" />
              Contact Us
            </Button>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default PSVNFoundation;
