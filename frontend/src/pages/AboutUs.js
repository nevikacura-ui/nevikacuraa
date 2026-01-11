import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, Heart, Users, Target, Award, Building, 
  Stethoscope, TestTube, Pill, Sparkles, Clock, MapPin,
  Mail, Phone, Shield, Star
} from 'lucide-react';

const AboutUs = () => {
  const navigate = useNavigate();

  const services = [
    {
      name: "DiaGyn Healthcare",
      description: "Expert doctor consultations for women's health, gynecology, and general medicine",
      icon: Stethoscope,
      color: "bg-pink-500"
    },
    {
      name: "Proton Diagnostics",
      description: "Comprehensive diagnostic tests with home sample collection and quick reports",
      icon: TestTube,
      color: "bg-blue-500"
    },
    {
      name: "Orange Pharmacy",
      description: "Genuine medicines delivered to your doorstep with prescription verification",
      icon: Pill,
      color: "bg-orange-500"
    },
    {
      name: "Evara Wellness",
      description: "Women's wellness programs with AI-powered guidance and pregnancy support",
      icon: Sparkles,
      color: "bg-purple-500"
    },
    {
      name: "Glydex Diabetes Care",
      description: "Comprehensive diabetes management with blood sugar tracking and expert guidance",
      icon: Heart,
      color: "bg-teal-500"
    }
  ];

  const values = [
    {
      title: "Patient First",
      description: "Every decision we make starts with 'How does this help our patients?'",
      icon: Heart
    },
    {
      title: "Quality Care",
      description: "Partnering with certified professionals and accredited laboratories",
      icon: Award
    },
    {
      title: "Accessibility",
      description: "Making quality healthcare available to everyone, everywhere",
      icon: MapPin
    },
    {
      title: "Trust & Privacy",
      description: "Your health information is sacred. We protect it with the highest standards",
      icon: Shield
    }
  ];

  const stats = [
    { number: "50,000+", label: "Happy Patients" },
    { number: "100+", label: "Expert Doctors" },
    { number: "500+", label: "Tests Available" },
    { number: "24/7", label: "Support" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-800">About Us</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            Your Health, Our Priority
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-teal-600">Nevika Cura</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive healthcare platform bringing quality medical services to your fingertips. 
            From doctor consultations to diagnostics to medicines — all under one trusted roof.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-6">
                <p className="text-3xl font-bold text-teal-600">{stat.number}</p>
                <p className="text-gray-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Our Story */}
        <section className="bg-white rounded-2xl p-8 shadow-sm mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Our Story</h2>
          </div>
          <div className="space-y-4 text-gray-600">
            <p>
              Nevika Cura was born from a simple yet powerful vision: to make quality healthcare accessible, 
              affordable, and convenient for every Indian family. We saw the challenges people face — 
              long queues at hospitals, difficulty finding reliable doctors, hassle of getting tests done, 
              and the uncertainty of buying genuine medicines.
            </p>
            <p>
              Our team of healthcare professionals, technologists, and patient advocates came together to 
              build a platform that addresses these challenges head-on. Today, Nevika Cura serves thousands 
              of patients across India, offering a seamless healthcare experience from consultation to recovery.
            </p>
            <p>
              The name "Nevika Cura" combines "Nevika" (meaning "pure" or "new") with "Cura" (Latin for "care"), 
              reflecting our commitment to delivering pure, modern healthcare solutions with genuine care.
            </p>
          </div>
        </section>

        {/* Our Mission & Vision */}
        <section className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-teal-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Our Mission</h3>
              </div>
              <p className="text-gray-600">
                To democratize healthcare by providing accessible, affordable, and high-quality medical services 
                to every individual, leveraging technology to bridge the gap between patients and healthcare providers.
              </p>
            </CardContent>
          </Card>
          <Card className="border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Our Vision</h3>
              </div>
              <p className="text-gray-600">
                To become India's most trusted healthcare companion — a platform where every person can access 
                world-class healthcare services with the convenience of their smartphone, regardless of their location.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Our Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Our Core Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-teal-600" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Our Services */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Our Services</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${service.color} flex items-center justify-center mb-4`}>
                    <service.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-8 text-white mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Why Choose Nevika Cura?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Verified Professionals</h4>
                <p className="text-sm text-teal-100">All doctors are verified with valid registrations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">NABL Accredited Labs</h4>
                <p className="text-sm text-teal-100">Partner labs with highest quality standards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">100% Genuine Medicines</h4>
                <p className="text-sm text-teal-100">Sourced directly from authorized distributors</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Quick Turnaround</h4>
                <p className="text-sm text-teal-100">Same-day appointments and fast deliveries</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Home Services</h4>
                <p className="text-sm text-teal-100">Sample collection and medicine delivery at home</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Patient Support</h4>
                <p className="text-sm text-teal-100">Dedicated support team for all your queries</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Get in Touch</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-teal-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Email Us</h4>
                <p className="text-teal-600">help@nevikacura.com</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-teal-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Call Us</h4>
                <p className="text-teal-600">+91 98765 43210</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-teal-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Working Hours</h4>
                <p className="text-gray-600">Mon-Sat: 8AM - 10PM</p>
                <p className="text-gray-600">Sun: 9AM - 6PM</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Have a question, feedback, or partnership inquiry? We'd love to hear from you!
            </p>
            <Button 
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => window.location.href = 'mailto:help@nevikacura.com'}
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Us
            </Button>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-8">
          <p>© 2026 Nevika Cura Healthcare Group. All rights reserved.</p>
          <p className="mt-2">Made with ❤️ for healthier lives</p>
        </div>
      </main>
    </div>
  );
};

export default AboutUs;
