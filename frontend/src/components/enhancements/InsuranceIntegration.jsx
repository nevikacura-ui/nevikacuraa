import React, { useState, useEffect } from 'react';
import { Shield, FileText, Check, X, Clock, AlertCircle, Search, Plus, Upload, ChevronRight, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Insurance Integration (#26, #42)
const InsuranceIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [insuranceData, setInsuranceData] = useState(null);
  const [claims, setClaims] = useState([]);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    provider: '',
    policy_number: ''
  });
  const [claimForm, setClaimForm] = useState({
    insurance_provider: '',
    policy_number: '',
    claim_type: 'consultation',
    amount: '',
    description: ''
  });

  const insuranceProviders = [
    { id: 'star_health', name: 'Star Health Insurance', logo: '⭐' },
    { id: 'hdfc_ergo', name: 'HDFC ERGO Health Insurance', logo: '🏦' },
    { id: 'icici_lombard', name: 'ICICI Lombard Health Insurance', logo: '🏛️' },
    { id: 'bajaj_allianz', name: 'Bajaj Allianz Health Insurance', logo: '🛡️' },
    { id: 'max_bupa', name: 'Max Bupa Health Insurance', logo: '💚' }
  ];

  const claimTypes = [
    { id: 'consultation', name: 'Consultation', icon: '🩺' },
    { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
    { id: 'lab_test', name: 'Lab Tests', icon: '🔬' },
    { id: 'hospitalization', name: 'Hospitalization', icon: '🏥' }
  ];

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/features/insurance/claims`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setClaims(data.claims || []);
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    }
  };

  const verifyInsurance = async () => {
    if (!policyForm.provider || !policyForm.policy_number) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/features/insurance/verify?provider=${policyForm.provider}&policy_number=${policyForm.policy_number}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success && data.verified) {
        setInsuranceData(data);
        setShowAddPolicy(false);
        toast.success('Insurance verified successfully!');
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      toast.error('Failed to verify insurance');
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async () => {
    if (!claimForm.amount || !claimForm.description) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/features/insurance/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...claimForm,
          insurance_provider: insuranceData?.provider || claimForm.insurance_provider,
          policy_number: insuranceData?.policy_number || claimForm.policy_number
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Claim submitted! ID: ${data.claim_id}`);
        setShowClaim(false);
        setClaimForm({
          insurance_provider: '',
          policy_number: '',
          claim_type: 'consultation',
          amount: '',
          description: ''
        });
        fetchClaims();
      }
    } catch (error) {
      toast.error('Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-500';
      case 'submitted': case 'pending': return 'bg-amber-500';
      case 'rejected': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4" data-testid="insurance-integration">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Insurance</h2>
              <p className="text-emerald-100 text-sm">Manage policies & claims</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="policy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="policy">My Policy</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        {/* Policy Tab */}
        <TabsContent value="policy" className="space-y-4 mt-4">
          {insuranceData ? (
            <>
              {/* Verified Policy Card */}
              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <Badge className="bg-green-500">Verified</Badge>
                      </div>
                      <h3 className="font-bold text-lg">{insuranceData.provider}</h3>
                      <p className="text-sm text-gray-600">Policy: {insuranceData.policy_number}</p>
                      <p className="text-sm text-gray-500">Valid until: {insuranceData.valid_until}</p>
                    </div>
                    <Building2 className="w-10 h-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Coverage Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Coverage Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(insuranceData.coverage || {}).map(([type, details]) => (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {type === 'consultation' ? '🩺' : 
                           type === 'pharmacy' ? '💊' : 
                           type === 'lab_test' ? '🔬' : '🏥'}
                        </span>
                        <div>
                          <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">Copay: {details.copay}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{details.limit?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Limit</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setShowClaim(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  File Claim
                </Button>
                <Button variant="outline" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  E-Card
                </Button>
              </div>
            </>
          ) : (
            /* Add Policy Card */
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Insurance Linked</h3>
                <p className="text-gray-500 mb-4">Link your health insurance for cashless treatment</p>
                <Button onClick={() => setShowAddPolicy(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Insurance Policy
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Your Claims</h3>
            <Button size="sm" onClick={() => setShowClaim(true)} disabled={!insuranceData}>
              <Plus className="w-4 h-4 mr-1" />
              New Claim
            </Button>
          </div>

          {claims.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No claims submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <Card key={claim.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(claim.status)}>
                            {claim.status}
                          </Badge>
                          <span className="text-xs text-gray-500">#{claim.id}</span>
                        </div>
                        <p className="font-medium capitalize">{claim.claim_type?.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-500">{claim.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{claim.amount?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(claim.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Policy Dialog */}
      <Dialog open={showAddPolicy} onOpenChange={setShowAddPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Add Insurance Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Insurance Provider</Label>
              <Select 
                value={policyForm.provider} 
                onValueChange={(v) => setPolicyForm(prev => ({ ...prev, provider: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {insuranceProviders.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.logo} {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Policy Number</Label>
              <Input
                placeholder="Enter policy number"
                value={policyForm.policy_number}
                onChange={(e) => setPolicyForm(prev => ({ ...prev, policy_number: e.target.value }))}
                className="mt-1"
              />
            </div>

            <Button 
              className="w-full" 
              onClick={verifyInsurance}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify & Add Policy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Claim Dialog */}
      <Dialog open={showClaim} onOpenChange={setShowClaim}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              File Insurance Claim
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Claim Type</Label>
              <Select 
                value={claimForm.claim_type} 
                onValueChange={(v) => setClaimForm(prev => ({ ...prev, claim_type: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {claimTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Claim Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={claimForm.amount}
                onChange={(e) => setClaimForm(prev => ({ ...prev, amount: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                placeholder="Brief description of claim"
                value={claimForm.description}
                onChange={(e) => setClaimForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Upload Documents</Label>
              <div className="mt-1 border-2 border-dashed rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload bills & prescriptions</p>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={submitClaim}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsuranceIntegration;
