import React, { useState } from 'react';
import { Link2, Copy, Send, CheckCircle, MessageSquare, Mail, Phone, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

const PaymentLinks = () => {
  const [amount, setAmount] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [description, setDescription] = useState('');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [recentLinks, setRecentLinks] = useState([
    { id: '1', patient: 'Rajesh K.', amount: 1500, status: 'paid', created: '2 hours ago' },
    { id: '2', patient: 'Priya M.', amount: 850, status: 'pending', created: '5 hours ago' },
    { id: '3', patient: 'Amit S.', amount: 2200, status: 'expired', created: '2 days ago' }
  ]);

  const generateLink = () => {
    if (!amount || !patientName) {
      toast.error('Please enter amount and patient name');
      return;
    }

    const link = {
      id: Date.now().toString(),
      url: `https://pay.nevikacura.com/link/${Date.now()}`,
      amount: parseFloat(amount),
      patient: patientName,
      phone: patientPhone,
      description,
      expiresIn: '7 days'
    };

    setGeneratedLink(link);
    setRecentLinks([{ ...link, status: 'pending', created: 'Just now' }, ...recentLinks]);
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const sendVia = (method, link) => {
    toast.success(`Payment link sent via ${method}!`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'expired': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4" data-testid="payment-links">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Payment Links</h2>
              <p className="text-blue-100 text-sm">Send payment requests via WhatsApp/SMS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!generatedLink ? (
        /* Create Link Form */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Payment Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient Name *</Label>
                <Input
                  placeholder="Enter name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  placeholder="+91 XXXXX XXXXX"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Amount *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-xl font-bold"
                />
              </div>
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Input
                placeholder="e.g., Consultation fee, Lab tests"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button onClick={generateLink} className="w-full" size="lg">
              <Link2 className="w-4 h-4 mr-2" /> Generate Payment Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Generated Link */
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Payment Link Generated!</span>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Amount</p>
              <p className="text-3xl font-bold">₹{generatedLink.amount.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-2">For: {generatedLink.patient}</p>
            </div>

            <div className="p-3 bg-gray-100 rounded-lg flex items-center gap-2">
              <Input value={generatedLink.url} readOnly className="bg-white text-sm" />
              <Button size="icon" onClick={() => copyLink(generatedLink.url)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="flex-col h-auto py-3" onClick={() => sendVia('WhatsApp', generatedLink)}>
                <MessageSquare className="w-5 h-5 mb-1 text-green-600" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-3" onClick={() => sendVia('SMS', generatedLink)}>
                <Phone className="w-5 h-5 mb-1 text-blue-600" />
                <span className="text-xs">SMS</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-3" onClick={() => sendVia('Email', generatedLink)}>
                <Mail className="w-5 h-5 mb-1 text-purple-600" />
                <span className="text-xs">Email</span>
              </Button>
            </div>

            <p className="text-center text-xs text-gray-500">
              Link expires in {generatedLink.expiresIn}
            </p>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => { setGeneratedLink(null); setAmount(''); setPatientName(''); setPatientPhone(''); setDescription(''); }}
            >
              Create Another Link
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Payment Links</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {recentLinks.map(link => (
            <div key={link.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{link.patient}</p>
                <p className="text-xs text-gray-500">{link.created}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">₹{link.amount.toLocaleString()}</span>
                <Badge className={getStatusColor(link.status)}>
                  {link.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentLinks;
