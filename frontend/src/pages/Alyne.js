import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Baby, Plus, ArrowLeft, Calendar, Syringe, TrendingUp, FileText, 
  Bell, Heart, User, Shield, Activity, Scale, Ruler, 
  CheckCircle, Clock, AlertTriangle, ChevronRight, Trash2,
  Upload, MessageCircle, Send, ShoppingCart, Package, Stethoscope, 
  Thermometer, Star, BookOpen, GraduationCap, Phone, Pill, 
  Eye, Scissors, Brain, Utensils, Moon, Droplets, X
} from 'lucide-react';
import Footer from '@/components/Footer';

const API = process.env.REACT_APP_BACKEND_URL;

// ALYNE Logo (same as home page)
const ALYNE_LOGO = "https://customer-assets.emergentagent.com/job_kids-health-portal/artifacts/mrmio3uk_file_000000006cd87207b39dc03d0e62d1ad%20%281%29.png";

// Content Data for USA and India
const REGION_CONTENT = {
  india: {
    emergency: "108 / 112",
    emergencyLabel: "National Emergency Number",
    guidelines: "IAP (Indian Academy of Pediatrics)",
    currency: "₹",
    vaccineSchedule: "National Immunization Schedule + IAP",
    healthTips: [
      "Exclusive breastfeeding for 6 months (WHO/IAP)",
      "Start complementary foods at 6 months with dal, rice, khichdi",
      "Regular growth monitoring at Anganwadi centers",
      "Complete immunization as per IAP schedule",
      "Use ORS + Zinc for diarrhea management"
    ],
    commonIssues: [
      "Dengue fever prevention",
      "Typhoid vaccination",
      "Malaria protection",
      "Heat rash in summers",
      "Monsoon-related infections"
    ]
  },
  usa: {
    emergency: "911",
    emergencyLabel: "Emergency Services",
    guidelines: "CDC & AAP (American Academy of Pediatrics)",
    currency: "$",
    vaccineSchedule: "CDC Recommended Schedule",
    healthTips: [
      "Exclusive breastfeeding for 6 months (AAP)",
      "Iron-fortified cereals as first foods",
      "Regular well-child visits with pediatrician",
      "Stay up-to-date with CDC vaccine schedule",
      "Childproof home by 6 months"
    ],
    commonIssues: [
      "RSV prevention",
      "Flu vaccination",
      "Food allergies screening",
      "Sleep safety (Back to Sleep)",
      "Screen time limits"
    ]
  }
};

