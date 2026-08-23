import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, Heart, Users, Target, Award, Building, 
  Stethoscope, TestTube, Pill, Sparkles, Clock, MapPin,
  Mail, Phone, Shield, Star, Instagram, ExternalLink
} from 'lucide-react';

const AboutUs = () => {
  const navigate = useNavigate();

  const services = [
    {
      name: "DiaGyn Healthcare",
      description: "Expert consultations for diabetes, gynecology, and women's health",
      icon: Stethoscope,
      color: "bg-teal-500"
    },
    {
      name: "Mango Health Labs",
      description: "Comprehensive diagnostic tests with home sample collection",
      icon: TestTube,
      color: "bg-blue-500"
    },
    {
      name: "Orange Pharmacy",
      description: "Genuine medicines delivered to your doorstep",
      icon: Pill,
      color: "bg-orange-500"
    },
    {
      name: "Evara Wellness",
      description: "Women's wellness programs with AI-powered guidance",
      icon: Sparkles,
      color: "bg-purple-500"
    },
    {
      name: "Glydex Diabetes Care",
      description: "Comprehensive diabetes management and tracking",
      icon: Heart,
      color: "bg-emerald-500"
    }
  ];

  const values = [
    { title: "Patient First", description: "Every decision starts with how it helps our patients", icon: Heart },
    { title: "Quality Care", description: "Partnering with certified professionals and labs", icon: Award },
    { title: "Accessibility", description: "Quality healthcare available to everyone, everywhere", icon: MapPin },
    { title: "Trust & Privacy", description: "Your health data is protected with highest standards", icon: Shield }
  ];

  const stats = [
    { number: "35,000+", label: "Patients Served" },
    { number: "50+", label: "Expert Doctors" },
    { number: "500+", label: "Tests Available" },
    { number: "24/7", label: "Online Support" }
  ];

  const socialLinks = [
    { name: 'Instagram', url: 'https://www.instagram.com/nevikacura', icon: Instagram, color: 'hover:text-pink-400' },
    { name: 'Facebook', url: 'https://www.facebook.com/share/1DjepDF7Uh/', color: 'hover:text-blue-400', svgIcon: true },
    { name: 'Threads', url: 'https://www.threads.com/@nevikacura', color: 'hover:text-white', svgIcon: true }
  ];

  return (
    <div className="min-h-screen bg-[#050510] text-white" data-testid="about-us-page">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">About Nevika Cura</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-teal-500/30">
            <Heart className="w-4 h-4" />
            Your Health, Our Priority
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Welcome to <span className="text-teal-400">Nevika Cura</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto">
            Nevika Cura LLP is a comprehensive healthcare platform bringing quality medical services to your fingertips. 
            From doctor consultations to diagnostics to medicines — all under one trusted roof.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="bg-[#1A1A1A] rounded-2xl p-6 text-center border border-white/10">
              <p className="text-3xl font-bold text-teal-400">{stat.number}</p>
              <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Our Story */}
        <section className="bg-[#1A1A1A] rounded-2xl p-6 sm:p-8 border border-white/10 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
              <Building className="w-6 h-6 text-teal-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Our Story</h2>
          </div>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              Nevika Cura LLP was born from a simple yet powerful vision: to make quality healthcare accessible, 
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

        {/* Mission & Vision */}
        <section className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-teal-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Our Mission</h3>
            </div>
            <p className="text-gray-300">
              To democratize healthcare by providing accessible, affordable, and high-quality medical services 
              to every individual, leveraging technology to bridge the gap between patients and providers.
            </p>
          </div>
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Our Vision</h3>
            </div>
            <p className="text-gray-300">
              To become India's most trusted healthcare companion — a platform where every person can access 
              world-class healthcare with the convenience of their smartphone.
            </p>
          </div>
        </section>

        {/* Core Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Our Core Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((value, index) => (
              <div key={index} className="bg-[#1A1A1A] rounded-2xl p-6 text-center border border-white/10 hover:border-teal-500/30 transition-colors">
                <div className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-teal-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Our Services</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <div key={index} className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
                <div className={`w-12 h-12 rounded-xl ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">{service.name}</h3>
                <p className="text-sm text-gray-400">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-[#1A1A1A] rounded-2xl p-6 sm:p-8 border border-white/10 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Get in Touch</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-teal-400" />
              </div>
              <p className="font-semibold text-white mb-1">Email</p>
              <a href="mailto:nevikacura@gmail.com" className="text-teal-400 text-sm">nevikacura@gmail.com</a>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-teal-400" />
              </div>
              <p className="font-semibold text-white mb-1">WhatsApp</p>
              <a href="https://wa.me/919640257409" className="text-teal-400 text-sm">+91 96402 57409</a>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-teal-400" />
              </div>
              <p className="font-semibold text-white mb-1">Working Hours</p>
              <p className="text-gray-400 text-sm">Mon-Sat: 8AM - 10PM</p>
              <p className="text-gray-400 text-sm">Sun: Online Only</p>
            </div>
          </div>
        </section>

        {/* Social Media */}
        <section className="text-center mb-12">
          <h2 className="text-lg font-bold text-white mb-4">Follow Us</h2>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.instagram.com/nevikacura"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="about-social-instagram"
              className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-gray-400 hover:text-pink-400 hover:border-pink-400/50 transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://www.facebook.com/share/1DjepDF7Uh/"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="about-social-facebook"
              className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:border-blue-400/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a
              href="https://www.threads.com/@nevikacura"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="about-social-threads"
              className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.243 1.33-3.023.88-.744 2.084-1.168 3.59-1.264 1.104-.07 2.134.032 3.073.304-.079-.96-.417-1.705-.989-2.178-.667-.552-1.65-.834-2.924-.842h-.038c-.942.007-1.79.24-2.322.637l-1.13-1.66C9.614 4.56 10.765 4.248 12.038 4.235h.05c1.768.015 3.134.494 4.063 1.424.848.849 1.353 2.042 1.503 3.548.575.254 1.095.571 1.553.94.945.762 1.608 1.79 1.918 2.975.396 1.515.326 3.747-1.478 5.514-1.795 1.76-4.05 2.584-7.283 2.611l-.003-.003h-.028l.016.003-.031-.003zm-.503-9.776c-1.125.072-1.96.382-2.49.927-.498.512-.685 1.125-.654 1.685.048.852.578 1.838 2.576 1.838l.156-.004c1.048-.057 1.85-.46 2.382-1.198.39-.541.648-1.26.766-2.133-.856-.278-1.75-.405-2.668-.348l-.068.003v.232z"/></svg>
            </a>
          </div>
        </section>

        {/* Company Footer */}
        <div className="text-center text-gray-500 text-sm py-8 border-t border-white/10">
          <p className="font-medium text-gray-400">Nevika Cura LLP</p>
          <p className="mt-1">Registered Healthcare Technology Company</p>
          <p className="mt-2">&copy; 2026 Nevika Cura LLP. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
};

export default AboutUs;
