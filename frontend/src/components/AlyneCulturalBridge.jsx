import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, Search, Pill, Apple, FileText, Share2, 
  Heart, Globe, Baby, Clipboard, Check, Copy, Languages
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export const CulturalBridgeSection = ({ child, onBack }) => {
  const [tab, setTab] = useState('medicines');
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            🌉 Cultural Health Bridge
          </h2>
          <p className="text-sm text-gray-500">Connecting US & Indian healthcare</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="medicines" className="text-xs"><Pill className="w-3 h-3 mr-1" /> Medicines</TabsTrigger>
          <TabsTrigger value="foods" className="text-xs"><Apple className="w-3 h-3 mr-1" /> Foods</TabsTrigger>
          <TabsTrigger value="forms" className="text-xs"><FileText className="w-3 h-3 mr-1" /> Forms</TabsTrigger>
          <TabsTrigger value="share" className="text-xs"><Share2 className="w-3 h-3 mr-1" /> Share</TabsTrigger>
        </TabsList>

        <TabsContent value="medicines"><MedicineTranslator /></TabsContent>
        <TabsContent value="foods"><FoodNutritionGuide /></TabsContent>
        <TabsContent value="forms"><SchoolFormsGenerator child={child} /></TabsContent>
        <TabsContent value="share"><GrandparentShare child={child} /></TabsContent>
      </Tabs>
    </div>
  );
};

