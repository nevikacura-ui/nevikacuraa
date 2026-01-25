import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, User, Phone, Search, History, Loader2 } from 'lucide-react';

const PatientDatabaseTab = ({
  patientSearchQuery,
  setPatientSearchQuery,
  patientSearchResults,
  allPatients,
  searchingPatients,
  searchPatients
}) => {
  // Determine which patients to display
  const displayPatients = patientSearchQuery ? patientSearchResults : allPatients;

  return (
    <Card data-testid="patients-database-tab">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-700">
          <Users className="w-5 h-5" />
          Patient Database
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, mobile, or patient ID..."
              value={patientSearchQuery}
              onChange={(e) => setPatientSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPatients(patientSearchQuery)}
              className="pl-10 h-12 rounded-xl"
              data-testid="patient-search-input"
            />
          </div>
          <Button 
            onClick={() => searchPatients(patientSearchQuery)}
            disabled={searchingPatients}
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700"
            data-testid="patient-search-btn"
          >
            {searchingPatients ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
        </div>
        
        {/* Results Count */}
        <div className="text-sm text-gray-500">
          {patientSearchQuery && patientSearchResults.length > 0 && (
            <span>Found {patientSearchResults.length} patient(s) matching &quot;{patientSearchQuery}&quot;</span>
          )}
          {!patientSearchQuery && allPatients.length > 0 && (
            <span>Showing {allPatients.length} recent patients</span>
          )}
        </div>
        
        {/* Patient List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {displayPatients.map((patient) => (
            <PatientCard key={patient.patient_id} patient={patient} />
          ))}
          
          {/* Empty State */}
          {displayPatients.length === 0 && !searchingPatients && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{patientSearchQuery ? 'No patients found' : 'Loading patients...'}</p>
            </div>
          )}
          
          {/* Loading State */}
          {searchingPatients && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-sm text-gray-500 mt-2">Searching...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Patient card sub-component
const PatientCard = ({ patient }) => {
  return (
    <div 
      className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors"
      data-testid={`patient-row-${patient.patient_id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-800">{patient.name}</h4>
              <Badge className="bg-indigo-600 text-white text-xs">{patient.patient_id}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {patient.mobile}
              </span>
              {patient.age && <span>{patient.age} yrs</span>}
              {patient.gender && <span className="capitalize">{patient.gender}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            <History className="w-3 h-3 inline mr-1" />
            {patient.total_visits || 0} visits
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Registered: {patient.registered_at ? new Date(patient.registered_at).toLocaleDateString('en-IN') : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatientDatabaseTab;
