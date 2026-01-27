import React, { useState, useEffect } from 'react';
import { Search, Pill, AlertTriangle, Check, X, Scan, Camera, FileText, Info, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Medication Interaction Checker (#20)
const MedicationInteractionChecker = () => {
  const [medications, setMedications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [checking, setChecking] = useState(false);

  const medicineDatabase = [
    { id: 1, name: 'Metformin', category: 'Diabetes', generic: true },
    { id: 2, name: 'Glimepiride', category: 'Diabetes', generic: true },
    { id: 3, name: 'Aspirin', category: 'Blood Thinner', generic: true },
    { id: 4, name: 'Lisinopril', category: 'Blood Pressure', generic: true },
    { id: 5, name: 'Atorvastatin', category: 'Cholesterol', generic: true },
    { id: 6, name: 'Amlodipine', category: 'Blood Pressure', generic: true },
    { id: 7, name: 'Omeprazole', category: 'Acid Reflux', generic: true },
    { id: 8, name: 'Metoprolol', category: 'Heart', generic: true },
    { id: 9, name: 'Warfarin', category: 'Blood Thinner', generic: true },
    { id: 10, name: 'Ibuprofen', category: 'Pain Relief', generic: true },
    { id: 11, name: 'Paracetamol', category: 'Pain Relief', generic: true },
    { id: 12, name: 'Vitamin D3', category: 'Supplement', generic: false },
  ];

  const knownInteractions = [
    { 
      drugs: ['Metformin', 'Contrast Dye'], 
      severity: 'high', 
      description: 'May cause lactic acidosis. Stop metformin 48h before contrast procedures.' 
    },
    { 
      drugs: ['Aspirin', 'Ibuprofen'], 
      severity: 'moderate', 
      description: 'Both are blood thinners. Increased risk of bleeding and stomach ulcers.' 
    },
    { 
      drugs: ['Warfarin', 'Aspirin'], 
      severity: 'high', 
      description: 'Significantly increases bleeding risk. Monitor closely.' 
    },
    { 
      drugs: ['Metformin', 'Alcohol'], 
      severity: 'moderate', 
      description: 'Alcohol may increase risk of lactic acidosis. Limit alcohol intake.' 
    },
    { 
      drugs: ['Atorvastatin', 'Grapefruit'], 
      severity: 'moderate', 
      description: 'Grapefruit can increase statin levels. Avoid grapefruit juice.' 
    },
    { 
      drugs: ['Lisinopril', 'Potassium Supplements'], 
      severity: 'moderate', 
      description: 'May cause high potassium levels. Monitor potassium regularly.' 
    },
  ];

  const searchMedicines = (query) => {
    if (query.length >= 2) {
      const results = medicineDatabase.filter(med => 
        med.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    searchMedicines(searchQuery);
  }, [searchQuery]);

  const addMedication = (med) => {
    if (!medications.find(m => m.id === med.id)) {
      setMedications([...medications, med]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeMedication = (medId) => {
    setMedications(medications.filter(m => m.id !== medId));
    setInteractions([]);
  };

  const checkInteractions = () => {
    if (medications.length < 2) {
      toast.info('Add at least 2 medications to check interactions');
      return;
    }

    setChecking(true);
    
    // Simulate API call
    setTimeout(() => {
      const foundInteractions = [];
      const medNames = medications.map(m => m.name);
      
      knownInteractions.forEach(interaction => {
        const matches = interaction.drugs.filter(drug => 
          medNames.some(name => name.toLowerCase().includes(drug.toLowerCase()))
        );
        if (matches.length >= 2) {
          foundInteractions.push(interaction);
        }
      });

      setInteractions(foundInteractions);
      setChecking(false);

      if (foundInteractions.length === 0) {
        toast.success('No known interactions found between your medications');
      } else {
        toast.warning(`Found ${foundInteractions.length} potential interaction(s)`);
      }
    }, 1500);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'moderate': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-4" data-testid="medication-interaction-checker">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Pill className="w-6 h-6 text-teal-600" />
          Interaction Checker
        </h2>
        <Badge variant="outline">{medications.length} medicines</Badge>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search medicine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
              {searchResults.map((med) => (
                <button
                  key={med.id}
                  onClick={() => addMedication(med)}
                  className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">{med.name}</span>
                    <span className="text-sm text-gray-500 ml-2">{med.category}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Add</Badge>
                </button>
              ))}
            </div>
          )}

          {/* Scan Option */}
          <div className="flex gap-2 mt-3">
            <Button variant="outline" className="flex-1" size="sm">
              <Camera className="w-4 h-4 mr-2" />
              Scan Medicine
            </Button>
            <Button variant="outline" className="flex-1" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              From Prescription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Medications */}
      {medications.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {medications.map((med) => (
                <Badge
                  key={med.id}
                  variant="secondary"
                  className="pl-3 pr-1 py-2 text-sm flex items-center gap-2"
                >
                  <Pill className="w-3 h-3" />
                  {med.name}
                  <button
                    onClick={() => removeMedication(med.id)}
                    className="ml-1 p-1 hover:bg-gray-300 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <Button 
              className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
              onClick={checkInteractions}
              disabled={checking || medications.length < 2}
            >
              {checking ? (
                'Checking...'
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Check Interactions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interaction Results */}
      {interactions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Potential Interactions Found
          </h3>
          {interactions.map((interaction, idx) => (
            <Card key={idx} className={`border-l-4 ${getSeverityColor(interaction.severity)}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                    interaction.severity === 'high' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{interaction.drugs.join(' + ')}</span>
                      <Badge className={`text-xs ${
                        interaction.severity === 'high' 
                          ? 'bg-red-500' 
                          : 'bg-amber-500'
                      }`}>
                        {interaction.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{interaction.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                <strong>Important:</strong> This is for informational purposes only. 
                Always consult your doctor before making changes to your medications.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Interactions */}
      {interactions.length === 0 && medications.length >= 2 && !checking && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold text-green-800">No Known Interactions</h3>
            <p className="text-sm text-green-600 mt-1">
              Your selected medications appear safe to take together
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MedicationInteractionChecker;