// ============ MEDICINE TRANSLATOR ============
const MedicineTranslator = () => {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('indian_to_us');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchMedicines(); }, []);

  const fetchMedicines = async () => {
    try {
      const res = await fetch(`${API}/api/alyne/cultural-bridge/medicines`);
      const data = await res.json();
      if (data.success) setMedicines(data.medicines);
    } catch (e) { console.error(e); }
  };

  const searchMedicine = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/cultural-bridge/medicines/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine_name: search, direction })
      });
      const data = await res.json();
      setResults(data);
    } catch (e) { toast.error("Search failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold">Medicine Translator</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Find US equivalents for Indian medicines or vice versa</p>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={direction === 'indian_to_us' ? 'default' : 'outline'}
                onClick={() => setDirection('indian_to_us')}
                className={direction === 'indian_to_us' ? 'bg-orange-500' : ''}
              >
                🇮🇳 → 🇺🇸
              </Button>
              <Button
                size="sm"
                variant={direction === 'us_to_indian' ? 'default' : 'outline'}
                onClick={() => setDirection('us_to_indian')}
                className={direction === 'us_to_indian' ? 'bg-blue-500' : ''}
              >
                🇺🇸 → 🇮🇳
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder={direction === 'indian_to_us' ? "Enter Indian medicine name (e.g., Crocin)" : "Enter US medicine name (e.g., Tylenol)"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchMedicine()}
                data-testid="medicine-search-input"
              />
              <Button onClick={searchMedicine} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {results && (
        <div className="space-y-3">
          {results.matches?.length > 0 ? (
            results.matches.map((med, i) => (
              <Card key={i} className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">🇮🇳 India</p>
                      <p className="font-bold text-lg">{med.indian_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">🇺🇸 USA</p>
                      <p className="font-bold text-lg">{med.us_name}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-sm"><strong>Generic:</strong> {med.generic}</p>
                    <p className="text-sm"><strong>Use:</strong> {med.use}</p>
                    <p className="text-sm"><strong>Child Dosage:</strong> {med.child_dosage}</p>
                    {med.notes && <p className="text-xs text-gray-600 mt-2 italic">{med.notes}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : results.ai_suggestion ? (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <Badge className="mb-2 bg-blue-500">AI Suggestion</Badge>
                <p className="text-sm whitespace-pre-wrap">{results.ai_suggestion}</p>
                <p className="text-xs text-gray-500 mt-2">{results.note}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-50">
              <CardContent className="p-4 text-center text-gray-500">
                No matches found for "{search}"
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Common Medicines Quick Reference */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-3">Quick Reference</h4>
        <div className="grid grid-cols-2 gap-2">
          {medicines.slice(0, 6).map((med, i) => (
            <button
              key={i}
              onClick={() => { setSearch(med.indian_name); setDirection('indian_to_us'); }}
              className="text-left p-2 rounded-lg bg-white border hover:bg-orange-50 transition-colors"
            >
              <p className="font-medium text-sm">{med.indian_name}</p>
              <p className="text-xs text-gray-500">→ {med.us_name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ INDIAN FOOD NUTRITION GUIDE ============
const FoodNutritionGuide = () => {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);

  useEffect(() => { fetchFoods(); }, []);

  const fetchFoods = async () => {
    try {
      const res = await fetch(`${API}/api/alyne/cultural-bridge/foods`);
      const data = await res.json();
      if (data.success) setFoods(data.foods);
    } catch (e) { console.error(e); }
  };

  const filteredFoods = search 
    ? foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.hindi?.includes(search))
    : foods;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Apple className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Indian Foods Nutrition Guide</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Indian foods analyzed with US pediatric guidelines (AAP)</p>
          
          <Input
            placeholder="Search foods (English or Hindi)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white"
            data-testid="food-search-input"
          />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filteredFoods.map((food, i) => (
          <Card 
            key={i} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedFood(food)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold">{food.name}</h4>
                  {food.hindi && <p className="text-sm text-gray-500">{food.hindi}</p>}
                  <p className="text-xs text-gray-600 mt-1">{food.description}</p>
                </div>
                <div className="text-right">
                  {food.us_nutrition.aap_approved && (
                    <Badge className="bg-green-500 text-xs">AAP ✓</Badge>
                  )}
                  <p className="text-xs text-gray-500 mt-1">From {food.us_nutrition.introduction_age}</p>
                </div>
              </div>
              
              <div className="flex gap-4 mt-3 text-xs">
                <span className="bg-amber-100 px-2 py-1 rounded">{food.us_nutrition.calories}</span>
                <span className="bg-blue-100 px-2 py-1 rounded">Protein: {food.us_nutrition.protein}</span>
                <span className="bg-purple-100 px-2 py-1 rounded">Carbs: {food.us_nutrition.carbs}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Food Detail Dialog */}
      <Dialog open={!!selectedFood} onOpenChange={() => setSelectedFood(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedFood && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">🥗</span>
                  {selectedFood.name}
                  {selectedFood.hindi && <span className="text-gray-500">({selectedFood.hindi})</span>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-600">{selectedFood.description}</p>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">US Nutrition Info (AAP Guidelines)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Calories:</strong> {selectedFood.us_nutrition.calories}</div>
                    <div><strong>Protein:</strong> {selectedFood.us_nutrition.protein}</div>
                    <div><strong>Carbs:</strong> {selectedFood.us_nutrition.carbs}</div>
                    {selectedFood.us_nutrition.calcium && <div><strong>Calcium:</strong> {selectedFood.us_nutrition.calcium}</div>}
                    {selectedFood.us_nutrition.iron && <div><strong>Iron:</strong> {selectedFood.us_nutrition.iron}</div>}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Benefits</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedFood.us_nutrition.benefits?.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
                
                {selectedFood.allergens?.length > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-amber-800">⚠️ Allergens</h4>
                    <p className="text-sm">{selectedFood.allergens.join(', ')}</p>
                  </div>
                )}
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-800">👶 Introduction Age</h4>
                  <p className="text-sm">{selectedFood.us_nutrition.introduction_age}</p>
                </div>
                
                {selectedFood.preparation_tip && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-purple-800">💡 Preparation Tip</h4>
                    <p className="text-sm">{selectedFood.preparation_tip}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ SCHOOL FORMS GENERATOR ============
const SchoolFormsGenerator = ({ child }) => {
  const [forms, setForms] = useState(null);
  const [selectedForms, setSelectedForms] = useState([]);
  const [generatedForms, setGeneratedForms] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchFormTemplates(); }, []);

  const fetchFormTemplates = async () => {
    try {
      const res = await fetch(`${API}/api/alyne/cultural-bridge/school-forms`);
      const data = await res.json();
      if (data.success) setForms(data.forms);
    } catch (e) { console.error(e); }
  };

  const toggleForm = (formId) => {
    setSelectedForms(prev => 
      prev.includes(formId) ? prev.filter(f => f !== formId) : [...prev, formId]
    );
  };

  const generateForms = async () => {
    if (!child?.id || selectedForms.length === 0) {
      toast.error("Please select forms to generate");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/cultural-bridge/school-forms/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          child_name: child.name,
          form_types: selectedForms,
          child_data: {}
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedForms(data.forms);
        toast.success("Forms generated!");
      }
    } catch (e) { toast.error("Generation failed"); }
    finally { setLoading(false); }
  };

  if (!child) {
    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-amber-800">Add a child profile to generate school forms</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">School Health Forms</h3>
          </div>
          <p className="text-sm text-gray-600">Generate pre-filled US school health forms for {child.name}</p>
        </CardContent>
      </Card>

      {!generatedForms ? (
        <>
          <div className="space-y-2">
            {forms && Object.entries(forms).map(([id, form]) => (
              <button
                key={id}
                onClick={() => toggleForm(id)}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  selectedForms.includes(id) 
                    ? 'bg-blue-100 border-blue-400' 
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{form.title}</p>
                    <p className="text-xs text-gray-500">{form.fields?.slice(0, 3).join(', ')}...</p>
                  </div>
                  {selectedForms.includes(id) && <Check className="w-5 h-5 text-blue-600" />}
                </div>
              </button>
            ))}
          </div>
          
          <Button 
            onClick={generateForms} 
            disabled={loading || selectedForms.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Generating...' : `Generate ${selectedForms.length} Form(s)`}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setGeneratedForms(null)} className="mb-4">
            ← Back to Form Selection
          </Button>
          
          {Object.entries(generatedForms).map(([formId, form]) => (
            <Card key={formId} className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {form.title}
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(form, null, 2));
                    toast.success("Copied to clipboard");
                  }}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                  {Object.entries(form).filter(([k]) => k !== 'title' && k !== 'notes').map(([key, value]) => (
                    <div key={key}>
                      <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong>{' '}
                      {Array.isArray(value) 
                        ? value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ') 
                        : String(value)}
                    </div>
                  ))}
                  {form.notes && <p className="text-amber-600 italic mt-2">{form.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ GRANDPARENT HEALTH SHARE ============
const GrandparentShare = ({ child }) => {
  const [language, setLanguage] = useState('hindi');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const languages = [
    { id: 'hindi', name: 'Hindi (हिंदी)', flag: '🇮🇳' },
    { id: 'tamil', name: 'Tamil (தமிழ்)', flag: '🇮🇳' },
    { id: 'telugu', name: 'Telugu (తెలుగు)', flag: '🇮🇳' },
    { id: 'gujarati', name: 'Gujarati (ગુજરાતી)', flag: '🇮🇳' },
    { id: 'bengali', name: 'Bengali (বাংলা)', flag: '🇮🇳' },
    { id: 'english', name: 'English', flag: '🇺🇸' },
  ];

  const generateMessage = async () => {
    if (!child?.id || !recipientName || !senderName) {
      toast.error("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/cultural-bridge/share-with-grandparents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          recipient_name: recipientName,
          recipient_language: language,
          include_records: ['growth', 'vaccinations'],
          sender_name: senderName
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        toast.success("Message generated!");
      }
    } catch (e) { toast.error("Failed to generate message"); }
    finally { setLoading(false); }
  };

  if (!child) {
    return (
      <Card className="bg-pink-50 border-pink-200">
        <CardContent className="p-6 text-center">
          <Heart className="w-12 h-12 text-pink-500 mx-auto mb-3" />
          <p className="text-pink-800">Add a child profile to share health updates</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold">Share with Grandparents</h3>
          </div>
          <p className="text-sm text-gray-600">
            Send {child.name}'s health updates to family in India in their language
          </p>
        </CardContent>
      </Card>

      {!message ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Your Name</Label>
              <Input
                placeholder="e.g., Priya"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Grandparent's Name</Label>
              <Input
                placeholder="e.g., Nani, Dadi, Grandma"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={generateMessage} 
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              {loading ? 'Creating message...' : '💌 Generate Health Update'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Message for {recipientName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-lg border">
              <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{message}</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(message);
                  toast.success("Copied to clipboard!");
                }}
              >
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={() => {
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                }}
              >
                📱 WhatsApp
              </Button>
            </div>
            
            <Button variant="ghost" onClick={() => setMessage(null)} className="w-full">
              Create New Message
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CulturalBridgeSection;
