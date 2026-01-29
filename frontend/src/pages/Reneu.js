import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Shield, Activity, Stethoscope, Calendar, Phone, CheckCircle2, 
  Clock, Heart, Brain, Syringe, FlaskConical, Users, Star, ChevronRight,
  Sparkles, Target, TrendingUp, AlertCircle, Package, Gift, Zap
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const Reneu = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('packages');

  const features = [
    { icon: Shield, text: 'Preventive Focus' },
    { icon: Clock, text: 'Early Detection' },
    { icon: Activity, text: 'Complete Checkups' },
    { icon: CheckCircle2, text: 'Expert Doctors' }
  ];

  // Preventive Health Packages
  const healthPackages = [
    {
      name: 'Basic Health Check',
      price: 999,
      originalPrice: 1499,
      tests: 35,
      includes: ['CBC', 'Lipid Profile', 'Blood Sugar', 'Liver Function', 'Kidney Function', 'Thyroid'],
      recommended: 'Everyone above 25',
      duration: '3-4 hours'
    },
    {
      name: 'Comprehensive Health Check',
      price: 2499,
      originalPrice: 3999,
      tests: 65,
      includes: ['All Basic Tests', 'Vitamin Panel', 'Cardiac Markers', 'Diabetes Markers', 'Urine Analysis', 'ECG'],
      recommended: 'Ages 35+',
      duration: '4-5 hours',
      popular: true
    },
    {
      name: 'Executive Health Check',
      price: 4999,
      originalPrice: 7999,
      tests: 85,
      includes: ['All Comprehensive Tests', 'Full Body CT', 'TMT/Stress Test', 'Ultrasound Abdomen', 'Bone Density', 'Cancer Markers'],
      recommended: 'Ages 40+ / Corporate',
      duration: 'Full Day'
    },
    {
      name: 'Senior Citizen Package',
      price: 3499,
      originalPrice: 5499,
      tests: 70,
      includes: ['Heart Health Panel', 'Bone Health', 'Vision & Hearing', 'Memory Screening', 'Fall Risk Assessment', 'Nutrition Panel'],
      recommended: 'Ages 60+',
      duration: '5-6 hours'
    }
  ];

  // Cancer Screening Packages
  const cancerScreening = {
    men: [
      { name: 'Prostate Cancer Screening', tests: ['PSA Test', 'Digital Rectal Exam'], age: '50+', price: 1299 },
      { name: 'Colon Cancer Screening', tests: ['FIT Test', 'Colonoscopy (if needed)'], age: '45+', price: 1499 },
      { name: 'Lung Cancer Screening', tests: ['Low-dose CT', 'Chest X-ray'], age: '55+ (smokers)', price: 2999 },
      { name: 'Oral Cancer Screening', tests: ['Visual Exam', 'Biopsy (if needed)'], age: '40+', price: 799 }
    ],
    women: [
      { name: 'Breast Cancer Screening', tests: ['Mammography', 'Clinical Breast Exam'], age: '40+', price: 1499 },
      { name: 'Cervical Cancer Screening', tests: ['Pap Smear', 'HPV Test'], age: '21+', price: 999 },
      { name: 'Ovarian Cancer Screening', tests: ['CA-125', 'Transvaginal Ultrasound'], age: '35+', price: 1799 },
      { name: 'Colon Cancer Screening', tests: ['FIT Test', 'Colonoscopy (if needed)'], age: '45+', price: 1499 }
    ]
  };

  // Vaccine Packages
  const vaccines = [
    { 
      name: 'Flu Vaccine', 
      desc: 'Annual influenza protection', 
      price: 1500, 
      doses: 1, 
      recommended: 'Everyone, annually',
      icon: '💉'
    },
    { 
      name: 'Pneumonia Vaccine', 
      desc: 'Pneumococcal protection', 
      price: 4500, 
      doses: 1, 
      recommended: '65+ or chronic illness',
      icon: '🫁'
    },
    { 
      name: 'Hepatitis B', 
      desc: 'Liver protection', 
      price: 3000, 
      doses: 3, 
      recommended: 'Healthcare workers',
      icon: '🔬'
    },
    { 
      name: 'Shingles Vaccine', 
      desc: 'Herpes zoster prevention', 
      price: 15000, 
      doses: 2, 
      recommended: '50+',
      icon: '🛡️'
    },
    { 
      name: 'HPV Vaccine', 
      desc: 'Cancer prevention', 
      price: 12000, 
      doses: 3, 
      recommended: 'Ages 9-45',
      icon: '✨'
    },
    { 
      name: 'Tdap Booster', 
      desc: 'Tetanus, Diphtheria, Pertussis', 
      price: 2500, 
      doses: 1, 
      recommended: 'Every 10 years',
      icon: '💪'
    }
  ];

  // Yearly Consultation Packages
  const consultationPackages = [
    {
      name: 'Individual Wellness Plan',
      price: 4999,
      duration: '1 Year',
      includes: [
        '4 Doctor Consultations',
        '1 Comprehensive Health Check',
        'Diet Consultation',
        'Fitness Assessment',
        '24/7 Teleconsultation Access'
      ],
      savings: 2000
    },
    {
      name: 'Family Wellness Plan',
      price: 9999,
      duration: '1 Year',
      members: 4,
      includes: [
        '12 Doctor Consultations (shared)',
        '4 Basic Health Checks',
        'Family Diet Plan',
        'Pediatric Checkup (if applicable)',
        'Priority Appointments'
      ],
      savings: 5000,
      popular: true
    },
    {
      name: 'Premium Health Plan',
      price: 14999,
      duration: '1 Year',
      includes: [
        'Unlimited GP Consultations',
        '2 Executive Health Checks',
        'Specialist Referrals',
        'Home Visit (2/year)',
        'Personal Health Manager',
        'Insurance Assistance'
      ],
      savings: 8000
    }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]" data-testid="reneu-page">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-700 to-slate-600 text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="reneu-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/uy8wpc27_file_00000000caf871fdae54ae4c4854bbd4.png" 
                    alt="Reneu" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">RENEU</h1>
                  <p className="text-sm opacity-90">Preventive Health</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Trust Badges */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center gap-4 overflow-x-auto">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-slate-700" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Hero */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-slate-50 to-stone-100 border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Preventive Health & Wellness</h2>
            <p className="text-slate-600 mb-4">
              Prevention is better than cure. Comprehensive health packages, cancer screenings, 
              vaccinations, and yearly wellness plans to keep you healthy.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button className="bg-slate-800 hover:bg-slate-900 rounded-xl" data-testid="reneu-book-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Book Health Check
              </Button>
              <Button variant="outline" className="rounded-xl border-slate-300 text-slate-700">
                <Phone className="w-4 h-4 mr-2" />
                Consult Expert
              </Button>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'packages', label: 'Health Packages', icon: Package },
              { id: 'cancer', label: 'Cancer Screening', icon: Target },
              { id: 'vaccines', label: 'Vaccines', icon: Syringe },
              { id: 'plans', label: 'Yearly Plans', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Health Packages Tab */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Preventive Health Checkup Packages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthPackages.map((pkg, idx) => (
                  <Card 
                    key={idx} 
                    className={`p-4 hover:shadow-lg transition-all ${pkg.popular ? 'ring-2 ring-green-500' : ''}`}
                    data-testid={`health-package-${idx}`}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">Most Popular</Badge>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-800">{pkg.name}</h4>
                        <p className="text-sm text-slate-500">{pkg.tests} Tests • {pkg.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-800">₹{pkg.price}</p>
                        <p className="text-sm text-slate-400 line-through">₹{pkg.originalPrice}</p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Includes:</p>
                      <div className="flex flex-wrap gap-1">
                        {pkg.includes.slice(0, 4).map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                        ))}
                        {pkg.includes.length > 4 && (
                          <Badge variant="outline" className="text-xs">+{pkg.includes.length - 4} more</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        {pkg.recommended}
                      </p>
                      <Button size="sm" className="bg-slate-800 hover:bg-slate-900">
                        Book Now
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cancer Screening Tab */}
          {activeTab === 'cancer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Cancer Screening Programs</h3>
              <p className="text-slate-600 text-sm mb-4">Early detection saves lives. Regular screenings can detect cancer before symptoms appear.</p>
              
              {/* Men's Screening */}
              <Card className="p-4 border-blue-200">
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Men's Cancer Screening
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cancerScreening.men.map((screen, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-xl" data-testid={`men-screen-${idx}`}>
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-slate-800">{screen.name}</h5>
                        <Badge className="bg-blue-100 text-blue-700">₹{screen.price}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{screen.tests.join(', ')}</p>
                      <p className="text-xs text-blue-600 mt-1">Recommended: {screen.age}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Women's Screening */}
              <Card className="p-4 border-pink-200">
                <h4 className="font-semibold text-pink-700 mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Women's Cancer Screening
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cancerScreening.women.map((screen, idx) => (
                    <div key={idx} className="p-3 bg-pink-50 rounded-xl" data-testid={`women-screen-${idx}`}>
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-slate-800">{screen.name}</h5>
                        <Badge className="bg-pink-100 text-pink-700">₹{screen.price}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{screen.tests.join(', ')}</p>
                      <p className="text-xs text-pink-600 mt-1">Recommended: {screen.age}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Vaccines Tab */}
          {activeTab === 'vaccines' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Adult Vaccination Program</h3>
              <p className="text-slate-600 text-sm mb-4">Stay protected with essential vaccines for adults.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {vaccines.map((vaccine, idx) => (
                  <Card key={idx} className="p-4 hover:shadow-lg transition-all" data-testid={`vaccine-${idx}`}>
                    <div className="text-3xl mb-2">{vaccine.icon}</div>
                    <h4 className="font-bold text-slate-800">{vaccine.name}</h4>
                    <p className="text-sm text-slate-500 mb-2">{vaccine.desc}</p>
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline">{vaccine.doses} dose{vaccine.doses > 1 ? 's' : ''}</Badge>
                      <p className="font-bold text-slate-800">₹{vaccine.price}</p>
                    </div>
                    <p className="text-xs text-green-600 mb-3">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      {vaccine.recommended}
                    </p>
                    <Button size="sm" variant="outline" className="w-full">
                      Book Vaccination
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Yearly Plans Tab */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Yearly Consultation Packages</h3>
              <p className="text-slate-600 text-sm mb-4">Comprehensive care plans with significant savings.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {consultationPackages.map((plan, idx) => (
                  <Card 
                    key={idx} 
                    className={`p-4 hover:shadow-lg transition-all ${plan.popular ? 'ring-2 ring-green-500 relative' : ''}`}
                    data-testid={`yearly-plan-${idx}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white">Best Value</Badge>
                    )}
                    <div className="text-center mb-4 pt-2">
                      <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                      {plan.members && (
                        <p className="text-sm text-slate-500">Up to {plan.members} family members</p>
                      )}
                      <p className="text-3xl font-bold text-slate-800 mt-2">₹{plan.price}</p>
                      <p className="text-sm text-slate-500">/{plan.duration}</p>
                      <Badge className="bg-green-100 text-green-700 mt-2">Save ₹{plan.savings}</Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {plan.includes.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button className="w-full bg-slate-800 hover:bg-slate-900">
                      Choose Plan
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Why Preventive Care */}
          <Card className="p-6 mt-8 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Why Preventive Care Matters
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold">80%</p>
                <p className="text-sm opacity-80">of diseases preventable</p>
              </div>
              <div>
                <p className="text-3xl font-bold">5x</p>
                <p className="text-sm opacity-80">ROI on prevention</p>
              </div>
              <div>
                <p className="text-3xl font-bold">90%</p>
                <p className="text-sm opacity-80">early cancer survival</p>
              </div>
              <div>
                <p className="text-3xl font-bold">10+</p>
                <p className="text-sm opacity-80">years life extension</p>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Reneu;