// Feature Categories with Full Content
const FEATURE_CATEGORIES = [
  {
    id: 'symptoms',
    title: 'Symptom Checker',
    subtitle: 'Fever, cough, rashes & more',
    icon: Stethoscope,
    color: 'bg-gradient-to-br from-rose-400 to-pink-500',
    content: {
      title: 'Symptom Checker',
      description: 'Get guidance on common childhood symptoms based on medical guidelines',
      items: [
        { id: 'fever', name: 'Fever', icon: '🌡️', desc: 'Temperature above 100.4°F (38°C)' },
        { id: 'cough', name: 'Cough', icon: '🫁', desc: 'Dry or wet cough, wheezing' },
        { id: 'sore_throat', name: 'Sore Throat', icon: '🤒', desc: 'Pain or difficulty swallowing' },
        { id: 'vomiting', name: 'Vomiting', icon: '🤮', desc: 'Nausea and vomiting' },
        { id: 'diarrhea', name: 'Diarrhea', icon: '💧', desc: 'Loose or watery stools' },
        { id: 'skin_rash', name: 'Skin Rash', icon: '🔴', desc: 'Redness, bumps, or itching' }
      ]
    }
  },
  {
    id: 'medication',
    title: 'Medication Guide',
    subtitle: 'Safe dosages & warnings',
    icon: Pill,
    color: 'bg-gradient-to-br from-violet-400 to-purple-500',
    content: {
      title: 'Medication Guide',
      description: 'Safe medication information for children',
      items: [
        { name: 'Paracetamol/Acetaminophen', desc: 'For fever & pain (10-15mg/kg every 4-6 hrs)', safe: true },
        { name: 'Ibuprofen', desc: 'For fever & inflammation (5-10mg/kg every 6-8 hrs, >6 months)', safe: true },
        { name: 'ORS (Oral Rehydration)', desc: 'For diarrhea & dehydration - give frequently', safe: true },
        { name: 'Zinc Supplements', desc: 'During diarrhea (10-20mg daily for 10-14 days)', safe: true },
        { name: 'Saline Nasal Drops', desc: 'For blocked nose - safe for all ages', safe: true },
        { name: 'Honey', desc: 'For cough (only >1 year old) - 2.5ml before bed', safe: true }
      ],
      warnings: [
        '⚠️ Never give aspirin to children',
        '⚠️ Avoid cough suppressants in children <6 years',
        '⚠️ Always check dosage by weight, not age',
        '⚠️ Consult doctor before any medication'
      ]
    }
  },
  {
    id: 'nutrition',
    title: 'Nutrition Guide',
    subtitle: 'Age-wise feeding tips',
    icon: Utensils,
    color: 'bg-gradient-to-br from-amber-400 to-orange-500',
    content: {
      title: 'Child Nutrition Guide',
      description: 'Age-appropriate feeding recommendations',
      items: [
        { age: '0-6 months', foods: 'Exclusive breastfeeding (or formula)', tip: 'Feed on demand, 8-12 times/day' },
        { age: '6-8 months', foods: 'Mashed foods: rice, dal, vegetables, fruits', tip: 'Start with 2-3 spoons, increase gradually' },
        { age: '8-10 months', foods: 'Soft lumpy foods, finger foods', tip: 'Include protein: egg, fish, chicken' },
        { age: '10-12 months', foods: 'Family foods (mashed/chopped)', tip: '3 meals + 2 snacks daily' },
        { age: '1-2 years', foods: 'All family foods', tip: 'Continue breastfeeding + 3 meals + 2 snacks' },
        { age: '2-5 years', foods: 'Balanced diet with all food groups', tip: 'Include milk, fruits, vegetables daily' }
      ]
    }
  },
  {
    id: 'sleep',
    title: 'Sleep Patterns',
    subtitle: 'Hours & safe sleep tips',
    icon: Moon,
    color: 'bg-gradient-to-br from-indigo-400 to-blue-500',
    content: {
      title: 'Sleep Guidelines',
      description: 'Healthy sleep patterns by age',
      items: [
        { age: 'Newborn (0-3 months)', hours: '14-17 hours', tip: 'Sleep on back, firm mattress, no pillows' },
        { age: 'Infant (4-11 months)', hours: '12-15 hours', tip: 'Establish bedtime routine' },
        { age: 'Toddler (1-2 years)', hours: '11-14 hours', tip: 'Consistent sleep schedule' },
        { age: 'Preschool (3-5 years)', hours: '10-13 hours', tip: 'Limit screen time before bed' },
        { age: 'School age (6-12 years)', hours: '9-12 hours', tip: 'No devices in bedroom' }
      ],
      safeSleep: [
        'Always place baby on BACK to sleep',
        'Use firm, flat sleep surface',
        'Keep soft objects out of crib',
        'Room sharing (not bed sharing) for first 6 months',
        'Maintain comfortable room temperature'
      ]
    }
  },
  {
    id: 'skin',
    title: 'Skin & Hair Care',
    subtitle: 'Rashes, eczema, nails',
    icon: Scissors,
    color: 'bg-gradient-to-br from-teal-400 to-cyan-500',
    content: {
      title: 'Skin & Hair Care',
      description: 'Common skin conditions and care',
      items: [
        { name: 'Diaper Rash', desc: 'Change diapers frequently, use barrier cream', remedy: 'Zinc oxide cream, air dry' },
        { name: 'Cradle Cap', desc: 'Scaly patches on scalp', remedy: 'Gentle oil massage, soft brush' },
        { name: 'Eczema', desc: 'Dry, itchy skin patches', remedy: 'Moisturize frequently, avoid triggers' },
        { name: 'Heat Rash', desc: 'Red bumps in hot weather', remedy: 'Cool environment, loose clothes' },
        { name: 'Baby Acne', desc: 'Small pimples on face', remedy: 'Usually resolves by 3-4 months' },
        { name: 'Dry Skin', desc: 'Flaky, rough patches', remedy: 'Daily moisturizer after bath' }
      ]
    }
  },
  {
    id: 'eyes',
    title: 'Eye & Vision',
    subtitle: 'Screen time & milestones',
    icon: Eye,
    color: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    content: {
      title: 'Eye Health Guide',
      description: 'Vision development and common issues',
      items: [
        { name: 'Sticky Eyes', desc: 'Common in newborns', remedy: 'Clean with cooled boiled water, cotton' },
        { name: 'Blocked Tear Duct', desc: 'Watery, crusty eye', remedy: 'Gentle massage, usually resolves by 1 year' },
        { name: 'Conjunctivitis', desc: 'Pink, itchy, discharge', remedy: 'Doctor visit needed, may need drops' },
        { name: 'Squinting', desc: 'Eyes not aligned', remedy: 'Eye exam if persists after 3 months' },
        { name: 'Screen Time', desc: 'Digital eye strain', remedy: 'No screens <2 years, limit 1hr for 2-5 years' }
      ],
      milestones: [
        'Birth: Sees 8-12 inches, prefers faces',
        '3 months: Follows moving objects',
        '6 months: Color vision develops fully',
        '12 months: Depth perception mature',
        '2 years: First eye exam recommended'
      ]
    }
  },
  {
    id: 'development',
    title: 'Development',
    subtitle: 'Milestones',
    icon: Brain,
    color: 'bg-gradient-to-br from-emerald-400 to-green-500',
    content: {
      title: 'Developmental Milestones',
      description: 'Track your child\'s growth and development',
      items: [
        { age: '2 months', skills: 'Social smile, holds head up, coos' },
        { age: '4 months', skills: 'Laughs, reaches for toys, rolls over' },
        { age: '6 months', skills: 'Sits with support, babbles, responds to name' },
        { age: '9 months', skills: 'Sits alone, crawls, says mama/dada' },
        { age: '12 months', skills: 'Stands, first words, waves bye-bye' },
        { age: '18 months', skills: 'Walks well, 10-15 words, points to show' },
        { age: '2 years', skills: 'Runs, 2-word phrases, follows instructions' },
        { age: '3 years', skills: 'Climbs, sentences, plays with others' }
      ],
      redFlags: [
        'No social smile by 2 months',
        'No babbling by 9 months',
        'No pointing by 12 months',
        'No words by 16 months',
        'Loss of previously acquired skills'
      ]
    }
  },
  {
    id: 'growth',
    title: 'Growth Tracker',
    subtitle: 'Height & Weight',
    icon: TrendingUp,
    color: 'bg-gradient-to-br from-pink-400 to-rose-500',
    requiresChild: true,
    content: {
      title: 'Growth Tracking',
      description: 'Monitor your child\'s growth with WHO standards'
    }
  }
];

