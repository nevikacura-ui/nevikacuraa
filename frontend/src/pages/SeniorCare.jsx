import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  Stethoscope, 
  Pill, 
  FlaskConical, 
  Users, 
  Activity,
  ArrowLeft,
  CheckCircle,
  Phone
} from 'lucide-react';
import Footer from '@/components/Footer';

const SeniorCare = () => {
  const navigate = useNavigate();

  const programs = [
    {
      id: 'diagyn',
      icon: Stethoscope,
      title: 'Silver Health Checkup',
      subtitle: 'DiaGyn Clinic Program',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      offerings: [
        { text: 'Subsidized monthly health checkups for seniors', target: '50 seniors/month' },
        { text: 'Subsidized doctor consultations (80% off)', target: '100 seniors/month' },
        { text: 'Discounted BP, Sugar, Basic vitals monitoring', target: 'Unlimited' }
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
        { text: 'Free delivery for bedridden seniors', target: 'Unlimited' },
        { text: 'Subsidized essential medicines (up to 30% off)', target: 'Ongoing' },
        { text: 'Priority prescription processing', target: 'All seniors' }
      ]
    },
    {
      id: 'proton',
      icon: FlaskConical,
      title: 'Senior Screening Drive',
      subtitle: 'Mango Health Labs Program',
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      offerings: [
        { text: 'Subsidized annual health screening packages (50% off)', target: '200 seniors/year' },
        { text: 'Discounted lab tests (20% off for 60+)', target: 'Ongoing' },
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
        { text: 'Subsidized bone density & calcium screening (60% off)', target: '50 women/month' },
        { text: 'Discounted menopause wellness consultations', target: 'Ongoing' },
        { text: 'Women\'s nutrition counseling sessions', target: 'Weekly camps' },
        { text: 'Osteoporosis awareness programs', target: 'Monthly events' }
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
        { text: 'Subsidized HbA1c testing for diabetic seniors (40% off)', target: 'Ongoing' },
        { text: 'Discounted insulin & diabetes medicines', target: 'Ongoing' },
        { text: 'Discounted diabetes management consultations', target: '₹200/visit discount' },
        { text: 'Diabetic diet counseling sessions', target: 'Weekly camps' },
        { text: 'Continuous glucose monitoring support', target: '20 seniors/month' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg text-gray-900">Senior Care Initiative</h1>
            <p className="text-xs text-gray-500">by PSVN Foundation</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-16 bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-200 rounded-full opacity-30 blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-200 rounded-full opacity-30 blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Logo */}
          <div className="mb-6">
            <img 
              src="/icons/psvn-foundation-logo.png" 
              alt="PSVN Foundation" 
              className="w-32 h-32 md:w-40 md:h-40 mx-auto object-contain"
              data-testid="charity-logo"
            />
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
            Nevika Cura Senior Care
          </h1>
          <p className="text-lg md:text-xl text-purple-600 font-medium mb-4">
            by PSVN Foundation
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A self-sufficient foundation dedicated to providing subsidized healthcare services 
            to senior citizens across our network of clinics.
          </p>
          
          {/* Foundation Badge */}
          <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur rounded-full shadow-md">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-800">Self-Sufficient Foundation</span>
            <span className="text-gray-500">•</span>
            <span className="text-green-600 font-medium">No Grants Needed</span>
          </div>
        </div>
      </section>

      {/* Our Initiatives */}
      <section className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Our Initiatives</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Senior / Old Age Initiative */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">For Seniors / Old Age</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                Dedicated healthcare support for senior citizens (60+) including subsidized checkups, 
                medicines, diagnostic tests, and specialist consultations through our clinic network.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Health Checkups</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Medicine Support</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Home Visits</span>
              </div>
            </div>

            {/* Animal Welfare Initiative */}
            <div className="bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl p-6 text-white shadow-xl">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">For Animals</h3>
              <p className="text-white/90 text-sm leading-relaxed">
                Compassionate care for stray and abandoned animals including medical treatment, 
                vaccination drives, rescue operations, and rehabilitation support in our community.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Medical Care</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Vaccination</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs">Rescue & Rehab</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-purple-100">
            <div className="flex items-center gap-2 text-purple-600 mb-3">
              <Heart className="w-5 h-5" />
              <span className="font-semibold">Our Mission</span>
            </div>
            <p className="text-gray-700 leading-relaxed">
              PSVN Foundation is committed to providing subsidized healthcare services to senior citizens (60+ years). 
              As a self-sufficient foundation, we fund our programs through our healthcare network, 
              ensuring sustainable support for the elderly in our community.
            </p>
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
            Through our various healthcare modules, we provide comprehensive support to elderly citizens.
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

      {/* Contact Section */}
      <section className="py-12 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h2>
          <p className="text-gray-600 mb-6">
            For inquiries about our senior care programs or to enroll a senior citizen
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="tel:+919403890429" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
            >
              <Phone className="w-5 h-5" />
              +91 9403890429
            </a>
            <a 
              href="https://wa.me/919403890429?text=I'm interested in the Senior Care Initiative" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-purple-600 text-purple-600 rounded-full hover:bg-purple-50 transition-colors"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default SeniorCare;
