import React, { useState, useEffect } from 'react';
import { User, FileText, AlertTriangle, Pill, Calendar, Activity, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const API = process.env.REACT_APP_BACKEND_URL;

// Patient Context Cards (#8) - Quick summary before consultation
const PatientContextCard = ({ patientId, patientPhone }) => {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientContext();
  }, [patientId, patientPhone]);

  const fetchPatientContext = async () => {
    try {
      const token = localStorage.getItem('staffToken');
      const res = await fetch(`${API}/api/staff/patient-context?patient_phone=${patientPhone}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContext(data);
      }
    } catch (error) {
      console.error('Failed to fetch patient context:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-32 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  // Mock data for display
  const mockContext = context || {
    name: 'Patient Name',
    age: 35,
    gender: 'Male',
    bloodGroup: 'O+',
    lastVisit: '2 weeks ago',
    lastVisitReason: 'Fever & Cold',
    allergies: ['Penicillin', 'Dust'],
    chronicConditions: ['Diabetes Type 2', 'Hypertension'],
    currentMedications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' },
    ],
    pendingReports: ['Blood Sugar (Fasting)', 'HbA1c'],
    riskFlags: ['High BP Alert', 'Medication Adherence Low'],
    visitCount: 12
  };

  return (
    <Card className="overflow-hidden" data-testid="patient-context-card">
      {/* Header with basic info */}
      <CardHeader className="pb-2 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-teal-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{mockContext.name}</CardTitle>
            <p className="text-sm text-gray-500">
              {mockContext.age} yrs • {mockContext.gender} • {mockContext.bloodGroup}
            </p>
          </div>
          <Badge variant="outline">{mockContext.visitCount} visits</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Risk Flags */}
        {mockContext.riskFlags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {mockContext.riskFlags.map((flag, idx) => (
              <Badge key={idx} variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {flag}
              </Badge>
            ))}
          </div>
        )}

        {/* Last Visit */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Last visit:</span>
            <span className="font-medium">{mockContext.lastVisit}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 ml-6">{mockContext.lastVisitReason}</p>
        </div>

        {/* Allergies */}
        {mockContext.allergies?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1 uppercase font-medium">Allergies</p>
            <div className="flex flex-wrap gap-1">
              {mockContext.allergies.map((allergy, idx) => (
                <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Chronic Conditions */}
        {mockContext.chronicConditions?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1 uppercase font-medium">Chronic Conditions</p>
            <div className="flex flex-wrap gap-1">
              {mockContext.chronicConditions.map((condition, idx) => (
                <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {mockContext.currentMedications?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2 uppercase font-medium flex items-center gap-1">
              <Pill className="w-3 h-3" />
              Current Medications
            </p>
            <div className="space-y-1">
              {mockContext.currentMedications.map((med, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded text-sm">
                  <span className="font-medium">{med.name}</span>
                  <span className="text-gray-500">{med.dosage} • {med.frequency}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Reports */}
        {mockContext.pendingReports?.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium mb-1">⚠️ Pending Reports</p>
            <div className="flex flex-wrap gap-1">
              {mockContext.pendingReports.map((report, idx) => (
                <Badge key={idx} variant="outline" className="bg-white text-amber-700">
                  {report}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* View Full History */}
        <button className="w-full flex items-center justify-center gap-2 p-3 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
          <FileText className="w-4 h-4" />
          View Complete Medical History
          <ChevronRight className="w-4 h-4" />
        </button>
      </CardContent>
    </Card>
  );
};

export default PatientContextCard;
