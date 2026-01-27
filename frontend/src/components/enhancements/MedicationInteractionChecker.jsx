import React, { useState } from 'react';
import { Pill, Search, AlertTriangle, Check, X, Info, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// Medication Interaction Checker (#20)
const MedicationInteractionChecker = () => {
  const [medications, setMedications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [interactions, setInteractions] = useState(null);
  const [loading, setLoading] = useState(false);

  const commonMedications = [
    { id: 'metformin', name: 'Metformin', category: 'Diabetes' },
    { id: 'aspirin', name: 'Aspirin', category: 'Pain Relief' },
    { id: 'amlodipine', name: 'Amlodipine', category: 'Blood Pressure' },
    { id: 'atorvastatin', name: 'Atorvastatin', category: 'Cholesterol' },
    { id: 'omeprazole', name: 'Omeprazole', category: 'Acid Reflux' },
    { id: 'lisinopril', name: 'Lisinopril', category: 'Blood Pressure' },
    { id: 'levothyroxine', name: 'Levothyroxine', category: 'Thyroid' },
    { id: 'metoprolol', name: 'Metoprolol', category: 'Heart' },
    { id: 'gabapentin', name: 'Gabapentin', category: 'Nerve Pain' },
    { id: 'losartan', name: 'Losartan', category: 'Blood Pressure' },
    { id: 'ibuprofen', name: 'Ibuprofen', category: 'Pain Relief' },
    { id: 'warfarin', name: 'Warfarin', category: 'Blood Thinner' },
  ];

  const filteredMeds = searchTerm
    ? commonMedications.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : commonMedications;

  const addMedication = (med) => {
    if (!medications.find(m => m.id === med.id)) {
      setMedications([...medications, med]);
      setSearchTerm('');
      setInteractions(null);
    }
  };

  const removeMedication = (medId) => {
    setMedications(medications.filter(m => m.id !== medId));
    setInteractions(null);
  };

  const checkInteractions = () => {
    setLoading(true);
    // Simulated interaction check - in production, this would call a drug interaction API
    setTimeout(() => {
      const mockInteractions = {
        severe: [],
        moderate: [],
        mild: [],
        safe: []
      };

      // Check for known interactions
      const hasAspirin = medications.find(m => m.id === 'aspirin');
      const hasWarfarin = medications.find(m => m.id === 'warfarin');
      const hasIbuprofen = medications.find(m => m.id === 'ibuprofen');
      const hasMetformin = medications.find(m => m.id === 'metformin');
      const hasLisinopril = medications.find(m => m.id === 'lisinopril');

      if (hasAspirin && hasWarfarin) {
        mockInteractions.severe.push({
          drugs: ['Aspirin', 'Warfarin'],
          effect: 'Increased risk of bleeding',
          recommendation: 'Avoid combination or use under strict medical supervision'
        });
      }

      if (hasIbuprofen && hasAspirin) {
        mockInteractions.moderate.push({
          drugs: ['Ibuprofen', 'Aspirin'],
          effect: 'May reduce cardioprotective effect of aspirin',
          recommendation: 'Take aspirin at least 30 minutes before ibuprofen'
        });
      }

      if (hasMetformin && hasLisinopril) {
        mockInteractions.mild.push({
          drugs: ['Metformin', 'Lisinopril'],
          effect: 'May slightly increase effect of blood sugar lowering',
          recommendation: 'Monitor blood sugar levels regularly'
        });
      }

      // Add safe combinations
      medications.forEach(med => {
        const hasInteraction = [...mockInteractions.severe, ...mockInteractions.moderate, ...mockInteractions.mild]
          .some(i => i.drugs.includes(med.name));
        if (!hasInteraction) {
          mockInteractions.safe.push(med.name);
        }
      });

      setInteractions(mockInteractions);
      setLoading(false);
    }, 1500);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'severe': return 'bg-red-100 border-red-300 text-red-800';
      case 'moderate': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'mild': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  return (
    <div className="space-y-4" data-testid="medication-checker">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-6 h-6 text-teal-600" />
            Medication Interaction Checker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchTerm && (
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {filteredMeds.map(med => (
                <button
                  key={med.id}
                  onClick={() => addMedication(med)}
                  className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.category}</p>
                  </div>
                  <Badge variant="outline">+ Add</Badge>
                </button>
              ))}
            </div>
          )}

          {/* Selected Medications */}
          {medications.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Selected Medications:</p>
              <div className="flex flex-wrap gap-2">
                {medications.map(med => (
                  <Badge
                    key={med.id}
                    variant="secondary"
                    className="flex items-center gap-1 py-1.5 px-3"
                  >
                    <Pill className="w-3 h-3" />
                    {med.name}
                    <button onClick={() => removeMedication(med.id)}>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Scan Option */}
          <Button variant="outline" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Scan Medicine Label
          </Button>

          {/* Check Button */}
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={medications.length < 2 || loading}
            onClick={checkInteractions}
          >
            {loading ? 'Checking...' : 'Check Interactions'}
          </Button>
        </CardContent>
      </Card>

      {/* Interaction Results */}
      {interactions && (
        <div className="space-y-3">
          {/* Severe Interactions */}
          {interactions.severe.length > 0 && (
            <Card className={`border-2 ${getSeverityColor('severe')}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Severe Interactions</span>
                </div>
                {interactions.severe.map((interaction, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg mb-2">
                    <p className="font-medium">{interaction.drugs.join(' + ')}</p>
                    <p className="text-sm mt-1">{interaction.effect}</p>
                    <p className="text-sm text-red-700 mt-1 font-medium">⚠️ {interaction.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Moderate Interactions */}
          {interactions.moderate.length > 0 && (
            <Card className={`border-2 ${getSeverityColor('moderate')}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5" />
                  <span className="font-semibold">Moderate Interactions</span>
                </div>
                {interactions.moderate.map((interaction, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg mb-2">
                    <p className="font-medium">{interaction.drugs.join(' + ')}</p>
                    <p className="text-sm mt-1">{interaction.effect}</p>
                    <p className="text-sm text-orange-700 mt-1">💡 {interaction.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Mild Interactions */}
          {interactions.mild.length > 0 && (
            <Card className={`border-2 ${getSeverityColor('mild')}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5" />
                  <span className="font-semibold">Mild Interactions</span>
                </div>
                {interactions.mild.map((interaction, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg mb-2">
                    <p className="font-medium">{interaction.drugs.join(' + ')}</p>
                    <p className="text-sm mt-1">{interaction.effect}</p>
                    <p className="text-sm text-yellow-700 mt-1">ℹ️ {interaction.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Safe Medications */}
          {interactions.safe.length > 0 && (
            <Card className={`border-2 ${getSeverityColor('safe')}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">No Known Interactions</span>
                </div>
                <p className="text-sm">{interactions.safe.join(', ')} appear safe to take together.</p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-gray-500 text-center">
            *This is for informational purposes only. Always consult your doctor or pharmacist.
          </p>
        </div>
      )}
    </div>
  );
};

export default MedicationInteractionChecker;
