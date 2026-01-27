import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Pill, Calendar, AlertCircle, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const API = process.env.REACT_APP_BACKEND_URL;

// Prescription Digital Wallet (#3)
const PrescriptionWallet = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/patient/prescriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data.prescriptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestRefill = async (prescriptionId) => {
    try {
      const token = localStorage.getItem('patientToken');
      await fetch(`${API}/api/patient/prescriptions/${prescriptionId}/refill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Show success toast
    } catch (error) {
      console.error('Failed to request refill:', error);
    }
  };

  const sharePrescription = async (prescription) => {
    if (navigator.share) {
      await navigator.share({
        title: `Prescription - ${prescription.doctor}`,
        text: `Prescription from ${prescription.doctor} dated ${prescription.date}`,
        url: `${window.location.origin}/prescription/${prescription.id}`
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="prescription-wallet">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-teal-600" />
          My Prescriptions
        </h2>
        <Badge variant="outline">{prescriptions.length} total</Badge>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No prescriptions yet</p>
            <p className="text-sm text-gray-400">Your prescriptions will appear here after your appointments</p>
          </CardContent>
        </Card>
      ) : (
        prescriptions.map((prescription) => (
          <Card key={prescription.id} className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{prescription.doctor}</CardTitle>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {prescription.date}
                  </p>
                </div>
                <Badge className={prescription.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                  {prescription.isActive ? 'Active' : 'Expired'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Medicines List */}
              <div className="space-y-2">
                {prescription.medicines?.slice(0, 3).map((med, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <Pill className="w-4 h-4 text-orange-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.dosage} • {med.duration}</p>
                    </div>
                    {med.reminder && (
                      <Badge variant="outline" className="text-xs">Reminder On</Badge>
                    )}
                  </div>
                ))}
                {prescription.medicines?.length > 3 && (
                  <p className="text-sm text-teal-600 text-center">
                    +{prescription.medicines.length - 3} more medicines
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => sharePrescription(prescription)}>
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                {prescription.isActive && (
                  <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => requestRefill(prescription.id)}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refill
                  </Button>
                )}
              </div>

              {/* Refill Alert */}
              {prescription.refillDue && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">Refill due in {prescription.refillDue} days</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default PrescriptionWallet;
