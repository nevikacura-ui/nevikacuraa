import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, Download, Smartphone, Monitor, Apple, 
  Chrome, MoreVertical, Plus, Share, Check, Zap, 
  Shield, Wifi, Bell, ArrowRight, Play
} from 'lucide-react';

const HowToInstall = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('android');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if already installed
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    }
  };

  const androidSteps = [
    {
      step: 1,
      title: "Open Chrome Browser",
      description: "Open Google Chrome on your Android phone",
      icon: Chrome,
      tip: "Make sure you're using the latest version of Chrome"
    },
    {
      step: 2,
      title: "Visit Nevika Cura",
      description: "Go to nevikacura.com in your browser",
      icon: Monitor,
      tip: "Type the full URL in the address bar"
    },
    {
      step: 3,
      title: "Tap Menu (⋮)",
      description: "Tap the three-dot menu icon in the top-right corner",
      icon: MoreVertical,
      tip: "Look for ⋮ next to the address bar"
    },
    {
      step: 4,
      title: "Add to Home Screen",
      description: "Select 'Add to Home Screen' or 'Install App'",
      icon: Plus,
      tip: "Scroll down if you don't see the option immediately"
    },
    {
      step: 5,
      title: "Confirm Installation",
      description: "Tap 'Add' on the confirmation popup",
      icon: Check,
      tip: "You can rename the app shortcut if you want"
    }
  ];

  const iosSteps = [
    {
      step: 1,
      title: "Open Safari Browser",
      description: "Open Safari on your iPhone (not Chrome)",
      icon: Apple,
      tip: "This feature only works in Safari on iOS"
    },
    {
      step: 2,
      title: "Visit Nevika Cura",
      description: "Go to nevikacura.com in Safari",
      icon: Monitor,
      tip: "Type the full URL in the address bar"
    },
    {
      step: 3,
      title: "Tap Share Button",
      description: "Tap the Share icon (square with arrow) at the bottom",
      icon: Share,
      tip: "It's in the center of the bottom toolbar"
    },
    {
      step: 4,
      title: "Add to Home Screen",
      description: "Scroll down and tap 'Add to Home Screen'",
      icon: Plus,
      tip: "You may need to scroll down in the share menu"
    },
    {
      step: 5,
      title: "Confirm",
      description: "Tap 'Add' in the top-right corner",
      icon: Check,
      tip: "The app icon will appear on your home screen"
    }
  ];

  const benefits = [
    { icon: Zap, title: "Faster Loading", desc: "Opens instantly like a native app" },
    { icon: Shield, title: "Secure", desc: "Same security as the website" },
    { icon: Wifi, title: "Works Offline", desc: "Access basic features without internet" },
    { icon: Bell, title: "Notifications", desc: "Get appointment & medicine reminders" }
  ];

  const steps = activeTab === 'android' ? androidSteps : iosSteps;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="how-to-install-page">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Download className="w-6 h-6 text-teal-500" />
            Install App
          </h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3">
            Get Nevika Cura on Your Phone
          </h2>
          <p className="text-slate-600 max-w-md mx-auto">
            Install our app directly from your browser - no app store needed! Works on Android & iPhone.
          </p>
          
          {/* Quick Install Button (if available) */}
          {installPrompt && !isInstalled && (
            <Button
              onClick={handleInstall}
              className="mt-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8 py-6 rounded-xl shadow-lg text-lg"
              data-testid="quick-install-btn"
            >
              <Download className="w-6 h-6 mr-2" />
              Install Now (One Click)
            </Button>
          )}
          
          {isInstalled && (
            <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-xl">
              <Check className="w-5 h-5" />
              App Already Installed!
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="text-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <benefit.icon className="w-6 h-6 text-teal-600" />
              </div>
              <h4 className="font-semibold text-slate-800 text-sm">{benefit.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* Platform Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('android')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'android'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              data-testid="tab-android"
            >
              <Chrome className="w-5 h-5" />
              Android (Chrome)
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'ios'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              data-testid="tab-ios"
            >
              <Apple className="w-5 h-5" />
              iPhone (Safari)
            </button>
          </div>
        </div>

        {/* Step by Step Instructions */}
        <div className="space-y-4 mb-10">
          <h3 className="text-xl font-bold text-slate-800 text-center mb-6">
            Step-by-Step Instructions
          </h3>
          
          {steps.map((step, idx) => (
            <Card key={idx} className="overflow-hidden hover:shadow-md transition-all" data-testid={`step-${step.step}`}>
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-5">
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {step.step}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="w-5 h-5 text-teal-600" />
                      <h4 className="font-semibold text-slate-800">{step.title}</h4>
                    </div>
                    <p className="text-slate-600 text-sm mb-2">{step.description}</p>
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs">
                      <span className="font-medium">💡 Tip:</span> {step.tip}
                    </div>
                  </div>
                  
                  {/* Arrow for next step */}
                  {idx < steps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-3" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Video Tutorial Placeholder */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-center mb-10">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Watch Video Tutorial</h3>
          <p className="text-slate-400 mb-4">See the installation process in action</p>
          <Badge className="bg-amber-500 text-white">Coming Soon</Badge>
        </div>

        {/* FAQ */}
        <div className="space-y-4 mb-10">
          <h3 className="text-xl font-bold text-slate-800 text-center mb-6">
            Frequently Asked Questions
          </h3>
          
          {[
            { q: "Is this app free?", a: "Yes! The Nevika Cura app is completely free to install and use." },
            { q: "Will it take space on my phone?", a: "Very minimal - less than 5MB. Much smaller than regular apps!" },
            { q: "Is it safe?", a: "Absolutely! It uses the same secure connection as our website (HTTPS)." },
            { q: "Can I uninstall it?", a: "Yes, just like any other app - long press and delete." },
            { q: "Why can't I find it on Play Store/App Store?", a: "We use PWA technology which lets you install directly from browser - faster updates, smaller size!" }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-1">{faq.q}</h4>
              <p className="text-sm text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">Need help? Contact us!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.href = 'tel:+919403890429'}
              variant="outline"
              className="rounded-xl"
            >
              📞 Call: +91 94038 90429
            </Button>
            <Button
              onClick={() => window.open('https://wa.me/919403890429?text=Hi, I need help installing the Nevika Cura app', '_blank')}
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
            >
              💬 WhatsApp Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToInstall;