const Alyne = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('india');

  const [newChild, setNewChild] = useState({
    name: '', date_of_birth: '', gender: 'male', blood_group: '', region: 'india'
  });

  useEffect(() => {
    if (user) fetchChildren();
    else setLoading(false);
  }, [user]);

  const fetchChildren = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/children/${user.id}`);
      const data = await response.json();
      setChildren(data.children || []);
      if (data.children?.length > 0) {
        setSelectedChild(data.children[0]);
        setSelectedRegion(data.children[0].region);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleAddChild = async () => {
    if (!newChild.name || !newChild.date_of_birth) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      const response = await fetch(`${API}/api/alyne/children?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...newChild, region: selectedRegion})
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${newChild.name}'s profile created!`);
        setShowAddChild(false);
        setNewChild({ name: '', date_of_birth: '', gender: 'male', blood_group: '', region: selectedRegion });
        fetchChildren();
      }
    } catch (error) { toast.error('Failed to add child'); }
  };

  const regionData = REGION_CONTENT[selectedRegion];

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => activeCategory ? setActiveCategory(null) : navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={ALYNE_LOGO} alt="ALYNE" className="h-10 w-auto" />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Region Toggle */}
              <div className="flex bg-gray-100 rounded-full p-1">
                <button 
                  onClick={() => setSelectedRegion('india')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${selectedRegion === 'india' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}
                >
                  🇮🇳 India
                </button>
                <button 
                  onClick={() => setSelectedRegion('usa')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${selectedRegion === 'usa' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}
                >
                  🇺🇸 USA
                </button>
              </div>

              {user && children.length > 0 && (
                <Select value={selectedChild?.id || ''} onValueChange={(id) => {
                  const child = children.find(c => c.id === id);
                  setSelectedChild(child);
                  if (child) setSelectedRegion(child.region);
                }}>
                  <SelectTrigger className="w-[140px] bg-teal-50 border-teal-200 rounded-full text-sm">
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map(child => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.gender === 'male' ? '👦' : '👧'} {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {user && (
                <Button onClick={() => setShowAddChild(true)} size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-full">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          </div>
        ) : activeCategory ? (
          // Category Detail View
          <CategoryDetail 
            category={activeCategory} 
            region={selectedRegion} 
            child={selectedChild}
            onBack={() => setActiveCategory(null)}
            user={user}
          />
        ) : (
          // Main Home View
          <div className="space-y-6">
            {/* Welcome + Region Info */}
            <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">
                    {selectedChild ? `Managing ${selectedChild.name}'s health` : 'Kids Health & Care'}
                  </p>
                  <h2 className="text-xl font-bold mt-1">{regionData.guidelines}</h2>
                  <p className="text-xs text-white/70 mt-1">
                    Emergency: {regionData.emergencyLabel} - <span className="font-bold">{regionData.emergency}</span>
                  </p>
                </div>
                {selectedChild && (
                  <div className="text-right">
                    <span className="text-3xl">{selectedChild.gender === 'male' ? '👦' : '👧'}</span>
                    <p className="text-sm text-white/80">{selectedChild.age_display}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Categories - All Clickable */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-4">What would you like help with?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FEATURE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (cat.requiresChild && !selectedChild) {
                        toast.error('Please add a child profile first');
                        setShowAddChild(true);
                      } else {
                        setActiveCategory(cat);
                      }
                    }}
                    className={`${cat.color} text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg`}
                  >
                    <cat.icon className="w-6 h-6 mb-2" />
                    <p className="font-bold text-sm">{cat.title}</p>
                    <p className="text-xs text-white/80">{cat.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction icon={<MessageCircle className="w-5 h-5 text-amber-600" />} title="AI Chat" subtitle="Ask ALYNE" bgColor="bg-amber-50" onClick={() => setActiveCategory({id: 'chat', title: 'AI Chat'})} />
              <QuickAction icon={<ShoppingCart className="w-5 h-5 text-teal-600" />} title="Kids Shop" subtitle="Essentials" bgColor="bg-teal-50" onClick={() => setActiveCategory({id: 'shop', title: 'Kids Shop'})} />
              <QuickAction icon={<Syringe className="w-5 h-5 text-blue-600" />} title="Vaccines" subtitle={selectedRegion === 'india' ? 'IAP Schedule' : 'CDC Schedule'} bgColor="bg-blue-50" onClick={() => {
                if (!selectedChild) { toast.error('Add child first'); setShowAddChild(true); }
                else setActiveCategory({id: 'vaccines', title: 'Vaccinations'});
              }} />
              <QuickAction icon={<Phone className="w-5 h-5 text-red-600" />} title="Emergency" subtitle={regionData.emergency} bgColor="bg-red-50" onClick={() => window.open(`tel:${regionData.emergency}`)} />
            </div>

            {/* Region-Specific Tips */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  {selectedRegion === 'india' ? '🇮🇳' : '🇺🇸'} Health Tips for {selectedRegion === 'india' ? 'India' : 'USA'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {regionData.healthTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Personalized Section */}
            {!selectedChild && user && (
              <div className="p-5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 text-center">
                <Baby className="w-12 h-12 text-teal-500 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800">Personalize Your Experience</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Add your child's profile for vaccination tracking, growth monitoring, and personalized recommendations</p>
                <Button onClick={() => setShowAddChild(true)} className="bg-teal-600 hover:bg-teal-700 rounded-full">
                  <Plus className="w-4 h-4 mr-2" />Add Child Profile
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Child Dialog */}
      <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-teal-600" />
              Add Child Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSelectedRegion('india')} className={`p-4 rounded-xl border-2 ${selectedRegion === 'india' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                <span className="text-2xl">🇮🇳</span>
                <p className="font-medium">India</p>
                <p className="text-xs text-gray-500">IAP Schedule</p>
              </button>
              <button onClick={() => setSelectedRegion('usa')} className={`p-4 rounded-xl border-2 ${selectedRegion === 'usa' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                <span className="text-2xl">🇺🇸</span>
                <p className="font-medium">USA</p>
                <p className="text-xs text-gray-500">CDC Schedule</p>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Child's Name *</Label><Input value={newChild.name} onChange={(e) => setNewChild({...newChild, name: e.target.value})} /></div>
              <div><Label>Date of Birth *</Label><Input type="date" value={newChild.date_of_birth} onChange={(e) => setNewChild({...newChild, date_of_birth: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Gender</Label>
                <Select value={newChild.gender} onValueChange={(v) => setNewChild({...newChild, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">👦 Boy</SelectItem><SelectItem value="female">👧 Girl</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Blood Group</Label>
                <Select value={newChild.blood_group} onValueChange={(v) => setNewChild({...newChild, blood_group: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChild(false)}>Cancel</Button>
            <Button onClick={handleAddChild} className="bg-teal-600">Add Child</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

// Quick Action Component
const QuickAction = ({ icon, title, subtitle, bgColor, onClick }) => (
  <button onClick={onClick} className={`${bgColor} border p-4 rounded-xl text-left hover:shadow-md transition-all`}>
    {icon}
    <p className="font-medium text-sm text-gray-800 mt-2">{title}</p>
    <p className="text-xs text-gray-500">{subtitle}</p>
  </button>
);

// Category Detail View
const CategoryDetail = ({ category, region, child, onBack, user }) => {
  // Special handling for different category types
  if (category.id === 'chat') return <AIChatSection child={child} user={user} onBack={onBack} />;
  if (category.id === 'shop') return <KidsShopSection user={user} onBack={onBack} />;
  if (category.id === 'vaccines') return <VaccinationsSection child={child} region={region} onBack={onBack} />;
  if (category.id === 'growth') return <GrowthSection child={child} onBack={onBack} />;
  if (category.id === 'symptoms') return <SymptomsSection child={child} region={region} onBack={onBack} />;

  const content = category.content;
  if (!content) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h2 className="text-xl font-bold">{content.title}</h2>
          <p className="text-sm text-gray-500">{content.description}</p>
        </div>
      </div>

      {/* Medication Guide */}
      {category.id === 'medication' && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {content.items.map((item, i) => (
              <Card key={i} className="border-l-4 border-green-500">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Pill className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <h4 className="font-bold text-red-700 mb-2">⚠️ Important Warnings</h4>
              <ul className="space-y-1">
                {content.warnings.map((w, i) => <li key={i} className="text-sm text-red-600">{w}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Nutrition Guide */}
      {category.id === 'nutrition' && (
        <div className="space-y-3">
          {content.items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Badge className="bg-amber-500">{item.age}</Badge>
                  <div>
                    <p className="font-medium">{item.foods}</p>
                    <p className="text-sm text-gray-500 mt-1">💡 {item.tip}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sleep Guide */}
      {category.id === 'sleep' && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {content.items.map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Moon className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.age}</p>
                    <p className="text-lg font-bold text-indigo-600">{item.hours}</p>
                    <p className="text-xs text-gray-500">{item.tip}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-bold text-blue-700 mb-2">🛏️ Safe Sleep Guidelines</h4>
              <ul className="space-y-1">
                {content.safeSleep.map((s, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />{s}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Skin & Hair */}
      {category.id === 'skin' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {content.items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h4 className="font-semibold text-teal-700">{item.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                <p className="text-sm text-green-600 mt-2">✅ {item.remedy}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Eyes & Vision */}
      {category.id === 'eyes' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {content.items.map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-blue-700">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                  <p className="text-sm text-green-600 mt-2">✅ {item.remedy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-indigo-50">
            <CardContent className="p-4">
              <h4 className="font-bold text-indigo-700 mb-2">👁️ Vision Milestones</h4>
              <ul className="space-y-1">
                {content.milestones.map((m, i) => <li key={i} className="text-sm">{m}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Development Milestones */}
      {category.id === 'development' && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {content.items.map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Badge className="bg-emerald-500 text-sm">{item.age}</Badge>
                  <p className="text-sm">{item.skills}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <h4 className="font-bold text-red-700 mb-2">🚩 Red Flags - Consult Doctor</h4>
              <ul className="space-y-1">
                {content.redFlags.map((f, i) => <li key={i} className="text-sm text-red-600">• {f}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Symptoms Section (with API)
const SymptomsSection = ({ child, region, onBack }) => {
  const [symptoms, setSymptoms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => { fetchSymptoms(); }, []);

  const fetchSymptoms = async () => {
    try { const res = await fetch(`${API}/api/alyne/symptoms`); const data = await res.json(); setSymptoms(data.symptoms || []); } catch (e) {}
  };

  const fetchDetails = async (id) => {
    try { const res = await fetch(`${API}/api/alyne/symptoms/${id}?region=${region}`); const data = await res.json(); setDetails(data); setSelected(id); } catch (e) {}
  };

  const colors = { sore_throat: 'from-orange-400 to-orange-500', cough: 'from-blue-400 to-blue-500', skin_rash: 'from-red-400 to-red-500', fever: 'from-amber-400 to-yellow-500', vomiting: 'from-purple-400 to-purple-500', diarrhea: 'from-teal-400 to-teal-500' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div><h2 className="text-xl font-bold">Symptom Checker</h2><p className="text-sm text-gray-500">{region === 'india' ? 'IAP' : 'CDC'} Guidelines</p></div>
      </div>

      <div className="p-3 bg-amber-50 rounded-xl text-center">
        <p className="text-xs text-amber-700">⚠️ General guidance only. Always consult your pediatrician.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {symptoms.map((s) => (
          <button key={s.id} onClick={() => fetchDetails(s.id)} className={`bg-gradient-to-br ${colors[s.id] || 'from-gray-400 to-gray-500'} text-white p-4 rounded-2xl text-left hover:scale-105 transition-all shadow-lg ${selected === s.id ? 'ring-4 ring-white ring-offset-2' : ''}`}>
            <span className="text-2xl block mb-2">{s.icon}</span>
            <p className="font-bold text-sm">{s.name}</p>
          </button>
        ))}
      </div>

      {details && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2"><span className="text-2xl">{details.symptom.icon}</span>{details.symptom.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">🏠 Home Care</h4>
              <ul className="space-y-1">{details.symptom.home_care.map((t, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />{t}</li>)}</ul>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <h4 className="font-semibold text-sm text-red-700 mb-2">⚠️ See Doctor If:</h4>
              <ul className="space-y-1">{details.symptom.when_to_see_doctor.map((t, i) => <li key={i} className="text-sm text-red-600">• {t}</li>)}</ul>
            </div>
            <div className="p-4 bg-teal-50 rounded-xl">
              <h4 className="font-semibold text-sm text-teal-700 mb-1">{region === 'india' ? '🇮🇳 IAP' : '🇺🇸 CDC'} Guidelines</h4>
              <p className="text-sm">{details.primary_guidelines}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// AI Chat Section
const AIChatSection = ({ child, user, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`chat_${Date.now()}`);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const msg = input.trim(); setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/chat?user_id=${user?.id || 'guest'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, child_id: child?.id, session_id: sessionId }) });
      const data = await res.json();
      if (data.success) setMessages(p => [...p, { role: 'assistant', content: data.response }]);
    } catch (e) { toast.error('Chat unavailable'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div><h2 className="text-xl font-bold">Chat with ALYNE</h2><p className="text-sm text-gray-500">24/7 AI Health Assistant</p></div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <MessageCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-gray-600">Hi! Ask me anything about child health!</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {["Signs of teething?", "Fever management?", "When to start solids?"].map((q, i) => <button key={i} onClick={() => setInput(q)} className="text-xs px-3 py-2 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200">{q}</button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border rounded-bl-none'}`}><p className="whitespace-pre-wrap">{m.content}</p></div></div>)}
          {loading && <div className="flex justify-start"><div className="bg-white border p-3 rounded-2xl"><div className="flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div></div></div></div>}
          <div ref={endRef} />
        </div>
        <div className="p-4 border-t bg-white flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about child health..." onKeyPress={(e) => e.key === 'Enter' && send()} />
          <Button onClick={send} disabled={loading} className="bg-teal-600"><Send className="w-4 h-4" /></Button>
        </div>
      </Card>
    </div>
  );
};

// Kids Shop Section
const KidsShopSection = ({ user, onBack }) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCategories(); fetchProducts(); }, []);
  const fetchCategories = async () => { try { const res = await fetch(`${API}/api/alyne/shop/categories`); const data = await res.json(); setCategories(data.categories || []); } catch (e) {} };
  const fetchProducts = async (cat = null) => { setLoading(true); try { const url = cat ? `${API}/api/alyne/shop/products?category=${cat}` : `${API}/api/alyne/shop/products`; const res = await fetch(url); const data = await res.json(); setProducts(data.products || []); } catch (e) {} finally { setLoading(false); } };
  const addToCart = (p) => { setCart(prev => { const ex = prev.find(x => x.id === p.id); if (ex) return prev.map(x => x.id === p.id ? {...x, quantity: x.quantity + 1} : x); return [...prev, {...p, quantity: 1}]; }); toast.success('Added!'); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div><h2 className="text-xl font-bold">Kids Shop</h2><p className="text-sm text-gray-500">by Orange Pharmacy</p></div>
        </div>
        <Badge className="bg-teal-600">{cart.reduce((s, i) => s + i.quantity, 0)} items</Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => { setSelectedCat(null); fetchProducts(); }} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${!selectedCat ? 'bg-teal-600 text-white' : 'bg-white border'}`}>All</button>
        {categories.map(c => <button key={c.id} onClick={() => { setSelectedCat(c.id); fetchProducts(c.id); }} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${selectedCat === c.id ? 'bg-teal-600 text-white' : 'bg-white border'}`}>{c.icon} {c.name}</button>)}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? [...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-xl h-40 animate-pulse"></div>) : products.map(p => (
          <Card key={p.id} className="border shadow-sm hover:shadow-md">
            <CardContent className="p-3">
              <div className="w-full h-16 bg-gray-100 rounded-lg mb-2 flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
              {p.bestseller && <Badge className="bg-rose-500 text-xs mb-1">Best</Badge>}
              <h4 className="font-medium text-xs line-clamp-2">{p.name}</h4>
              <p className="text-xs text-gray-400">{p.brand}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="font-bold text-teal-600">₹{p.price}</p>
                <Button size="sm" onClick={() => addToCart(p)} className="bg-teal-600 h-7 w-7 p-0"><Plus className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Vaccinations Section
const VaccinationsSection = ({ child, region, onBack }) => {
  const [vaccinations, setVaccinations] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (child) fetchVaccinations(); }, [child?.id]);
  const fetchVaccinations = async () => { try { const res = await fetch(`${API}/api/alyne/vaccinations/${child.id}`); const data = await res.json(); setVaccinations(data.vaccinations || []); setStats(data.stats || {}); } catch (e) {} finally { setLoading(false); } };
  const updateVax = async (id, status) => { try { await fetch(`${API}/api/alyne/vaccinations/${id}?status=${status}&administered_date=${new Date().toISOString().split('T')[0]}`, { method: 'PUT' }); toast.success('Updated!'); fetchVaccinations(); } catch (e) {} };
  const filtered = filter === 'all' ? vaccinations : vaccinations.filter(v => v.status === filter);
  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div><h2 className="text-xl font-bold">Vaccinations</h2><p className="text-sm text-gray-500">{region === 'india' ? 'IAP Schedule' : 'CDC Schedule'}</p></div>
      </div>

      <Card><CardContent className="p-4"><div className="flex justify-between mb-2"><span>Progress</span><span className="font-bold text-teal-600">{progress}%</span></div><Progress value={progress} className="h-2" /></CardContent></Card>

      <div className="flex gap-2 flex-wrap">
        {['all', 'due', 'overdue', 'done'].map(f => <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className={filter === f ? 'bg-teal-600' : ''}>{f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${stats[f] || 0})`}</Button>)}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {loading ? <p className="text-center py-8">Loading...</p> : filtered.length === 0 ? <p className="text-center py-8 text-gray-500">No vaccinations</p> : filtered.slice(0, 20).map((v) => (
          <Card key={v.id} className={`border-l-4 ${v.status === 'overdue' ? 'border-red-500' : v.status === 'due' ? 'border-yellow-500' : 'border-green-500'}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <Syringe className={`w-5 h-5 ${v.status === 'done' ? 'text-green-500' : v.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'}`} />
              <div className="flex-1"><p className="font-medium text-sm">{v.vaccine_name} <Badge variant="outline" className="ml-1 text-xs">{v.dose}</Badge></p><p className="text-xs text-gray-500">{v.scheduled_date}</p></div>
              {v.status !== 'done' && <Button size="sm" onClick={() => updateVax(v.id, 'done')} className="bg-green-500 text-xs">Done</Button>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Growth Section
const GrowthSection = ({ child, onBack }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (child) fetchGrowth(); }, [child?.id]);
  const fetchGrowth = async () => { try { const res = await fetch(`${API}/api/alyne/growth/${child.id}`); const data = await res.json(); setRecords(data.records || []); } catch (e) {} finally { setLoading(false); } };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div><h2 className="text-xl font-bold">Growth Tracker</h2><p className="text-sm text-gray-500">WHO Percentiles</p></div>
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-teal-50"><CardContent className="p-4 text-center"><Ruler className="w-6 h-6 text-teal-600 mx-auto" /><p className="text-xl font-bold text-teal-700">{records[0].height_cm || '--'} cm</p><p className="text-xs text-gray-500">Height</p></CardContent></Card>
          <Card className="bg-amber-50"><CardContent className="p-4 text-center"><Scale className="w-6 h-6 text-amber-600 mx-auto" /><p className="text-xl font-bold text-amber-700">{records[0].weight_kg || '--'} kg</p><p className="text-xs text-gray-500">Weight</p></CardContent></Card>
          <Card className="bg-pink-50"><CardContent className="p-4 text-center"><Baby className="w-6 h-6 text-pink-600 mx-auto" /><p className="text-xl font-bold text-pink-700">{child.age_display}</p><p className="text-xs text-gray-500">Age</p></CardContent></Card>
        </div>
      )}

      <Card><CardContent className="p-4"><h4 className="font-semibold mb-3">Growth History</h4>
        {loading ? <p>Loading...</p> : records.length === 0 ? <p className="text-gray-500 text-center py-4">No records yet</p> : (
          <div className="space-y-2">{records.map((r, i) => <div key={i} className="flex items-center gap-4 p-2 bg-gray-50 rounded-lg text-sm"><span className="text-gray-500">{r.date}</span><span>{r.height_cm}cm</span><span>{r.weight_kg}kg</span></div>)}</div>
        )}
      </CardContent></Card>
    </div>
  );
};

export default Alyne;
