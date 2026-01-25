import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, Loader2 
} from 'lucide-react';

const DiagnosticsCreateTab = ({ 
  diagOrderForm,
  setDiagOrderForm,
  availableTests,
  loading,
  handleCreateDiagnosticOrder,
  toggleTestSelection
}) => {
  return (
    <Card className="p-6 max-w-2xl" data-testid="diagnostics-create-tab">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-purple-500" />
        Create New Diagnostic Order
      </h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Patient Name *</Label>
            <Input
              value={diagOrderForm.patient_name}
              onChange={(e) => setDiagOrderForm({ ...diagOrderForm, patient_name: e.target.value })}
              placeholder="Enter patient name"
              data-testid="diag-patient-name"
            />
          </div>
          <div>
            <Label>Phone Number *</Label>
            <Input
              value={diagOrderForm.patient_phone}
              onChange={(e) => setDiagOrderForm({ ...diagOrderForm, patient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="10-digit mobile number"
              data-testid="diag-patient-phone"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Age</Label>
            <Input
              value={diagOrderForm.age}
              onChange={(e) => setDiagOrderForm({ ...diagOrderForm, age: e.target.value })}
              placeholder="e.g., 35"
              data-testid="diag-age"
            />
          </div>
          <div>
            <Label>Sex</Label>
            <select
              value={diagOrderForm.sex}
              onChange={(e) => setDiagOrderForm({ ...diagOrderForm, sex: e.target.value })}
              className="w-full p-2 border rounded-lg"
              data-testid="diag-sex"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <Label>Email (Optional)</Label>
            <Input
              type="email"
              value={diagOrderForm.patient_email}
              onChange={(e) => setDiagOrderForm({ ...diagOrderForm, patient_email: e.target.value })}
              placeholder="patient@email.com"
              data-testid="diag-email"
            />
          </div>
        </div>
        
        <div>
          <Label>Select Tests * <span className="text-gray-500 text-xs">({diagOrderForm.tests.length} selected)</span></Label>
          <div className="mt-2 border rounded-lg p-4 max-h-96 overflow-y-auto">
            {/* OBGYN & Pregnancy Tests - Highlighted */}
            <div className="mb-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
              <h4 className="font-medium text-pink-700 mb-2">🤰 Pregnancy & OBGYN Tests</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Dual / Double Marker', 'Quadruple Marker', 'ANC (Ante Natal Profile)', 'Beta HCG', 
                  'AMH (Anti-Mullerian Hormone)', 'Hormonal Basic', 'Hormonal Advance'].map(test => (
                  <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-pink-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={diagOrderForm.tests.includes(test)}
                      onChange={() => toggleTestSelection(test)}
                      className="rounded text-pink-600"
                    />
                    {test}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Diabetes Tests - Highlighted */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-700 mb-2">🩺 Diabetes Tests</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Diabetes Basic', 'Diabetes Screening', 'Diabetes Advance', 'FBS (Fasting Blood Sugar)', 
                  'PPBS', 'RBS', 'HbA1c', 'OGTT - 3 Sample'].map(test => (
                  <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-blue-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={diagOrderForm.tests.includes(test)}
                      onChange={() => toggleTestSelection(test)}
                      className="rounded text-blue-600"
                    />
                    {test}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Imaging Tests */}
            {availableTests?.imaging && (
              <div className="mb-4">
                <h4 className="font-medium text-purple-700 mb-2">🩻 Imaging</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(availableTests.imaging).map(([category, tests]) => (
                    tests.map(test => (
                      <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-purple-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={diagOrderForm.tests.includes(test)}
                          onChange={() => toggleTestSelection(test)}
                          className="rounded text-purple-600"
                        />
                        {test}
                      </label>
                    ))
                  ))}
                </div>
              </div>
            )}
            
            {/* Other Pathology Tests */}
            {availableTests?.pathology && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">🩸 Other Blood Tests</h4>
                {Object.entries(availableTests.pathology).map(([category, tests]) => (
                  <div key={category} className="mb-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">{category}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {tests.filter(test => 
                        !['Dual / Double Marker', 'Quadruple Marker', 'ANC (Ante Natal Profile)', 'Beta HCG',
                          'AMH (Anti-Mullerian Hormone)', 'Hormonal Basic', 'Hormonal Advance',
                          'Diabetes Basic', 'Diabetes Screening', 'Diabetes Advance', 'FBS (Fasting Blood Sugar)',
                          'PPBS', 'RBS', 'HbA1c', 'OGTT - 3 Sample'].includes(test)
                      ).map(test => (
                        <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-red-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={diagOrderForm.tests.includes(test)}
                            onChange={() => toggleTestSelection(test)}
                            className="rounded text-red-600"
                          />
                          {test}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {diagOrderForm.tests.length > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm font-medium text-purple-800 mb-1">Selected Tests:</p>
            <p className="text-sm text-purple-700">{diagOrderForm.tests.join(', ')}</p>
          </div>
        )}
        
        <div>
          <Label>Notes (Optional)</Label>
          <Input
            value={diagOrderForm.notes}
            onChange={(e) => setDiagOrderForm({ ...diagOrderForm, notes: e.target.value })}
            placeholder="Any special instructions..."
            data-testid="diag-notes"
          />
        </div>
        
        <Button 
          onClick={handleCreateDiagnosticOrder} 
          disabled={loading || diagOrderForm.tests.length === 0}
          className="w-full bg-purple-500 hover:bg-purple-600"
          data-testid="diag-create-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Create Diagnostic Order
        </Button>
      </div>
    </Card>
  );
};

export default DiagnosticsCreateTab;
