import React, { useState, useEffect } from 'react';
import { FileText, Upload, Mail, MessageSquare, CheckCircle, AlertCircle, Loader2, Eye, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const LabReportAutoImport = () => {
  const [importing, setImporting] = useState(false);
  const [reports, setReports] = useState([]);
  const [pendingImports, setPendingImports] = useState([]);

  useEffect(() => {
    fetchReports();
    checkPendingImports();
  }, []);

  const fetchReports = () => {
    setReports([
      { id: '1', name: 'Complete Blood Count', lab: 'Proton Diagnostics', date: '2026-01-25', status: 'imported', category: 'Hematology' },
      { id: '2', name: 'HbA1c Test', lab: 'Proton Diagnostics', date: '2026-01-20', status: 'imported', category: 'Diabetes' },
      { id: '3', name: 'Lipid Profile', lab: 'External Lab', date: '2026-01-15', status: 'imported', category: 'Cardiac' }
    ]);
  };

  const checkPendingImports = () => {
    setPendingImports([
      { id: 'p1', source: 'Email', subject: 'Lab Report - Thyroid Panel', from: 'reports@externallab.com', received: '2 hours ago' },
      { id: 'p2', source: 'SMS', content: 'Your report is ready. Download: link', from: '+91 98765 43210', received: '1 day ago' }
    ]);
  };

  const importFromEmail = async () => {
    setImporting(true);
    toast.info('Scanning emails for lab reports...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setReports([
      { id: Date.now().toString(), name: 'Thyroid Panel', lab: 'External Lab', date: new Date().toISOString().split('T')[0], status: 'new', category: 'Endocrine' },
      ...reports
    ]);
    setPendingImports(pendingImports.filter(p => p.source !== 'Email'));
    
    toast.success('1 new report imported from email!');
    setImporting(false);
  };

  const importFromSMS = async () => {
    setImporting(true);
    toast.info('Processing SMS links...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Report link processed!');
    setPendingImports(pendingImports.filter(p => p.source !== 'SMS'));
    setImporting(false);
  };

  const manualUpload = () => {
    toast.info('Opening file picker...');
  };

  const confirmImport = (importId) => {
    const pending = pendingImports.find(p => p.id === importId);
    if (pending) {
      if (pending.source === 'Email') {
        importFromEmail();
      } else {
        importFromSMS();
      }
    }
  };

  return (
    <div className="space-y-4" data-testid="lab-report-auto-import">
      {/* Header */}
      <Card className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Lab Report Import</h2>
                <p className="text-cyan-100 text-sm">Auto-import from email & SMS</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={manualUpload}>
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Sources */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={importFromEmail}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-xs text-gray-500">Scan inbox</p>
              </div>
            </div>
            {pendingImports.some(p => p.source === 'Email') && (
              <Badge className="mt-2 bg-amber-100 text-amber-700">1 Pending</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={importFromSMS}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">SMS</p>
                <p className="text-xs text-gray-500">Process links</p>
              </div>
            </div>
            {pendingImports.some(p => p.source === 'SMS') && (
              <Badge className="mt-2 bg-amber-100 text-amber-700">1 Pending</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Imports */}
      {pendingImports.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4" />
              Pending Imports ({pendingImports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingImports.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.source === 'Email' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {item.source === 'Email' ? <Mail className="w-4 h-4 text-blue-600" /> : <MessageSquare className="w-4 h-4 text-green-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.subject || item.content}</p>
                    <p className="text-xs text-gray-500">{item.from} • {item.received}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => confirmImport(item.id)} disabled={importing}>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Imported Reports */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Imported Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {reports.map(report => (
            <div key={report.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  report.status === 'new' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <FileText className={`w-5 h-5 ${report.status === 'new' ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{report.name}</p>
                    {report.status === 'new' && (
                      <Badge className="bg-green-100 text-green-700 text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{report.lab} • {report.date}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings Info */}
      <Card className="bg-gray-50">
        <CardContent className="p-4 text-sm text-gray-600">
          <p className="font-medium mb-2">Auto-Import Settings</p>
          <ul className="space-y-1 text-xs">
            <li>• Email: Scans from registered lab domains</li>
            <li>• SMS: Processes links from known lab numbers</li>
            <li>• Reports are securely attached to your health records</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabReportAutoImport;
