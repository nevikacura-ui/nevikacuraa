import React, { useState, useEffect } from 'react';
import { Shield, FileCheck, AlertTriangle, Check, X, Clock, Download, Eye, History, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const ConsentManagement = () => {
  const [consents, setConsents] = useState([]);
  const [pendingConsents, setPendingConsents] = useState([]);
  const [showDetails, setShowDetails] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [consentHistory, setConsentHistory] = useState([]);

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = () => {
    setConsents([
      {
        id: '1',
        title: 'Medical Records Access',
        description: 'Allow healthcare providers to access your medical records for treatment purposes.',
        category: 'treatment',
        status: 'granted',
        granted_on: '2025-06-15',
        expires: null,
        required: true
      },
      {
        id: '2',
        title: 'Health Data Sharing',
        description: 'Share anonymized health data for medical research and improving healthcare services.',
        category: 'research',
        status: 'granted',
        granted_on: '2025-06-15',
        expires: '2026-06-15',
        required: false
      },
      {
        id: '3',
        title: 'Marketing Communications',
        description: 'Receive promotional messages, health tips, and special offers via SMS/Email.',
        category: 'marketing',
        status: 'denied',
        granted_on: null,
        expires: null,
        required: false
      },
      {
        id: '4',
        title: 'Emergency Contact Sharing',
        description: 'Share your information with emergency contacts in case of medical emergencies.',
        category: 'emergency',
        status: 'granted',
        granted_on: '2025-06-15',
        expires: null,
        required: false
      }
    ]);

    setPendingConsents([
      {
        id: 'p1',
        title: 'Insurance Data Sharing',
        description: 'Allow sharing your medical records with your insurance provider for claim processing.',
        category: 'insurance',
        required_by: '2026-02-01'
      }
    ]);

    setConsentHistory([
      { date: '2025-06-15', action: 'Granted', consent: 'Medical Records Access' },
      { date: '2025-06-15', action: 'Granted', consent: 'Health Data Sharing' },
      { date: '2025-06-15', action: 'Denied', consent: 'Marketing Communications' },
      { date: '2025-06-15', action: 'Granted', consent: 'Emergency Contact Sharing' },
      { date: '2025-08-20', action: 'Renewed', consent: 'Health Data Sharing' }
    ]);
  };

  const toggleConsent = (consentId) => {
    setConsents(consents.map(c => {
      if (c.id === consentId && !c.required) {
        const newStatus = c.status === 'granted' ? 'denied' : 'granted';
        toast.success(`Consent ${newStatus === 'granted' ? 'granted' : 'revoked'}`);
        return { 
          ...c, 
          status: newStatus,
          granted_on: newStatus === 'granted' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return c;
    }));
  };

  const handlePendingConsent = (consentId, grant) => {
    const consent = pendingConsents.find(c => c.id === consentId);
    toast.success(`Consent ${grant ? 'granted' : 'denied'} for ${consent.title}`);
    setPendingConsents(pendingConsents.filter(c => c.id !== consentId));
    if (grant) {
      setConsents([...consents, {
        ...consent,
        id: Date.now().toString(),
        status: 'granted',
        granted_on: new Date().toISOString().split('T')[0],
        expires: null,
        required: false
      }]);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      treatment: 'bg-blue-100 text-blue-700',
      research: 'bg-purple-100 text-purple-700',
      marketing: 'bg-orange-100 text-orange-700',
      emergency: 'bg-red-100 text-red-700',
      insurance: 'bg-green-100 text-green-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4" data-testid="consent-management">
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Consent Management</h2>
                <p className="text-slate-300 text-sm">Control how your data is used</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-4 h-4 mr-1" /> History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Consents */}
      {pendingConsents.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              Pending Consent Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingConsents.map(consent => (
              <div key={consent.id} className="bg-white p-4 rounded-lg border border-amber-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{consent.title}</p>
                    <p className="text-sm text-gray-600">{consent.description}</p>
                  </div>
                  <Badge className={getCategoryColor(consent.category)}>
                    {consent.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-amber-700">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Required by: {consent.required_by}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handlePendingConsent(consent.id, false)}
                    >
                      <X className="w-4 h-4 mr-1" /> Deny
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handlePendingConsent(consent.id, true)}
                    >
                      <Check className="w-4 h-4 mr-1" /> Grant
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Consents */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Your Consents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {consents.map(consent => (
            <div 
              key={consent.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  consent.status === 'granted' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {consent.status === 'granted' ? (
                    <FileCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{consent.title}</p>
                    {consent.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{consent.description}</p>
                  {consent.expires && (
                    <p className="text-xs text-amber-600 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Expires: {consent.expires}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDetails(consent)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Switch
                  checked={consent.status === 'granted'}
                  onCheckedChange={() => toggleConsent(consent.id)}
                  disabled={consent.required}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Download Data */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Download Your Data</p>
              <p className="text-sm text-gray-500">Get a copy of all your health records</p>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" /> Request Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consent Details Dialog */}
      <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{showDetails?.title}</DialogTitle>
          </DialogHeader>
          {showDetails && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p>{showDetails.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <Badge className={getCategoryColor(showDetails.category)}>
                    {showDetails.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <Badge className={showDetails.status === 'granted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {showDetails.status}
                  </Badge>
                </div>
                {showDetails.granted_on && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Granted On</p>
                    <p>{showDetails.granted_on}</p>
                  </div>
                )}
                {showDetails.expires && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Expires</p>
                    <p>{showDetails.expires}</p>
                  </div>
                )}
              </div>
              {!showDetails.required && (
                <Button 
                  variant={showDetails.status === 'granted' ? 'destructive' : 'default'}
                  className="w-full"
                  onClick={() => { toggleConsent(showDetails.id); setShowDetails(null); }}
                >
                  {showDetails.status === 'granted' ? 'Revoke Consent' : 'Grant Consent'}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consent History</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {consentHistory.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  item.action === 'Granted' || item.action === 'Renewed' 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}>
                  {item.action === 'Granted' || item.action === 'Renewed' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.consent}</p>
                  <p className="text-xs text-gray-500">{item.action} on {item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsentManagement;
