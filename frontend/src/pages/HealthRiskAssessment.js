import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, ArrowRight, Activity, Heart, Droplet, Shield,
  AlertTriangle, CheckCircle, ChevronRight, Loader2, RotateCcw,
  Target, Lightbulb, CalendarCheck, Stethoscope
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const HealthRiskAssessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentAssessment, setCurrentAssessment] = useState(null); // 'diabetes', 'heart', 'cancer'
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Diabetes Risk Form
  const [diabetesForm, setDiabetesForm] = useState({
    age: '',
    bmi: '',
    waist_circumference: '',
    physical_activity: false,
    daily_vegetables: false,
    high_bp_medication: false,
    high_blood_glucose_history: false,
    family_diabetes: 'none'
  });
  
  // Heart Risk Form
  const [heartForm, setHeartForm] = useState({
    age: '',
    gender: 'male',
    total_cholesterol: '',
    hdl_cholesterol: '',
    systolic_bp: '',
    on_bp_treatment: false,
    smoker: false,
    diabetic: false
  });
  
  // Cancer Screening Form
  const [cancerForm, setCancerForm] = useState({
    age: '',
    gender: 'male',
    smoker: false,
    smoking_years: '',
    family_cancer_history: [],
    alcohol_regular: false
  });
  
  const cancerTypes = ['breast', 'colon', 'lung', 'prostate', 'cervical', 'ovarian', 'skin'];
  
  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user]);
  
  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/health-assessment/history/${user.id}`);
      setHistory(response.data?.assessments || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };
  
  const assessments = [
    {
      id: 'diabetes',
      title: 'Diabetes Risk Assessment',
      description: 'Based on FINDRISC questionnaire - estimates 10-year risk of Type 2 Diabetes',
      icon: <Droplet className="w-8 h-8 text-blue-500" />,
      color: 'blue',
      questions: 8
    },
    {
      id: 'heart',
      title: 'Heart Disease Risk',
      description: 'Assess your cardiovascular disease risk factors',
      icon: <Heart className="w-8 h-8 text-red-500" />,
      color: 'red',
      questions: 7
    },
    {
      id: 'cancer',
      title: 'Cancer Screening Eligibility',
      description: 'Find out which cancer screenings are recommended for you',
      icon: <Shield className="w-8 h-8 text-purple-500" />,
      color: 'purple',
      questions: 5
    }
  ];
  
  const diabetesQuestions = [
    { id: 'age', label: 'What is your age?', type: 'number', placeholder: 'Enter your age in years' },
    { id: 'bmi', label: 'What is your BMI?', type: 'number', placeholder: 'e.g., 25.5', helper: 'BMI = Weight(kg) / Height(m)²' },
    { id: 'waist_circumference', label: 'What is your waist circumference?', type: 'number', placeholder: 'In centimeters', helper: 'Measure at navel level' },
    { id: 'physical_activity', label: 'Do you exercise at least 30 minutes daily?', type: 'yesno' },
    { id: 'daily_vegetables', label: 'Do you eat vegetables or fruits every day?', type: 'yesno' },
    { id: 'high_bp_medication', label: 'Do you take medication for high blood pressure?', type: 'yesno' },
    { id: 'high_blood_glucose_history', label: 'Have you ever been told you have high blood sugar?', type: 'yesno' },
    { id: 'family_diabetes', label: 'Do any of your family members have diabetes?', type: 'family' }
  ];
  
  const heartQuestions = [
    { id: 'age', label: 'What is your age?', type: 'number', placeholder: 'Enter your age in years' },
    { id: 'gender', label: 'What is your gender?', type: 'gender' },
    { id: 'systolic_bp', label: 'What is your systolic blood pressure?', type: 'number', placeholder: 'e.g., 120', helper: 'The top number in BP reading' },
    { id: 'on_bp_treatment', label: 'Are you currently on blood pressure medication?', type: 'yesno' },
    { id: 'smoker', label: 'Do you currently smoke?', type: 'yesno' },
    { id: 'diabetic', label: 'Do you have diabetes?', type: 'yesno' },
    { id: 'cholesterol', label: 'Do you know your cholesterol levels? (Optional)', type: 'cholesterol' }
  ];
  
  const cancerQuestions = [
    { id: 'age', label: 'What is your age?', type: 'number', placeholder: 'Enter your age in years' },
    { id: 'gender', label: 'What is your gender?', type: 'gender' },
    { id: 'smoker', label: 'Do you smoke or have you smoked in the past?', type: 'smoking' },
    { id: 'alcohol_regular', label: 'Do you regularly consume alcohol (more than 2 drinks/day)?', type: 'yesno' },
    { id: 'family_cancer_history', label: 'Has anyone in your family had cancer? Select all that apply:', type: 'cancer_types' }
  ];
  
  const getCurrentQuestions = () => {
    switch (currentAssessment) {
      case 'diabetes': return diabetesQuestions;
      case 'heart': return heartQuestions;
      case 'cancer': return cancerQuestions;
      default: return [];
    }
  };
  
  const getCurrentForm = () => {
    switch (currentAssessment) {
      case 'diabetes': return diabetesForm;
      case 'heart': return heartForm;
      case 'cancer': return cancerForm;
      default: return {};
    }
  };
  
  const setCurrentForm = (value) => {
    switch (currentAssessment) {
      case 'diabetes': setDiabetesForm(value); break;
      case 'heart': setHeartForm(value); break;
      case 'cancer': setCancerForm(value); break;
    }
  };
  
  const updateFormField = (field, value) => {
    setCurrentForm({ ...getCurrentForm(), [field]: value });
  };
  
  const handleNext = () => {
    const questions = getCurrentQuestions();
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitAssessment();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const submitAssessment = async () => {
    if (!user?.id) {
      toast.error('Please login to save your assessment');
      return;
    }
    
    setLoading(true);
    try {
      let endpoint = '';
      let data = {};
      
      if (currentAssessment === 'diabetes') {
        endpoint = `/health-assessment/diabetes-risk?user_id=${user.id}`;
        data = {
          age: parseInt(diabetesForm.age) || 30,
          bmi: parseFloat(diabetesForm.bmi) || 25,
          waist_circumference: parseFloat(diabetesForm.waist_circumference) || 80,
          physical_activity: diabetesForm.physical_activity,
          daily_vegetables: diabetesForm.daily_vegetables,
          high_bp_medication: diabetesForm.high_bp_medication,
          high_blood_glucose_history: diabetesForm.high_blood_glucose_history,
          family_diabetes: diabetesForm.family_diabetes
        };
      } else if (currentAssessment === 'heart') {
        endpoint = `/health-assessment/heart-risk?user_id=${user.id}`;
        data = {
          age: parseInt(heartForm.age) || 30,
          gender: heartForm.gender,
          total_cholesterol: heartForm.total_cholesterol ? parseFloat(heartForm.total_cholesterol) : null,
          hdl_cholesterol: heartForm.hdl_cholesterol ? parseFloat(heartForm.hdl_cholesterol) : null,
          systolic_bp: parseInt(heartForm.systolic_bp) || 120,
          on_bp_treatment: heartForm.on_bp_treatment,
          smoker: heartForm.smoker,
          diabetic: heartForm.diabetic
        };
      } else if (currentAssessment === 'cancer') {
        endpoint = `/health-assessment/cancer-screening?user_id=${user.id}`;
        data = {
          age: parseInt(cancerForm.age) || 30,
          gender: cancerForm.gender,
          smoker: cancerForm.smoker,
          smoking_years: parseInt(cancerForm.smoking_years) || 0,
          family_cancer_history: cancerForm.family_cancer_history,
          alcohol_regular: cancerForm.alcohol_regular
        };
      }
      
      const response = await axios.post(`${API}${endpoint}`, data);
      setResult(response.data);
      toast.success('Assessment completed!');
      fetchHistory();
    } catch (error) {
      toast.error('Failed to submit assessment');
      console.error(error);
    }
    setLoading(false);
  };
  
  const resetAssessment = () => {
    setCurrentAssessment(null);
    setCurrentStep(0);
    setResult(null);
    setDiabetesForm({
      age: '', bmi: '', waist_circumference: '',
      physical_activity: false, daily_vegetables: false,
      high_bp_medication: false, high_blood_glucose_history: false, family_diabetes: 'none'
    });
    setHeartForm({
      age: '', gender: 'male', total_cholesterol: '', hdl_cholesterol: '',
      systolic_bp: '', on_bp_treatment: false, smoker: false, diabetic: false
    });
    setCancerForm({
      age: '', gender: 'male', smoker: false, smoking_years: '',
      family_cancer_history: [], alcohol_regular: false
    });
  };
  
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'slightly elevated': return 'bg-yellow-100 text-yellow-700';
      case 'moderate': return 'bg-orange-100 text-orange-700';
      case 'high': return 'bg-red-100 text-red-700';
      case 'very high': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const renderQuestion = (question) => {
    const form = getCurrentForm();
    
    switch (question.type) {
      case 'number':
        return (
          <div>
            <Input
              type="number"
              placeholder={question.placeholder}
              value={form[question.id] || ''}
              onChange={(e) => updateFormField(question.id, e.target.value)}
              className="text-lg"
            />
            {question.helper && (
              <p className="text-sm text-gray-500 mt-2">{question.helper}</p>
            )}
          </div>
        );
      
      case 'yesno':
        return (
          <RadioGroup
            value={form[question.id] ? 'yes' : 'no'}
            onValueChange={(value) => updateFormField(question.id, value === 'yes')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes" className="text-lg">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no" className="text-lg">No</Label>
            </div>
          </RadioGroup>
        );
      
      case 'gender':
        return (
          <RadioGroup
            value={form.gender}
            onValueChange={(value) => updateFormField('gender', value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="text-lg">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="text-lg">Female</Label>
            </div>
          </RadioGroup>
        );
      
      case 'family':
        return (
          <RadioGroup
            value={form.family_diabetes}
            onValueChange={(value) => updateFormField('family_diabetes', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none">No family history</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="grandparent_uncle_aunt" id="grandparent" />
              <Label htmlFor="grandparent">Grandparent, uncle, aunt, or cousin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="parent_sibling" id="parent" />
              <Label htmlFor="parent">Parent or sibling</Label>
            </div>
          </RadioGroup>
        );
      
      case 'cholesterol':
        return (
          <div className="space-y-3">
            <div>
              <Label>Total Cholesterol (mg/dL)</Label>
              <Input
                type="number"
                placeholder="e.g., 200"
                value={form.total_cholesterol || ''}
                onChange={(e) => updateFormField('total_cholesterol', e.target.value)}
              />
            </div>
            <div>
              <Label>HDL Cholesterol (mg/dL)</Label>
              <Input
                type="number"
                placeholder="e.g., 50"
                value={form.hdl_cholesterol || ''}
                onChange={(e) => updateFormField('hdl_cholesterol', e.target.value)}
              />
            </div>
            <p className="text-sm text-gray-500">Leave blank if unknown</p>
          </div>
        );
      
      case 'smoking':
        return (
          <div className="space-y-3">
            <RadioGroup
              value={form.smoker ? 'yes' : 'no'}
              onValueChange={(value) => {
                updateFormField('smoker', value === 'yes');
                if (value === 'no') updateFormField('smoking_years', '');
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="smoke_yes" />
                <Label htmlFor="smoke_yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="smoke_no" />
                <Label htmlFor="smoke_no">No</Label>
              </div>
            </RadioGroup>
            {form.smoker && (
              <div>
                <Label>For how many years?</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  value={form.smoking_years || ''}
                  onChange={(e) => updateFormField('smoking_years', e.target.value)}
                />
              </div>
            )}
          </div>
        );
      
      case 'cancer_types':
        return (
          <div className="space-y-2">
            {cancerTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={form.family_cancer_history.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFormField('family_cancer_history', [...form.family_cancer_history, type]);
                    } else {
                      updateFormField('family_cancer_history', form.family_cancer_history.filter(t => t !== type));
                    }
                  }}
                />
                <Label htmlFor={type} className="capitalize">{type} Cancer</Label>
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="none_cancer"
                checked={form.family_cancer_history.length === 0}
                onCheckedChange={(checked) => {
                  if (checked) updateFormField('family_cancer_history', []);
                }}
              />
              <Label htmlFor="none_cancer">No family history of cancer</Label>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Main selection screen
  if (!currentAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="w-6 h-6 text-indigo-600" />
                  Health Risk Assessment
                </h1>
                <p className="text-gray-500 text-sm">Know your health risks</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="grid gap-4">
            {assessments.map((assessment) => (
              <Card 
                key={assessment.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => { setCurrentAssessment(assessment.id); setCurrentStep(0); }}
                data-testid={`${assessment.id}-assessment-card`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full bg-${assessment.color}-100`}>
                      {assessment.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{assessment.title}</h3>
                      <p className="text-gray-500 text-sm mt-1">{assessment.description}</p>
                      <p className="text-xs text-gray-400 mt-2">{assessment.questions} questions • ~3 minutes</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Recent Assessments */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Assessments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.slice(0, 5).map((assessment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {assessment.type === 'diabetes_risk' && <Droplet className="w-5 h-5 text-blue-500" />}
                      {assessment.type === 'heart_risk' && <Heart className="w-5 h-5 text-red-500" />}
                      {assessment.type === 'cancer_screening' && <Shield className="w-5 h-5 text-purple-500" />}
                      <div>
                        <p className="font-medium capitalize">{assessment.type.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getRiskColor(assessment.risk_level)}>
                      {assessment.risk_level || `${assessment.screenings_recommended} screenings`}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }
  
  // Result screen
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={resetAssessment}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold">Assessment Result</h1>
              </div>
              <Button variant="outline" onClick={resetAssessment}>
                <RotateCcw className="w-4 h-4 mr-2" />
                New Assessment
              </Button>
            </div>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Risk Score Card */}
          <Card className={`border-2 ${result.risk_color === 'green' ? 'border-green-200 bg-green-50' : result.risk_color === 'red' || result.risk_color === 'darkred' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
            <CardContent className="p-6 text-center">
              {result.risk_level ? (
                <>
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${getRiskColor(result.risk_level)}`}>
                    {result.risk_color === 'green' ? (
                      <CheckCircle className="w-12 h-12" />
                    ) : (
                      <AlertTriangle className="w-12 h-12" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{result.risk_level} Risk</h2>
                  {result.score !== undefined && (
                    <p className="text-gray-600 mb-2">Score: {result.score}/{result.max_score}</p>
                  )}
                  {result.ten_year_risk && (
                    <p className="text-gray-600 mb-4">10-year risk: {result.ten_year_risk}</p>
                  )}
                  <p className="text-gray-700">{result.message}</p>
                </>
              ) : (
                <>
                  <Stethoscope className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                  <h2 className="text-2xl font-bold mb-2">Screening Recommendations</h2>
                  <p className="text-gray-700">{result.message}</p>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Breakdown */}
          {result.breakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Risk Factors Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.factor}</p>
                      <p className="text-sm text-gray-500">{item.value}</p>
                    </div>
                    {item.points !== undefined && (
                      <Badge variant={item.points > 0 ? 'destructive' : 'secondary'}>
                        +{item.points} pts
                      </Badge>
                    )}
                    {item.risk !== undefined && (
                      <Badge variant={item.risk ? 'destructive' : 'secondary'}>
                        {item.risk ? 'Risk' : 'OK'}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Screenings (for cancer) */}
          {result.screenings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5" />
                  Recommended Screenings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.screenings.map((screening, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{screening.type}</h4>
                      <Badge variant={screening.urgency === 'high' ? 'destructive' : 'outline'}>
                        {screening.urgency} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600"><strong>Test:</strong> {screening.test}</p>
                    <p className="text-sm text-gray-600"><strong>Frequency:</strong> {screening.frequency}</p>
                    {screening.note && (
                      <p className="text-sm text-orange-600 mt-2">{screening.note}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          
          {/* Next Steps */}
          {result.next_steps?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.next_steps.map((step, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => navigate(step.link)}
                  >
                    {step.action}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }
  
  // Question screen
  const questions = getCurrentQuestions();
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={resetAssessment}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {assessments.find(a => a.id === currentAssessment)?.title}
              </h1>
              <Progress value={progress} className="h-2 mt-2" />
            </div>
            <span className="text-sm text-gray-500">{currentStep + 1}/{questions.length}</span>
          </div>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">{currentQuestion.label}</h2>
              {renderQuestion(currentQuestion)}
            </div>
            
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : currentStep === questions.length - 1 ? (
                  'Get Results'
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HealthRiskAssessment;
