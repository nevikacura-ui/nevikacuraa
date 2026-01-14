import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  ArrowLeft, Brain, Heart, Activity, AlertTriangle, 
  Shield, Sparkles, ChevronRight, Info, CheckCircle, 
  TrendingUp, FileText, RefreshCw, Plus, Home, Baby
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export const DigitalHealthTwinSection = ({ child, onBack }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // dashboard, profile, assess
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  useEffect(() => { if (child?.id) fetchDashboard(); }, [child?.id]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/health-twin/dashboard/${child.id}`);
      const data = await res.json();
      if (data.success) setDashboard(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!child) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-xl font-bold">🧬 Digital Health Twin</h2>
        </div>
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-8 text-center">
            <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-purple-700">Add a Child First</h3>
            <p className="text-sm text-gray-600 mt-2">Create a child profile to use Digital Health Twin</p>
            <Button onClick={onBack} className="mt-4 bg-purple-500 hover:bg-purple-600">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'profile') return <HealthTwinProfile child={child} onBack={() => setView('dashboard')} onSaved={fetchDashboard} />;
  if (view === 'assess') return <RiskAssessment child={child} onBack={() => setView('dashboard')} onComplete={fetchDashboard} />;
  if (selectedAssessment) return <AssessmentDetail assessment={selectedAssessment} onBack={() => setSelectedAssessment(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            🧬 Digital Health Twin
          </h2>
          <p className="text-sm text-gray-500">AI-powered health insights for {child.name}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading Health Twin data...</div>
      ) : (
        <>
          {/* Health Score Card */}
          <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-0 shadow-xl overflow-hidden">
            <CardContent className="p-5 relative">
              <div className="absolute top-0 right-0 opacity-10">
                <Brain className="w-40 h-40" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <span className="text-4xl font-bold">{dashboard?.health_score || '--'}</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{child.name}'s Health Score</p>
                    <Badge className={`mt-1 ${
                      dashboard?.health_score >= 80 ? 'bg-green-400' :
                      dashboard?.health_score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                    } text-white`}>
                      {dashboard?.health_status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
                
                <Progress 
                  value={dashboard?.health_score || 0} 
                  className="h-3 bg-white/20" 
                />
                
                <p className="text-sm text-white/80 mt-2">
                  Based on profile, assessments, and health data
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Profile Status */}
          {!dashboard?.has_profile && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Complete Health Twin Profile</p>
                    <p className="text-xs text-amber-600">Add family history for better predictions</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setView('profile')} className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setView('assess')}
              className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-4 rounded-2xl text-left shadow-lg hover:shadow-xl transition-all"
              data-testid="run-assessment-btn"
            >
              <Activity className="w-8 h-8 mb-2" />
              <p className="font-bold">Run Assessment</p>
              <p className="text-xs text-white/80">AI risk analysis</p>
            </button>
            
            <button
              onClick={() => setView('profile')}
              className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-2xl text-left shadow-lg hover:shadow-xl transition-all"
            >
              <FileText className="w-8 h-8 mb-2" />
              <p className="font-bold">Health Profile</p>
              <p className="text-xs text-white/80">Family & environment</p>
            </button>
          </div>

          {/* Risk Categories Overview */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Risk Categories</h3>
            <div className="space-y-2">
              {['asthma', 'allergies', 'growth', 'comprehensive'].map(type => {
                const assessment = dashboard?.latest_assessments?.[type];
                const riskLevel = assessment?.result?.risk_level;
                const riskColors = {
                  low: 'bg-green-100 border-green-300 text-green-700',
                  moderate: 'bg-yellow-100 border-yellow-300 text-yellow-700',
                  elevated: 'bg-orange-100 border-orange-300 text-orange-700',
                  high: 'bg-red-100 border-red-300 text-red-700'
                };
                const icons = {
                  asthma: '🫁',
                  allergies: '🤧',
                  growth: '📏',
                  comprehensive: '🔬'
                };
                
                return (
                  <button
                    key={type}
                    onClick={() => assessment && setSelectedAssessment(assessment)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                      assessment ? riskColors[riskLevel] || 'bg-gray-50' : 'bg-gray-50 border-gray-200'
                    } ${assessment ? 'cursor-pointer hover:shadow-md' : 'opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icons[type]}</span>
                      <div>
                        <p className="font-medium capitalize">{type}</p>
                        {assessment ? (
                          <p className="text-xs">Risk: {riskLevel} • Score: {assessment.result.risk_score}/100</p>
                        ) : (
                          <p className="text-xs text-gray-500">Not assessed yet</p>
                        )}
                      </div>
                    </div>
                    {assessment ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <Badge variant="outline" className="text-xs">Run</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {dashboard?.recommendations?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" /> 
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {dashboard.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ============ HEALTH TWIN PROFILE SETUP ============
const HealthTwinProfile = ({ child, onBack, onSaved }) => {
  const [profile, setProfile] = useState({
    family_history: {},
    environment: {},
    birth_info: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/api/alyne/health-twin/profile/${child.id}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile({
          family_history: data.profile.family_history || {},
          environment: data.profile.environment || {},
          birth_info: data.profile.birth_info || {}
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/alyne/health-twin/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.id, ...profile })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Health Twin profile saved!");
        onSaved?.();
        onBack();
      }
    } catch (e) { toast.error("Failed to save profile"); }
    finally { setSaving(false); }
  };

  const updateField = (section, field, value) => {
    setProfile(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const familyHistoryOptions = [
    { id: 'asthma', label: 'Asthma' },
    { id: 'allergies', label: 'Allergies' },
    { id: 'eczema', label: 'Eczema' },
    { id: 'diabetes', label: 'Diabetes' },
    { id: 'heart_disease', label: 'Heart Disease' },
    { id: 'obesity', label: 'Obesity' },
    { id: 'thyroid', label: 'Thyroid Issues' },
  ];

  const environmentOptions = [
    { id: 'urban_living', label: 'Urban Area' },
    { id: 'pets', label: 'Pets at Home' },
    { id: 'smokers_home', label: 'Smokers in Home' },
    { id: 'air_pollution', label: 'High Air Pollution' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold">Health Twin Profile</h2>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading profile...</div>
      ) : (
        <>
          {/* Family History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" /> Family History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {familyHistoryOptions.map(opt => (
                <div key={opt.id} className="flex items-center justify-between">
                  <Label>{opt.label}</Label>
                  <Switch
                    checked={!!profile.family_history[opt.id]}
                    onCheckedChange={(v) => updateField('family_history', opt.id, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Environment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-green-500" /> Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {environmentOptions.map(opt => (
                <div key={opt.id} className="flex items-center justify-between">
                  <Label>{opt.label}</Label>
                  <Switch
                    checked={!!profile.environment[opt.id]}
                    onCheckedChange={(v) => updateField('environment', opt.id, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Birth Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Baby className="w-4 h-4 text-blue-500" /> Birth Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Premature Birth</Label>
                <Switch
                  checked={!!profile.birth_info.premature}
                  onCheckedChange={(v) => updateField('birth_info', 'premature', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Low Birth Weight (&lt;2.5kg)</Label>
                <Switch
                  checked={!!profile.birth_info.low_birth_weight}
                  onCheckedChange={(v) => updateField('birth_info', 'low_birth_weight', v)}
                />
              </div>
              <div>
                <Label>Birth Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 3.2"
                  value={profile.birth_info.birth_weight || ''}
                  onChange={(e) => updateField('birth_info', 'birth_weight', parseFloat(e.target.value) || null)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveProfile} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700">
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </>
      )}
    </div>
  );
};

// ============ RISK ASSESSMENT ============
const RiskAssessment = ({ child, onBack, onComplete }) => {
  const [assessmentType, setAssessmentType] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const assessmentTypes = [
    { id: 'asthma', name: 'Asthma Risk', icon: '🫁', color: 'from-blue-400 to-cyan-400', desc: 'Respiratory condition risk' },
    { id: 'allergies', name: 'Allergy Risk', icon: '🤧', color: 'from-pink-400 to-rose-400', desc: 'Allergy sensitivity risk' },
    { id: 'growth', name: 'Growth Issues', icon: '📏', color: 'from-green-400 to-emerald-400', desc: 'Growth & development risk' },
    { id: 'comprehensive', name: 'Full Assessment', icon: '🔬', color: 'from-purple-400 to-indigo-400', desc: 'Complete health analysis' },
  ];

  const runAssessment = async (type) => {
    setAssessmentType(type);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/health-twin/assess-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.id, assessment_type: type })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        onComplete?.();
      } else {
        toast.error("Assessment failed");
      }
    } catch (e) { toast.error("Assessment error"); }
    finally { setLoading(false); }
  };

  if (result) {
    return (
      <AssessmentDetail 
        assessment={{ result: result.result, assessment_type: result.assessment_type }}
        disclaimer={result.disclaimer}
        onBack={() => { setResult(null); setAssessmentType(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold">Risk Assessment</h2>
      </div>

      {loading ? (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-purple-700 font-medium">Analyzing {assessmentType} risk...</p>
            <p className="text-sm text-purple-600 mt-2">AI is reviewing health data and risk factors</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-gray-600">Choose an assessment type for {child.name}</p>
          
          <div className="grid gap-3">
            {assessmentTypes.map(type => (
              <button
                key={type.id}
                onClick={() => runAssessment(type.id)}
                className={`bg-gradient-to-br ${type.color} text-white p-5 rounded-2xl text-left shadow-lg hover:shadow-xl transition-all flex items-center gap-4`}
                data-testid={`assess-${type.id}`}
              >
                <span className="text-4xl">{type.icon}</span>
                <div>
                  <p className="font-bold text-lg">{type.name}</p>
                  <p className="text-sm text-white/80">{type.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Important</p>
                  <p>This is an AI-assisted risk assessment, not a medical diagnosis. Always consult your pediatrician for professional medical advice.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

// ============ ASSESSMENT DETAIL VIEW ============
const AssessmentDetail = ({ assessment, disclaimer, onBack }) => {
  const result = assessment?.result || {};
  
  const riskColors = {
    low: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
    moderate: { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' },
    elevated: { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' },
    high: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' }
  };
  
  const colors = riskColors[result.risk_level] || riskColors.moderate;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold capitalize">{assessment.assessment_type} Assessment</h2>
      </div>

      {/* Risk Score Card */}
      <Card className={`${colors.bg} border-0`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-70">Risk Level</p>
              <p className={`text-2xl font-bold ${colors.text} capitalize`}>{result.risk_level}</p>
            </div>
            <div className="w-20 h-20 rounded-full border-4 border-white bg-white/50 flex items-center justify-center">
              <span className="text-2xl font-bold">{result.risk_score}</span>
            </div>
          </div>
          <Progress value={result.risk_score} className="h-2" />
        </CardContent>
      </Card>

      {/* Summary */}
      {result.summary && (
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-700">{result.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Factors */}
      {result.key_factors?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">⚠️ Key Risk Factors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {result.key_factors.map((f, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Protective Factors */}
      {result.protective_factors?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600">✓ Protective Factors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {result.protective_factors.map((f, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-600">📋 Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <div key={i} className={`p-3 rounded-lg ${
                  rec.priority === 'high' ? 'bg-red-50' :
                  rec.priority === 'medium' ? 'bg-yellow-50' : 'bg-green-50'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs capitalize">{rec.priority}</Badge>
                    {rec.timeline && <Badge variant="outline" className="text-xs">{rec.timeline}</Badge>}
                  </div>
                  <p className="text-sm">{rec.action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* When to See Doctor */}
      {result.when_to_see_doctor && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-amber-800 mb-2">🏥 When to See a Doctor</h4>
            <p className="text-sm text-amber-700">{result.when_to_see_doctor}</p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <p className="text-xs text-gray-500">
            {disclaimer || "This is an AI-assisted risk assessment and not a medical diagnosis. Please consult your pediatrician for professional medical advice."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalHealthTwinSection;
