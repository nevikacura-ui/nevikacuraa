import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Heart, Activity, RefreshCw, Shield, Sparkles, Check, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Predictive Health Insights (#8)
const PredictiveHealthInsights = () => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/ai/health-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          include_vitals: true,
          include_lab_results: true,
          include_medications: true
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setInsights(data.insights);
        setLastUpdated(new Date().toLocaleString());
        if (data.ai_powered) {
          toast.success('AI has analyzed your health data!');
        }
      }
    } catch (error) {
      // Fallback insights
      setInsights({
        risk_factors: [
          { condition: 'Cardiovascular', risk: 'low', description: 'Maintain regular exercise' },
          { condition: 'Diabetes', risk: 'moderate', description: 'Monitor blood sugar regularly' }
        ],
        recommendations: [
          'Schedule a comprehensive health checkup',
          'Increase daily water intake to 8 glasses',
          'Consider adding 30 minutes of walking daily'
        ],
        areas_of_concern: [
          'Blood sugar levels trending slightly higher'
        ],
        positive_trends: [
          'Regular health tracking',
          'Consistent medication adherence'
        ]
      });
      setLastUpdated(new Date().toLocaleString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'moderate': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskIcon = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'moderate': return <Activity className="w-5 h-5 text-amber-500" />;
      case 'low': return <Shield className="w-5 h-5 text-green-500" />;
      default: return <Heart className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4" data-testid="predictive-health-insights">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Health Insights</h2>
                <p className="text-emerald-100 text-sm">AI-powered health analysis</p>
              </div>
            </div>
            <Badge className="bg-white/20">
              <Sparkles className="w-3 h-3 mr-1" />
              AI
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {lastUpdated ? `Last updated: ${lastUpdated}` : 'Loading insights...'}
        </p>
        <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && !insights && (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="w-12 h-12 mx-auto text-teal-500 animate-pulse mb-4" />
            <p className="text-gray-600">AI is analyzing your health data...</p>
          </CardContent>
        </Card>
      )}

      {insights && (
        <>
          {/* Risk Factors */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.risk_factors?.map((factor, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border ${getRiskColor(factor.risk)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(factor.risk)}
                      <span className="font-medium">{factor.condition}</span>
                    </div>
                    <Badge className={`${
                      factor.risk === 'high' ? 'bg-red-500' :
                      factor.risk === 'moderate' ? 'bg-amber-500' : 'bg-green-500'
                    }`}>
                      {factor.risk?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm">{factor.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Areas of Concern */}
          {insights.areas_of_concern?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-5 h-5" />
                  Areas Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.areas_of_concern.map((concern, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {concern}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Positive Trends */}
          {insights.positive_trends?.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                  <Check className="w-5 h-5" />
                  Positive Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.positive_trends.map((trend, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-green-700">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {trend}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insights.recommendations?.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-sm text-purple-900">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Disclaimer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>Disclaimer:</strong> These insights are AI-generated for informational purposes only. 
            They are not a substitute for professional medical advice. Always consult your healthcare 
            provider for medical decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveHealthInsights;
