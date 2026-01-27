import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trophy, BookOpen, Bell, Pill, Heart, Phone, FileText, 
  Activity, Users, Shield, Star, Zap, Calendar, Gift, Settings, Stethoscope
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Import all enhancement components
import {
  HealthScoreGamification,
  HealthContentHub,
  SmartReminders,
  EmergencySOS,
  MedicationInteractionChecker,
  QueueTracker,
  PrescriptionWallet,
  FamilyHub,
  LoyaltyPoints,
  SymptomChecker,
  NotificationPreferences,
  SmartScheduleOptimizer,
  PredictiveHealthInsights,
  AIAppointmentSuggestions,
  AutomatedHealthReports
} from '@/components/enhancements';

const EnhancementFeatures = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(null);

  const features = [
    {
      id: 'health-score',
      name: 'Health Score',
      description: 'Track your health, earn XP & badges',
      icon: Trophy,
      color: 'from-green-500 to-emerald-500',
      component: HealthScoreGamification,
      isNew: true
    },
    {
      id: 'reminders',
      name: 'Smart Reminders',
      description: 'Medication & appointment reminders',
      icon: Bell,
      color: 'from-blue-500 to-indigo-500',
      component: SmartReminders,
      isNew: true
    },
    {
      id: 'health-library',
      name: 'Health Library',
      description: 'Articles, videos & health tips',
      icon: BookOpen,
      color: 'from-teal-500 to-cyan-500',
      component: HealthContentHub,
      isNew: true
    },
    {
      id: 'interaction-checker',
      name: 'Drug Interaction',
      description: 'Check medicine interactions',
      icon: Pill,
      color: 'from-orange-500 to-red-500',
      component: MedicationInteractionChecker,
      isNew: true
    },
    {
      id: 'emergency-sos',
      name: 'Emergency SOS',
      description: 'Quick access to emergency services',
      icon: Phone,
      color: 'from-red-500 to-rose-500',
      component: EmergencySOS
    },
    {
      id: 'queue-tracker',
      name: 'Queue Tracker',
      description: 'Real-time queue position',
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      component: QueueTracker
    },
    {
      id: 'prescriptions',
      name: 'Prescriptions',
      description: 'Digital prescription wallet',
      icon: FileText,
      color: 'from-emerald-500 to-teal-500',
      component: PrescriptionWallet
    },
    {
      id: 'family-hub',
      name: 'Family Hub',
      description: 'Manage family health profiles',
      icon: Users,
      color: 'from-cyan-500 to-blue-500',
      component: FamilyHub
    },
    {
      id: 'loyalty',
      name: 'Loyalty Points',
      description: 'Earn & redeem rewards',
      icon: Gift,
      color: 'from-pink-500 to-rose-500',
      component: LoyaltyPoints
    },
    {
      id: 'symptom-checker',
      name: 'Symptom Checker',
      description: 'AI-powered symptom analysis',
      icon: Heart,
      color: 'from-rose-500 to-pink-500',
      component: SymptomChecker
    },
    {
      id: 'notifications',
      name: 'Notification Settings',
      description: 'Customize your alerts',
      icon: Settings,
      color: 'from-gray-500 to-slate-500',
      component: NotificationPreferences
    },
    // Phase 2 - AI Features
    {
      id: 'schedule-optimizer',
      name: 'Smart Scheduler',
      description: 'AI finds optimal appointment times',
      icon: Zap,
      color: 'from-indigo-500 to-purple-500',
      component: SmartScheduleOptimizer,
      isNew: true,
      isAI: true
    },
    {
      id: 'health-insights',
      name: 'Health Insights',
      description: 'AI-powered risk predictions',
      icon: Activity,
      color: 'from-emerald-500 to-teal-500',
      component: PredictiveHealthInsights,
      isNew: true,
      isAI: true
    },
    {
      id: 'find-doctor',
      name: 'Find Doctor',
      description: 'AI recommends specialists',
      icon: Stethoscope,
      color: 'from-rose-500 to-pink-500',
      component: AIAppointmentSuggestions,
      isNew: true,
      isAI: true
    },
    {
      id: 'health-report',
      name: 'Health Report',
      description: 'AI-generated health summary',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      component: AutomatedHealthReports,
      isNew: true,
      isAI: true
    },
  ];

  const renderFeatureGrid = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/patient-portal')}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Features & Tools</h1>
          <p className="text-sm text-gray-500">All your health tools in one place</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <Card
            key={feature.id}
            className="cursor-pointer hover:shadow-lg transition-all relative overflow-hidden"
            onClick={() => setActiveFeature(feature)}
            data-testid={`feature-${feature.id}`}
          >
            {feature.isAI && (
              <Badge className="absolute top-2 right-2 bg-purple-500 text-[10px]">AI</Badge>
            )}
            {feature.isNew && !feature.isAI && (
              <Badge className="absolute top-2 right-2 bg-teal-500 text-[10px]">NEW</Badge>
            )}
            <CardContent className="p-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{feature.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderActiveFeature = () => {
    if (!activeFeature) return null;
    
    const FeatureComponent = activeFeature.component;
    
    return (
      <div className="space-y-4">
        {/* Back Button */}
        <button 
          onClick={() => setActiveFeature(null)}
          className="flex items-center gap-2 text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Features</span>
        </button>
        
        {/* Feature Component */}
        <FeatureComponent />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto p-4">
        {activeFeature ? renderActiveFeature() : renderFeatureGrid()}
      </div>
    </div>
  );
};

export default EnhancementFeatures;
