import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, Share2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';

const API = process.env.REACT_APP_BACKEND_URL;

// Data Export for Patients (#36)
const DataExport = () => {
  const [selectedData, setSelectedData] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);

  const dataTypes = [
    { id: 'appointments', name: 'Appointments', description: 'All your appointment history', icon: '📅' },
    { id: 'prescriptions', name: 'Prescriptions', description: 'All prescriptions and medications', icon: '💊' },
    { id: 'lab_reports', name: 'Lab Reports', description: 'Test results and reports', icon: '🔬' },
    { id: 'vitals', name: 'Vitals History', description: 'Blood pressure, weight, etc.', icon: '❤️' },
    { id: 'billing', name: 'Billing & Payments', description: 'Payment history and invoices', icon: '💳' },
    { id: 'profile', name: 'Profile Data', description: 'Personal information', icon: '👤' },
  ];

  const toggleDataType = (id) => {
    if (selectedData.includes(id)) {
      setSelectedData(selectedData.filter(d => d !== id));
    } else {
      setSelectedData([...selectedData, id]);
    }
  };

  const selectAll = () => {
    if (selectedData.length === dataTypes.length) {
      setSelectedData([]);
    } else {
      setSelectedData(dataTypes.map(d => d.id));
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/patient/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dataTypes: selectedData,
          dateRange,
          format
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        // In production, this would download the file
        alert(`Export started! You'll receive a download link shortly.`);
        setExportHistory([
          { id: Date.now(), date: new Date().toISOString(), format, status: 'completed', types: selectedData },
          ...exportHistory
        ]);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="data-export">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6 text-teal-600" />
          Export My Data
        </h2>
      </div>

      {/* Data Selection */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Select Data to Export</CardTitle>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedData.length === dataTypes.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {dataTypes.map(type => (
            <div
              key={type.id}
              onClick={() => toggleDataType(type.id)}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedData.includes(type.id)
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={selectedData.includes(type.id)} />
                <span className="text-xl">{type.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{type.name}</p>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Date Range */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Date Range (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full p-2 border rounded-lg mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full p-2 border rounded-lg mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Leave empty to export all data</p>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-16 flex-col"
          disabled={selectedData.length === 0 || exporting}
          onClick={() => handleExport('pdf')}
        >
          <FileText className="w-5 h-5 mb-1" />
          Export as PDF
        </Button>
        <Button
          variant="outline"
          className="h-16 flex-col"
          disabled={selectedData.length === 0 || exporting}
          onClick={() => handleExport('json')}
        >
          <Download className="w-5 h-5 mb-1" />
          Export as JSON
        </Button>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Your Data Rights:</strong> You have the right to access and download all your health data. 
            Exported data is HIPAA-compliant and can be shared with other healthcare providers.
          </p>
        </CardContent>
      </Card>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Exports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exportHistory.slice(0, 3).map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{exp.format.toUpperCase()} Export</p>
                  <p className="text-sm text-gray-500">
                    {new Date(exp.date).toLocaleDateString()} • {exp.types.length} data types
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700">Completed</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataExport;
