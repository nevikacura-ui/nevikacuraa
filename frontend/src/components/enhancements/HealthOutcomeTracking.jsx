import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Users, CheckCircle, AlertTriangle, Heart, Pill, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

const HealthOutcomeTracking = () => {
  const [outcomes, setOutcomes] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState('diabetes');

  const conditions = [
    { id: 'diabetes', name: 'Diabetes', icon: '🩺' },
    { id: 'hypertension', name: 'Hypertension', icon: '❤️' },
    { id: 'pregnancy', name: 'Pregnancy', icon: '🤰' }
  ];

  useEffect(() => {
    fetchOutcomes();
  }, [selectedCondition]);

  const fetchOutcomes = () => {
    const data = {
      diabetes: {
        total_patients: 245,
        improved: 78,
        stable: 18,
        declined: 4,
        key_metrics: [
          { name: 'HbA1c Control (<7%)', achieved: 156, total: 245, percentage: 64 },
          { name: 'Regular Checkups', achieved: 198, total: 245, percentage: 81 },
          { name: 'Medication Adherence', achieved: 210, total: 245, percentage: 86 },
          { name: 'No Complications', achieved: 220, total: 245, percentage: 90 }
        ],
        success_stories: [
          { patient: 'R.K.', improvement: 'HbA1c reduced from 9.2% to 6.8% in 6 months' },
          { patient: 'S.M.', improvement: 'Lost 8kg and reduced medication dosage' }
        ],
        interventions: [
          { type: 'Diet counseling', patients: 180, success_rate: 72 },
          { type: 'Exercise program', patients: 120, success_rate: 65 },
          { type: 'Medication adjustment', patients: 95, success_rate: 85 }
        ]
      },
      hypertension: {
        total_patients: 312,
        improved: 72,
        stable: 22,
        declined: 6,
        key_metrics: [
          { name: 'BP Control (<140/90)', achieved: 224, total: 312, percentage: 72 },
          { name: 'Regular Monitoring', achieved: 280, total: 312, percentage: 90 },
          { name: 'Medication Adherence', achieved: 265, total: 312, percentage: 85 },
          { name: 'Lifestyle Changes', achieved: 187, total: 312, percentage: 60 }
        ],
        success_stories: [
          { patient: 'A.P.', improvement: 'BP normalized without medication after lifestyle changes' }
        ],
        interventions: [
          { type: 'Salt reduction diet', patients: 250, success_rate: 68 },
          { type: 'Stress management', patients: 80, success_rate: 55 }
        ]
      },
      pregnancy: {
        total_patients: 89,
        improved: 92,
        stable: 7,
        declined: 1,
        key_metrics: [
          { name: 'Healthy Deliveries', achieved: 82, total: 89, percentage: 92 },
          { name: 'Complete ANC Visits', achieved: 78, total: 89, percentage: 88 },
          { name: 'No Complications', achieved: 80, total: 89, percentage: 90 },
          { name: 'Vaccination Complete', achieved: 85, total: 89, percentage: 96 }
        ],
        success_stories: [
          { patient: 'P.S.', improvement: 'High-risk pregnancy managed successfully' }
        ],
        interventions: [
          { type: 'Nutrition counseling', patients: 89, success_rate: 95 },
          { type: 'High-risk monitoring', patients: 23, success_rate: 91 }
        ]
      }
    };
    setOutcomes(data[selectedCondition]);
  };

  return (
    <div className="space-y-4" data-testid="health-outcome-tracking">
      {/* Header */}
      <Card className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Health Outcomes</h2>
              <p className="text-cyan-100 text-sm">Treatment effectiveness tracking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Condition Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {conditions.map(cond => (
          <Button
            key={cond.id}
            variant={selectedCondition === cond.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCondition(cond.id)}
          >
            {cond.icon} {cond.name}
          </Button>
        ))}
      </div>

      {outcomes && (
        <>
          {/* Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{outcomes.total_patients} Patients</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 mx-auto text-green-600 mb-1" />
                  <p className="text-xl font-bold text-green-600">{outcomes.improved}%</p>
                  <p className="text-xs text-gray-500">Improved</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Activity className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-xl font-bold text-blue-600">{outcomes.stable}%</p>
                  <p className="text-xs text-gray-500">Stable</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <TrendingDown className="w-5 h-5 mx-auto text-red-600 mb-1" />
                  <p className="text-xl font-bold text-red-600">{outcomes.declined}%</p>
                  <p className="text-xs text-gray-500">Declined</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {outcomes.key_metrics.map((metric, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{metric.name}</span>
                    <span className="text-sm font-medium">{metric.achieved}/{metric.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={metric.percentage} className="flex-1 h-2" />
                    <span className={`text-sm font-medium ${
                      metric.percentage >= 80 ? 'text-green-600' :
                      metric.percentage >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {metric.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Interventions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Intervention Success Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {outcomes.interventions.map((intervention, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{intervention.type}</p>
                    <p className="text-xs text-gray-500">{intervention.patients} patients</p>
                  </div>
                  <Badge className={intervention.success_rate >= 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {intervention.success_rate}% success
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Success Stories */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" /> Success Stories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {outcomes.success_stories.map((story, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-sm">
                    <span className="font-medium">{story.patient}:</span> {story.improvement}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HealthOutcomeTracking;
