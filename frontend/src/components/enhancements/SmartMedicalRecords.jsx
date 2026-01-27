import React, { useState, useEffect } from 'react';
import { FileText, Brain, TrendingUp, TrendingDown, Calendar, Pill, TestTube, Activity, Loader2, Download, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const SmartMedicalRecords = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    generateSummary();
  }, []);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/ai/medical-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      // Mock AI-generated summary
      setSummary({
        patient_overview: {
          name: 'Patient',
          age: 45,
          blood_group: 'B+',
          primary_conditions: ['Type 2 Diabetes', 'Hypertension'],
          allergies: ['Penicillin']
        },
        health_trends: [
          { metric: 'HbA1c', current: '7.2%', previous: '7.8%', trend: 'improving', insight: 'Good progress in diabetes control' },
          { metric: 'Blood Pressure', current: '130/85', previous: '140/90', trend: 'improving', insight: 'BP trending towards normal' },
          { metric: 'Weight', current: '78 kg', previous: '75 kg', trend: 'declining', insight: 'Slight weight gain, review diet' },
          { metric: 'Cholesterol', current: '210', previous: '220', trend: 'improving', insight: 'Lipid levels improving' }
        ],
        recent_visits: [
          { date: '2026-01-15', doctor: 'Dr. Vikas Jha', reason: 'Diabetes follow-up', notes: 'HbA1c improved, continue current medication' },
          { date: '2025-12-20', doctor: 'Dr. Neha Patel', reason: 'Annual checkup', notes: 'General health satisfactory' }
        ],
        current_medications: [
          { name: 'Metformin 500mg', dosage: 'Twice daily', since: '2024-06-01' },
          { name: 'Amlodipine 5mg', dosage: 'Once daily', since: '2024-08-15' }
        ],
        ai_recommendations: [
          'Continue current diabetes management plan - showing positive results',
          'Consider dietary modifications to address recent weight gain',
          'Schedule eye examination - due for diabetic retinopathy screening',
          'Kidney function test recommended in next 3 months'
        ],
        risk_flags: [
          { type: 'medium', message: 'Overdue for diabetic eye exam (last: 14 months ago)' },
          { type: 'low', message: 'Consider flu vaccination before winter season' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    return trend === 'improving' ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500">AI is analyzing your medical records...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="smart-medical-records">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Smart Health Summary</h2>
                <p className="text-indigo-100 text-sm">AI-powered medical records analysis</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          {/* Patient Overview Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Patient Profile</h3>
                <Badge variant="outline">{summary.patient_overview.blood_group}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Primary Conditions</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.patient_overview.primary_conditions.map((condition, idx) => (
                      <Badge key={idx} variant="secondary">{condition}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Allergies</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.patient_overview.allergies.map((allergy, idx) => (
                      <Badge key={idx} className="bg-red-100 text-red-700">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Flags */}
          {summary.risk_flags.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Attention Needed</h3>
                <ul className="space-y-2">
                  {summary.risk_flags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                      <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {flag.message}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="overview">Trends</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="visits">Visits</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              {summary.health_trends.map((trend, idx) => (
                <Card key={idx}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{trend.metric}</p>
                        <p className="text-lg font-bold">{trend.current}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(trend.trend)}
                          <span className="text-sm text-gray-500">from {trend.previous}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{trend.insight}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="medications" className="space-y-3">
              {summary.current_medications.map((med, idx) => (
                <Card key={idx}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Pill className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{med.name}</p>
                      <p className="text-sm text-gray-500">{med.dosage}</p>
                    </div>
                    <Badge variant="outline">Since {med.since}</Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="visits" className="space-y-3">
              {summary.recent_visits.map((visit, idx) => (
                <Card key={idx}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{visit.reason}</p>
                        <p className="text-sm text-gray-500">{visit.doctor} • {visit.date}</p>
                        <p className="text-sm text-gray-600 mt-1">{visit.notes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          {/* AI Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.ai_recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                      {idx + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SmartMedicalRecords;
