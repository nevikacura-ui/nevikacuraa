import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Shield, Activity, Stethoscope, Calendar, Phone, CheckCircle2, 
  Clock, Heart, Sparkles, ChevronRight, Users, Star, Leaf
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const Reneu = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('packages');

  // Hero images for visual appeal
  const heroImages = {
    main: 'https://images.unsplash.com/photo-6798766/pexels-photo-6798766.jpeg',
    checkup: 'https://images.pexels.com/photos/7659566/pexels-photo-7659566.jpeg',
    family: 'https://images.unsplash.com/photo-1683189592146-e02da4cf0733?w=400',
    vaccine: 'https://images.pexels.com/photos/5973352/pexels-photo-5973352.jpeg'
  };

  // Preventive Health Packages with images
  const healthPackages = [
    {
      name: 'Basic Health Check',
      price: 999,
      originalPrice: 1499,
      tests: 35,
      image: 'https://images.pexels.com/photos/6798766/pexels-photo-6798766.jpeg',
      includes: ['CBC', 'Lipid Profile', 'Blood Sugar', 'Liver Function', 'Kidney Function', 'Thyroid'],
      recommended: 'Everyone above 25',
      duration: '3-4 hours',
      color: 'from-emerald-400 to-teal-500'
    },
    {
      name: 'Comprehensive Health Check',
      price: 2499,
      originalPrice: 3999,
      tests: 65,
      image: 'https://images.pexels.com/photos/7659566/pexels-photo-7659566.jpeg',
      includes: ['All Basic Tests', 'Vitamin Panel', 'Cardiac Markers', 'Diabetes Markers', 'Urine Analysis', 'ECG'],
      recommended: 'Ages 35+',
      duration: '4-5 hours',
      popular: true,
      color: 'from-blue-400 to-indigo-500'
    },
    {
      name: 'Executive Health Check',
      price: 4999,
      originalPrice: 7999,
      tests: 85,
      image: 'https://images.unsplash.com/photo-1752659985958-cb2bc9e5875e?w=400',
      includes: ['All Comprehensive Tests', 'Full Body CT', 'TMT/Stress Test', 'Ultrasound Abdomen', 'Bone Density', 'Cancer Markers'],
      recommended: 'Ages 40+ / Corporate',
      duration: 'Full Day',
      color: 'from-purple-400 to-pink-500'
    },
    {
      name: 'Senior Citizen Package',
      price: 3499,
      originalPrice: 5499,
      tests: 70,
      image: 'https://images.unsplash.com/photo-1683189592146-e02da4cf0733?w=400',
      includes: ['Heart Health Panel', 'Bone Health', 'Vision & Hearing', 'Memory Screening', 'Fall Risk Assessment', 'Nutrition Panel'],
      recommended: 'Ages 60+',
      duration: '5-6 hours',
      color: 'from-amber-400 to-orange-500'
    }
  ];

  // Cancer Screening with visual categories
  const cancerScreening = {
    men: [
      { name: 'Prostate Cancer', tests: ['PSA Test', 'Digital Rectal Exam'], age: '50+', price: 1299, emoji: '🔬' },
      { name: 'Colon Cancer', tests: ['FIT Test', 'Colonoscopy'], age: '45+', price: 1499, emoji: '🩺' },
      { name: 'Lung Cancer', tests: ['Low-dose CT', 'Chest X-ray'], age: '55+ (smokers)', price: 2999, emoji: '🫁' },
      { name: 'Oral Cancer', tests: ['Visual Exam', 'Biopsy'], age: '40+', price: 799, emoji: '👄' }
    ],
    women: [
      { name: 'Breast Cancer', tests: ['Mammography', 'Clinical Exam'], age: '40+', price: 1499, emoji: '🎀' },
      { name: 'Cervical Cancer', tests: ['Pap Smear', 'HPV Test'], age: '21+', price: 999, emoji: '🌸' },
      { name: 'Ovarian Cancer', tests: ['CA-125', 'Ultrasound'], age: '35+', price: 1799, emoji: '🔮' },
      { name: 'Colon Cancer', tests: ['FIT Test', 'Colonoscopy'], age: '45+', price: 1499, emoji: '🩺' }
    ]
  };

  // Vaccines with visual representation
  const vaccines = [
    { name: 'Flu Vaccine', desc: 'Annual influenza protection', price: 1500, doses: 1, recommended: 'Everyone, annually', image: 'https://images.pexels.com/photos/5973352/pexels-photo-5973352.jpeg', color: 'bg-blue-100' },
    { name: 'Pneumonia Vaccine', desc: 'Pneumococcal protection', price: 4500, doses: 1, recommended: '65+ or chronic illness', image: 'https://images.unsplash.com/photo-1608326389417-d3f9cc46de04?w=200', color: 'bg-teal-100' },
    { name: 'Hepatitis B', desc: 'Liver protection', price: 3000, doses: 3, recommended: 'Healthcare workers', image: 'https://images.unsplash.com/photo-1623867822372-3cd497e3b383?w=200', color: 'bg-green-100' },
    { name: 'Shingles Vaccine', desc: 'Herpes zoster prevention', price: 15000, doses: 2, recommended: '50+', image: 'https://images.unsplash.com/photo-1608422050828-485141c98429?w=200', color: 'bg-purple-100' },
    { name: 'HPV Vaccine', desc: 'Cancer prevention', price: 12000, doses: 3, recommended: 'Ages 9-45', image: 'https://images.unsplash.com/photo-1609009630912-f16dcf3e03a6?w=200', color: 'bg-pink-100' },
    { name: 'Tdap Booster', desc: 'Tetanus, Diphtheria, Pertussis', price: 2500, doses: 1, recommended: 'Every 10 years', image: 'https://images.pexels.com/photos/8577983/pexels-photo-8577983.jpeg', color: 'bg-amber-100' }
  ];

  // Yearly Plans
  const consultationPackages = [
    {
      name: 'Individual Wellness',
      price: 4999,
      duration: '1 Year',
      includes: ['4 Doctor Consultations', '1 Comprehensive Health Check', 'Diet Consultation', 'Fitness Assessment', '24/7 Teleconsultation'],
      savings: 2000,
      icon: '👤',
      color: 'from-green-400 to-emerald-500'
    },
    {
      name: 'Family Wellness',
      price: 9999,
      duration: '1 Year',
      members: 4,
      includes: ['12 Doctor Consultations', '4 Basic Health Checks', 'Family Diet Plan', 'Pediatric Checkup', 'Priority Appointments'],
      savings: 5000,
      popular: true,
      icon: '👨‍👩‍👧‍👦',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      name: 'Premium Health',
      price: 14999,
      duration: '1 Year',
      includes: ['Unlimited GP Consultations', '2 Executive Health Checks', 'Specialist Referrals', 'Home Visit (2/year)', 'Personal Health Manager'],
      savings: 8000,
      icon: '👑',
      color: 'from-purple-400 to-pink-500'
    }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white" data-testid="reneu-page">
        {/* Header with Nature Theme */}
        <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-50">
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
                  <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
                    RENEU <Leaf className="w-5 h-5 text-green-300" />
                  </h1>
                  <p className="text-sm text-emerald-100">Preventive Health & Wellness</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Trust Badges - Colorful Pills */}
        <div className="bg-white border-b border-emerald-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center gap-3 overflow-x-auto">
              {[
                { emoji: '🛡️', text: 'Preventive Focus', bg: 'bg-emerald-50 text-emerald-700' },
                { emoji: '⏰', text: 'Early Detection', bg: 'bg-blue-50 text-blue-700' },
                { emoji: '✅', text: 'Complete Checkups', bg: 'bg-purple-50 text-purple-700' },
                { emoji: '👨‍⚕️', text: 'Expert Doctors', bg: 'bg-amber-50 text-amber-700' }
              ].map((feature, idx) => (
                <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0 ${feature.bg}`}>
                  <span className="text-lg">{feature.emoji}</span>
                  <span className="text-xs font-semibold whitespace-nowrap">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Hero Section with Image */}
          <Card className="overflow-hidden mb-6 border-0 shadow-xl">
            <div className="relative h-48 sm:h-56">
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"
                alt="Healthy Lifestyle"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 to-transparent" />
              <div className="absolute inset-0 p-6 flex flex-col justify-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Prevention is Better Than Cure
                </h2>
                <p className="text-emerald-100 text-sm sm:text-base max-w-md mb-4">
                  Comprehensive health packages, cancer screenings, vaccinations & yearly wellness plans
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-full shadow-lg" data-testid="reneu-book-btn">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Health Check
                  </Button>
                  <Button variant="outline" className="rounded-full border-white/50 text-white hover:bg-white/20">
                    <Phone className="w-4 h-4 mr-2" />
                    Consult Expert
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs - Modern Pill Style */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'packages', label: 'Health Packages', emoji: '📋' },
              { id: 'cancer', label: 'Cancer Screening', emoji: '🎯' },
              { id: 'vaccines', label: 'Vaccines', emoji: '💉' },
              { id: 'plans', label: 'Yearly Plans', emoji: '📅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200' 
                    : 'bg-white text-gray-600 hover:bg-emerald-50 border border-gray-200'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Health Packages Tab - Card with Images */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏥</span>
                <h3 className="text-xl font-bold text-gray-800">Preventive Health Checkup Packages</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthPackages.map((pkg, idx) => (
                  <Card 
                    key={idx} 
                    className={`overflow-hidden hover:shadow-xl transition-all ${pkg.popular ? 'ring-2 ring-emerald-500' : ''}`}
                    data-testid={`health-package-${idx}`}
                  >
                    {/* Image Header */}
                    <div className="relative h-32">
                      <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 bg-gradient-to-r ${pkg.color} opacity-60`} />
                      {pkg.popular && (
                        <Badge className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 shadow-lg">
                          ⭐ Most Popular
                        </Badge>
                      )}
                      <div className="absolute bottom-3 left-3 text-white">
                        <h4 className="font-bold text-lg drop-shadow-md">{pkg.name}</h4>
                        <p className="text-sm opacity-90">{pkg.tests} Tests • {pkg.duration}</p>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-2xl font-bold text-gray-800">₹{pkg.price.toLocaleString()}</p>
                          <p className="text-sm text-gray-400 line-through">₹{pkg.originalPrice.toLocaleString()}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700">
                          Save ₹{pkg.originalPrice - pkg.price}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {pkg.includes.slice(0, 4).map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-gray-50">{item}</Badge>
                          ))}
                          {pkg.includes.length > 4 && (
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                              +{pkg.includes.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {pkg.recommended}
                        </p>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-full">
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cancer Screening Tab - Visual Cards */}
          {activeTab === 'cancer' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎯</span>
                <h3 className="text-xl font-bold text-gray-800">Cancer Screening Programs</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">Early detection saves lives. Regular screenings can detect cancer before symptoms appear.</p>
              
              {/* Men's Screening */}
              <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2 text-lg">
                  <span className="text-2xl">👨</span>
                  Men's Cancer Screening
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cancerScreening.men.map((screen, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all" data-testid={`men-screen-${idx}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{screen.emoji}</span>
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-800">{screen.name}</h5>
                          <p className="text-xs text-gray-500 mt-1">{screen.tests.join(', ')}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge className="bg-blue-100 text-blue-700">Age {screen.age}</Badge>
                            <span className="font-bold text-gray-800">₹{screen.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Women's Screening */}
              <Card className="p-5 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
                <h4 className="font-bold text-pink-800 mb-4 flex items-center gap-2 text-lg">
                  <span className="text-2xl">👩</span>
                  Women's Cancer Screening
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cancerScreening.women.map((screen, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all" data-testid={`women-screen-${idx}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{screen.emoji}</span>
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-800">{screen.name}</h5>
                          <p className="text-xs text-gray-500 mt-1">{screen.tests.join(', ')}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge className="bg-pink-100 text-pink-700">Age {screen.age}</Badge>
                            <span className="font-bold text-gray-800">₹{screen.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Vaccines Tab - Visual Grid */}
          {activeTab === 'vaccines' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💉</span>
                <h3 className="text-xl font-bold text-gray-800">Adult Vaccination Program</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">Stay protected with essential vaccines for adults.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {vaccines.map((vaccine, idx) => (
                  <Card key={idx} className="overflow-hidden hover:shadow-xl transition-all group" data-testid={`vaccine-${idx}`}>
                    <div className="relative h-28">
                      <img src={vaccine.image} alt={vaccine.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <h4 className="font-bold text-white drop-shadow-md">{vaccine.name}</h4>
                      </div>
                    </div>
                    <div className={`p-4 ${vaccine.color}`}>
                      <p className="text-sm text-gray-600 mb-2">{vaccine.desc}</p>
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline" className="bg-white">{vaccine.doses} dose{vaccine.doses > 1 ? 's' : ''}</Badge>
                        <p className="font-bold text-gray-800">₹{vaccine.price.toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-emerald-700 mb-3 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {vaccine.recommended}
                      </p>
                      <Button size="sm" variant="outline" className="w-full bg-white hover:bg-gray-50 rounded-full">
                        Book Vaccination
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Yearly Plans Tab - Premium Cards */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📅</span>
                <h3 className="text-xl font-bold text-gray-800">Yearly Wellness Plans</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">Comprehensive care plans with significant savings.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {consultationPackages.map((plan, idx) => (
                  <Card 
                    key={idx} 
                    className={`overflow-hidden hover:shadow-xl transition-all ${plan.popular ? 'ring-2 ring-emerald-500 relative' : ''}`}
                    data-testid={`yearly-plan-${idx}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
                          ⭐ Best Value
                        </Badge>
                      </div>
                    )}
                    
                    {/* Gradient Header */}
                    <div className={`h-24 bg-gradient-to-r ${plan.color} flex items-center justify-center pt-2`}>
                      <span className="text-5xl">{plan.icon}</span>
                    </div>
                    
                    <div className="p-4 pt-3">
                      <div className="text-center mb-4">
                        <h4 className="font-bold text-gray-800 text-lg">{plan.name}</h4>
                        {plan.members && (
                          <p className="text-sm text-gray-500">Up to {plan.members} family members</p>
                        )}
                        <p className="text-3xl font-bold text-gray-800 mt-2">₹{plan.price.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">/{plan.duration}</p>
                        <Badge className="bg-green-100 text-green-700 mt-2">Save ₹{plan.savings.toLocaleString()}</Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {plan.includes.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button className={`w-full rounded-full bg-gradient-to-r ${plan.color} hover:opacity-90`}>
                        Choose Plan
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Why Preventive Care - Stats Section */}
          <Card className="p-6 mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 opacity-10">
              <Leaf className="w-48 h-48" />
            </div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              Why Preventive Care Matters
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center relative z-10">
              {[
                { value: '80%', label: 'of diseases preventable' },
                { value: '5x', label: 'ROI on prevention' },
                { value: '90%', label: 'early cancer survival' },
                { value: '10+', label: 'years life extension' }
              ].map((stat, idx) => (
                <div key={idx} className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <p className="text-3xl font-bold text-yellow-300">{stat.value}</p>
                  <p className="text-sm opacity-90">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Reneu;
