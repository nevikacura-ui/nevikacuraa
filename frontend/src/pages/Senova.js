import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, Users, Heart, Brain, Pill, Home, Activity, Phone, MessageCircle,
  Calendar, CheckCircle2, Clock, Shield, Stethoscope, HandHeart, ChevronRight,
  UserPlus, Bell, RefreshCw, MapPin, FileText, AlertTriangle, Video, Upload,
  Star, X, Building, Award, Ambulance, HeartPulse, Footprints, Eye,
  ClipboardList, CalendarClock, BookOpen, Gift, HelpCircle, CircleDot
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const Senova = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('services');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Senior profile state
  const [seniorProfile, setSeniorProfile] = useState({
    name: '',
    age: '',
    phone: '',
    address: '',
    conditions: []
  });
  
  // Family contacts state
  const [familyContacts, setFamilyContacts] = useState({
    primary: { name: '', phone: '', relation: '' },
    secondary: { name: '', phone: '', relation: '' }
  });
  
  // Medicine reminders
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({ medicine: '', time: '', frequency: 'daily' });

  // Services data
  const services = [
    { 
      id: 'geriatric',
      icon: Stethoscope, 
      title: 'Geriatric Consultations', 
      desc: 'Specialized elderly health care',
      color: 'from-blue-500 to-indigo-600',
      features: ['Home/Video consult option', 'Age-specific assessment', 'Report upload']
    },
    { 
      id: 'chronic',
      icon: HeartPulse, 
      title: 'Chronic Disease Care', 
      desc: 'Diabetes, BP & heart monitoring',
      color: 'from-red-500 to-pink-600',
      features: ['Regular monitoring plans', 'Vital logs (BP, sugar)', 'Monthly review summary']
    },
    { 
      id: 'memory',
      icon: Brain, 
      title: 'Memory & Cognitive Care', 
      desc: 'Dementia screening & cognitive care',
      color: 'from-purple-500 to-violet-600',
      features: ['Screening questionnaires', 'Memory exercises', 'Family alerts']
    },
    { 
      id: 'mobility',
      icon: Footprints, 
      title: 'Mobility & Arthritis Care', 
      desc: 'Joint pain & fall-risk assessment',
      color: 'from-orange-500 to-amber-600',
      features: ['Mobility score tracking', 'Physiotherapy referrals', 'Home safety checklist']
    },
    { 
      id: 'medication',
      icon: Pill, 
      title: 'Medication Review', 
      desc: 'Optimize medicines, reduce side effects',
      color: 'from-green-500 to-emerald-600',
      features: ['Drug interaction check', 'Deprescribing alerts', 'Monthly pharmacist review']
    },
    { 
      id: 'homecare',
      icon: Home, 
      title: 'Home Care Coordination', 
      desc: 'Nursing & caregiver support',
      color: 'from-cyan-500 to-teal-600',
      features: ['Shift scheduling', 'Visit logs', 'Family notifications']
    }
  ];

  // Old age homes data
  const oldAgeHomes = [
    { name: 'Shanti Niketan Old Age Home', type: 'Trust', location: 'Dharampeth, Nagpur', phone: '0712-2547123', emergency: true },
    { name: 'Matoshri Vrudhashram', type: 'Paid', location: 'Sitabuldi, Nagpur', phone: '0712-2735489', emergency: false },
    { name: 'Snehalaya Senior Care', type: 'Medical Care', location: 'Manewada, Nagpur', phone: '0712-2891234', emergency: true },
    { name: 'Prayas Foundation', type: 'Trust', location: 'Civil Lines, Nagpur', phone: '0712-2562345', emergency: false }
  ];

  // Government schemes
  const govtSchemes = [
    { 
      name: 'Indira Gandhi National Old Age Pension', 
      type: 'Central',
      benefit: '₹200-500/month pension',
      eligibility: 'BPL citizens aged 60+'
    },
    { 
      name: 'Rashtriya Vayoshri Yojana', 
      type: 'Central',
      benefit: 'Free assistive devices',
      eligibility: 'BPL seniors aged 60+ with disabilities'
    },
    { 
      name: 'Varishtha Pension Bima Yojana', 
      type: 'Central',
      benefit: 'Guaranteed 8% pension',
      eligibility: 'Citizens aged 60+'
    },
    { 
      name: 'Ayushman Bharat - PMJAY', 
      type: 'Central',
      benefit: '₹5 lakh health cover',
      eligibility: 'Senior citizens in eligible families'
    },
    { 
      name: 'Shravan Bal Seva Rajya Nivruti Vetan', 
      type: 'Maharashtra',
      benefit: '₹600/month pension',
      eligibility: 'Destitute seniors aged 65+'
    },
    { 
      name: 'Senior Citizen Savings Scheme', 
      type: 'Central',
      benefit: '8.2% interest rate',
      eligibility: 'Citizens aged 60+'
    }
  ];

  const handleServiceClick = (service) => {
    setSelectedService(service);
    setShowBookingDialog(true);
  };

  const handleQuickRefill = async () => {
    if (!seniorProfile.phone || seniorProfile.phone.length !== 10) {
      toast.error('Please enter your phone number first');
      return;
    }
    
    setLoading(true);
    try {
      // Simulate API call for refill
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Refill request sent! Our pharmacist will call you shortly.');
    } catch (error) {
      toast.error('Failed to process refill request');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTestBooking = async () => {
    if (!seniorProfile.phone || seniorProfile.phone.length !== 10) {
      toast.error('Please enter your phone number first');
      return;
    }
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Test booking request sent! Our lab technician will call you shortly.');
    } catch (error) {
      toast.error('Failed to process test booking');
    } finally {
      setLoading(false);
    }
  };

  const addReminder = () => {
    if (!newReminder.medicine || !newReminder.time) {
      toast.error('Please fill medicine name and time');
      return;
    }
    setReminders([...reminders, { ...newReminder, id: Date.now() }]);
    setNewReminder({ medicine: '', time: '', frequency: 'daily' });
    toast.success('Reminder added successfully!');
  };

  const removeReminder = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
    toast.success('Reminder removed');
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4] pb-20" data-testid="senova-page">
        {/* Header with Senova Branding */}
        <header className="bg-gradient-to-r from-[#3b5998] to-[#4a69ad] text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/')}
                  className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                  data-testid="senova-back-btn"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white/90">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/nz0rdwvp_file_000000000dfc7230a4605006a1e3131a.png" 
                      alt="Senova" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-wide">SENOVA</h1>
                    <p className="text-sm opacity-90">Care for Life's Next Chapter</p>
                  </div>
                </div>
              </div>
              
              {/* Emergency SOS Button */}
              <Button 
                onClick={() => window.location.href = 'tel:+919403890429'}
                className="bg-red-500 hover:bg-red-600 rounded-full px-4"
                data-testid="sos-btn"
              >
                <Ambulance className="w-4 h-4 mr-2" />
                SOS
              </Button>
            </div>
          </div>
        </header>

        {/* Family & Caregiver Support Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <HandHeart className="w-6 h-6 text-blue-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800">For Families & Caregivers</h4>
                <p className="text-sm text-blue-700 mb-3">
                  We support the entire family. Caregiver guidance, family counseling, and 24/7 helpline available.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => window.location.href = 'tel:+919403890429'}
                    className="bg-blue-600 hover:bg-blue-700 rounded-full"
                    data-testid="call-helpline-btn"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call Helpline
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open('https://wa.me/919403890429?text=Hi, I need help with senior care', '_blank')}
                    className="border-blue-300 text-blue-700 rounded-full"
                    data-testid="chat-coordinator-btn"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat with Care Coordinator
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[
                { id: 'services', label: 'Services', icon: Stethoscope },
                { id: 'family', label: 'Family', icon: Users },
                { id: 'reminders', label: 'Reminders', icon: Bell },
                { id: 'quickbook', label: 'Quick Book', icon: RefreshCw },
                { id: 'homes', label: 'Old Age Homes', icon: Building },
                { id: 'schemes', label: 'Govt Schemes', icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeSection === tab.id
                      ? 'bg-[#3b5998] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          
          {/* Senior Profile Quick Entry */}
          <Card className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Senior Profile</h3>
                <p className="text-xs text-slate-500">Quick access for one-tap services</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                placeholder="Senior's Name"
                value={seniorProfile.name}
                onChange={(e) => setSeniorProfile({...seniorProfile, name: e.target.value})}
                className="text-sm"
                data-testid="senior-name"
              />
              <Input
                placeholder="Age"
                type="number"
                value={seniorProfile.age}
                onChange={(e) => setSeniorProfile({...seniorProfile, age: e.target.value})}
                className="text-sm"
                data-testid="senior-age"
              />
              <Input
                placeholder="Phone Number"
                value={seniorProfile.phone}
                onChange={(e) => setSeniorProfile({...seniorProfile, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                className="text-sm"
                data-testid="senior-phone"
              />
              <Input
                placeholder="Address"
                value={seniorProfile.address}
                onChange={(e) => setSeniorProfile({...seniorProfile, address: e.target.value})}
                className="text-sm"
                data-testid="senior-address"
              />
            </div>
          </Card>

          {/* SERVICES SECTION */}
          {activeSection === 'services' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#3b5998]" />
                Our Services
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Card 
                    key={service.id} 
                    className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => handleServiceClick(service)}
                    data-testid={`service-${service.id}`}
                  >
                    <div className={`h-2 bg-gradient-to-r ${service.color}`} />
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center flex-shrink-0`}>
                          <service.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 group-hover:text-[#3b5998] transition-colors">
                            {service.title}
                          </h4>
                          <p className="text-sm text-slate-500 mb-2">{service.desc}</p>
                          <ul className="space-y-1">
                            {service.features.map((feature, idx) => (
                              <li key={idx} className="text-xs text-slate-600 flex items-center gap-1">
                                <CircleDot className="w-3 h-3 text-[#3b5998]" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Button className="w-full mt-4 bg-[#3b5998] hover:bg-[#4a69ad] rounded-xl">
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* FAMILY CONTACTS SECTION */}
          {activeSection === 'family' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#3b5998]" />
                Family Member Contacts
              </h3>
              <p className="text-sm text-slate-600">
                Add emergency contacts for appointment alerts, missed medication alerts, and emergency notifications.
              </p>
              
              {/* Primary Contact */}
              <Card className="p-4">
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Primary Caregiver (Required)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Name"
                    value={familyContacts.primary.name}
                    onChange={(e) => setFamilyContacts({...familyContacts, primary: {...familyContacts.primary, name: e.target.value}})}
                    data-testid="primary-name"
                  />
                  <Input
                    placeholder="Phone Number"
                    value={familyContacts.primary.phone}
                    onChange={(e) => setFamilyContacts({...familyContacts, primary: {...familyContacts.primary, phone: e.target.value.replace(/\D/g, '').slice(0, 10)}})}
                    data-testid="primary-phone"
                  />
                  <Input
                    placeholder="Relation (Son/Daughter/etc)"
                    value={familyContacts.primary.relation}
                    onChange={(e) => setFamilyContacts({...familyContacts, primary: {...familyContacts.primary, relation: e.target.value}})}
                    data-testid="primary-relation"
                  />
                </div>
              </Card>
              
              {/* Secondary Contact */}
              <Card className="p-4">
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  Secondary Emergency Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Name"
                    value={familyContacts.secondary.name}
                    onChange={(e) => setFamilyContacts({...familyContacts, secondary: {...familyContacts.secondary, name: e.target.value}})}
                    data-testid="secondary-name"
                  />
                  <Input
                    placeholder="Phone Number"
                    value={familyContacts.secondary.phone}
                    onChange={(e) => setFamilyContacts({...familyContacts, secondary: {...familyContacts.secondary, phone: e.target.value.replace(/\D/g, '').slice(0, 10)}})}
                    data-testid="secondary-phone"
                  />
                  <Input
                    placeholder="Relation"
                    value={familyContacts.secondary.relation}
                    onChange={(e) => setFamilyContacts({...familyContacts, secondary: {...familyContacts.secondary, relation: e.target.value}})}
                    data-testid="secondary-relation"
                  />
                </div>
              </Card>
              
              <Button 
                className="w-full bg-[#3b5998] hover:bg-[#4a69ad] rounded-xl"
                onClick={() => toast.success('Family contacts saved!')}
                data-testid="save-family-btn"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Family Contacts
              </Button>
              
              {/* Use Cases Info */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">When will family be notified?</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Appointment confirmations & reminders</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Emergency SOS alerts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Missed medication alerts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Home visit completion reports</li>
                </ul>
              </Card>
            </div>
          )}

          {/* MEDICINE REMINDERS SECTION */}
          {activeSection === 'reminders' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#3b5998]" />
                Medicine Reminder System
              </h3>
              
              {/* Add New Reminder */}
              <Card className="p-4">
                <h4 className="font-medium text-slate-800 mb-3">Add New Reminder</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Input
                    placeholder="Medicine Name"
                    value={newReminder.medicine}
                    onChange={(e) => setNewReminder({...newReminder, medicine: e.target.value})}
                    className="sm:col-span-2"
                    data-testid="reminder-medicine"
                  />
                  <Input
                    type="time"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
                    data-testid="reminder-time"
                  />
                  <select
                    value={newReminder.frequency}
                    onChange={(e) => setNewReminder({...newReminder, frequency: e.target.value})}
                    className="border rounded-lg px-3 py-2 text-sm"
                    data-testid="reminder-frequency"
                  >
                    <option value="daily">Daily</option>
                    <option value="twice">Twice Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <Button 
                  onClick={addReminder}
                  className="mt-3 bg-[#3b5998] hover:bg-[#4a69ad] rounded-xl"
                  data-testid="add-reminder-btn"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Add Reminder
                </Button>
              </Card>
              
              {/* Active Reminders */}
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700">Active Reminders ({reminders.length})</h4>
                {reminders.length === 0 ? (
                  <Card className="p-6 text-center">
                    <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No reminders set yet</p>
                  </Card>
                ) : (
                  reminders.map((reminder) => (
                    <Card key={reminder.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Pill className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{reminder.medicine}</p>
                          <p className="text-sm text-slate-500">{reminder.time} • {reminder.frequency}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeReminder(reminder.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </Card>
                  ))
                )}
              </div>
              
              {/* Reminder Features Info */}
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Reminder Features
                </h4>
                <ul className="space-y-1 text-sm text-amber-700">
                  <li>• Daily dose notifications on phone</li>
                  <li>• Voice reminder option (coming soon)</li>
                  <li>• Missed dose alert to family caregiver</li>
                  <li>• Medicine completion alerts</li>
                </ul>
              </Card>
            </div>
          )}

          {/* QUICK BOOK SECTION */}
          {activeSection === 'quickbook' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#3b5998]" />
                One-Click Services
              </h3>
              <p className="text-sm text-slate-600">
                For registered seniors with saved details. No forms needed - our team will call to confirm.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Medicine Refill */}
                <Card className="p-6 hover:shadow-lg transition-all">
                  <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                    <Pill className="w-7 h-7 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Medicine Refill</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Pharmacist will call to confirm previous order and deliver to your doorstep.
                  </p>
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
                    onClick={handleQuickRefill}
                    disabled={loading}
                    data-testid="quick-refill-btn"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Pill className="w-4 h-4 mr-2" />}
                    Refill Medicine
                  </Button>
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox id="auto-refill" />
                    <label htmlFor="auto-refill" className="text-xs text-slate-600">
                      Automate refills every 30 days
                    </label>
                  </div>
                </Card>
                
                {/* Test Booking */}
                <Card className="p-6 hover:shadow-lg transition-all">
                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                    <Activity className="w-7 h-7 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Book Lab Test</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Lab technician will call to confirm and collect sample at your home.
                  </p>
                  <Button 
                    className="w-full bg-purple-500 hover:bg-purple-600 rounded-xl"
                    onClick={handleQuickTestBooking}
                    disabled={loading}
                    data-testid="quick-test-btn"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                    Book Test
                  </Button>
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox id="auto-test" />
                    <label htmlFor="auto-test" className="text-xs text-slate-600">
                      Schedule monthly health check
                    </label>
                  </div>
                </Card>
              </div>
              
              {/* How it works */}
              <Card className="p-4 bg-slate-50">
                <h4 className="font-medium text-slate-800 mb-3">How One-Click Works</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { step: '1', text: 'Tap Button' },
                    { step: '2', text: 'We Call You' },
                    { step: '3', text: 'Confirm Order' },
                    { step: '4', text: 'Doorstep Service' }
                  ].map((s) => (
                    <div key={s.step}>
                      <div className="w-8 h-8 bg-[#3b5998] text-white rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-bold">
                        {s.step}
                      </div>
                      <p className="text-xs text-slate-600">{s.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* OLD AGE HOMES SECTION */}
          {activeSection === 'homes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-[#3b5998]" />
                Nearby Old Age Homes
              </h3>
              <p className="text-sm text-slate-600">
                Directory of old age homes in Nagpur for long-term care planning or emergency relocation.
              </p>
              
              <div className="space-y-3">
                {oldAgeHomes.map((home, idx) => (
                  <Card key={idx} className="p-4 hover:shadow-md transition-all" data-testid={`home-${idx}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800">{home.name}</h4>
                            {home.emergency && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Emergency Available</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs">{home.type}</Badge>
                          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {home.location}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `tel:${home.phone}`}
                        className="rounded-full"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* GOVERNMENT SCHEMES SECTION */}
          {activeSection === 'schemes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3b5998]" />
                Senior Citizen Government Benefits
              </h3>
              <p className="text-sm text-slate-600">
                Current central & state schemes for senior citizens. Updated quarterly.
              </p>
              
              <div className="space-y-3">
                {govtSchemes.map((scheme, idx) => (
                  <Card key={idx} className="p-4" data-testid={`scheme-${idx}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        scheme.type === 'Central' ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        <Award className={`w-5 h-5 ${scheme.type === 'Central' ? 'text-orange-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-800">{scheme.name}</h4>
                          <Badge className={`text-xs ${
                            scheme.type === 'Central' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {scheme.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-green-600 font-medium mt-1">{scheme.benefit}</p>
                        <p className="text-xs text-slate-500 mt-1">Eligibility: {scheme.eligibility}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* How to Apply Info */}
              <Card className="p-4 bg-slate-50">
                <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  How to Apply
                </h4>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Visit nearest Senior Citizen Welfare Office or CSC center</li>
                  <li>Carry Aadhaar, Age proof, Income certificate</li>
                  <li>Fill application form</li>
                  <li>Submit and get acknowledgment receipt</li>
                </ol>
              </Card>
            </div>
          )}

        </main>

        {/* Service Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedService && <selectedService.icon className="w-5 h-5 text-[#3b5998]" />}
                Book {selectedService?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Consultation Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['Home Visit', 'Video Call', 'At Clinic'].map((type) => (
                    <Button key={type} variant="outline" className="rounded-xl text-sm">
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Preferred Date</Label>
                <Input type="date" className="mt-2" />
              </div>
              <div>
                <Label>Preferred Time</Label>
                <select className="w-full border rounded-xl px-3 py-2 mt-2">
                  <option>Morning (9 AM - 12 PM)</option>
                  <option>Afternoon (12 PM - 4 PM)</option>
                  <option>Evening (4 PM - 8 PM)</option>
                </select>
              </div>
              <div>
                <Label>Additional Notes</Label>
                <Textarea placeholder="Any specific concerns or requirements" className="mt-2" />
              </div>
              <Button 
                className="w-full bg-[#3b5998] hover:bg-[#4a69ad] rounded-xl"
                onClick={() => {
                  toast.success('Booking request submitted! We will call you to confirm.');
                  setShowBookingDialog(false);
                }}
                data-testid="confirm-booking-btn"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Booking
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 24/7 Helpline Floating Button */}
        <div className="fixed bottom-24 right-4 z-40">
          <Button 
            onClick={() => window.location.href = 'tel:+919403890429'}
            className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-600 shadow-lg"
            data-testid="floating-helpline"
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>

        <BottomNav />
      </div>
    </AnimatedPage>
  );
};

export default Senova;
