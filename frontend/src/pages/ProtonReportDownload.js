import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FileText, Download, Shield, Phone, ArrowLeft, CheckCircle2, 
  Clock, User, TestTube, Calendar, Loader2, Lock, Eye
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ProtonReportDownload = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const urlBookingId = bookingId || searchParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  
  // Verification form
  const [bookingIdInput, setBookingIdInput] = useState(urlBookingId || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [dobInput, setDobInput] = useState('');

  useEffect(() => {
    if (urlBookingId) {
      setBookingIdInput(urlBookingId);
    }
  }, [urlBookingId]);

  const verifyAndFetchReport = async () => {
    if (!bookingIdInput.trim()) {
      toast.error('Please enter your Booking ID');
      return;
    }
    if (!phoneInput.trim() || phoneInput.length < 10) {
      toast.error('Please enter valid phone number');
      return;
    }

    setVerifying(true);
    setError('');
    
    try {
      const res = await fetch(`${API}/api/proton/report/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingIdInput.trim().toUpperCase(),
          phone: phoneInput.replace(/\D/g, '').slice(-10),
          dob: dobInput || undefined
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.report) {
        setReport(data.report);
        setVerified(true);
        toast.success('Verification successful!');
      } else {
        setError(data.detail || 'Report not found or verification failed');
        toast.error(data.detail || 'Verification failed');
      }
    } catch (err) {
      setError('Failed to verify. Please try again.');
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const downloadReport = async () => {
    if (!report?.report_url) {
      toast.error('Report file not available');
      return;
    }
    
    setLoading(true);
    try {
      // Open report URL in new tab
      window.open(report.report_url, '_blank');
      toast.success('Report download started');
      
      // Log download
      await fetch(`${API}/api/proton/report/log-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingIdInput })
      }).catch(() => {});
    } catch (err) {
      toast.error('Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mango')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src="/mango-logo.png" alt="Mango Health Labs" className="w-14 h-14 rounded-xl bg-white p-1.5 shadow-sm" />
            <div>
              <h1 className="font-bold text-slate-800">Mango Health Labs</h1>
              <p className="text-xs text-slate-500">Report Download</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {!verified ? (
          /* Verification Form */
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Download Your Report</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Enter your details to securely access your lab report
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label>Booking ID *</Label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="e.g., PRO-20260129-001"
                    className="pl-10 uppercase"
                    value={bookingIdInput}
                    onChange={(e) => setBookingIdInput(e.target.value.toUpperCase())}
                    data-testid="report-booking-id"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Found in your booking confirmation</p>
              </div>

              <div>
                <Label>Registered Phone Number *</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="10-digit mobile number"
                    className="pl-10"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    maxLength={10}
                    data-testid="report-phone"
                  />
                </div>
              </div>

              <div>
                <Label>Date of Birth (Optional)</Label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="date"
                    className="pl-10"
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    data-testid="report-dob"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                onClick={verifyAndFetchReport}
                disabled={verifying}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 py-6 text-lg"
                data-testid="verify-report-btn"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Verify & Access Report
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-400">
                🔒 Your data is secure and encrypted
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Report Details & Download */
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl text-green-700">Report Ready!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient Info */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Patient Name</p>
                    <p className="font-semibold text-slate-800">{report?.patient_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Booking ID</p>
                    <p className="font-mono font-semibold text-slate-800">{report?.booking_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TestTube className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Tests</p>
                    <p className="font-semibold text-slate-800">{report?.tests || 'Lab Test'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Report Date</p>
                    <p className="font-semibold text-slate-800">{report?.report_date || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`p-3 rounded-xl text-center ${
                report?.status === 'ready' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-amber-50 border border-amber-200'
              }`}>
                <p className={`text-sm font-semibold ${
                  report?.status === 'ready' ? 'text-green-700' : 'text-amber-700'
                }`}>
                  {report?.status === 'ready' ? '✅ Report is ready for download' : '⏳ Report is being processed'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {report?.report_url ? (
                  <>
                    <Button
                      onClick={downloadReport}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 py-6 text-lg"
                      data-testid="download-report-btn"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5 mr-2" />
                      )}
                      Download Report (PDF)
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => window.open(report.report_url, '_blank')}
                      className="w-full py-5"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      View Report Online
                    </Button>
                  </>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-xl text-center">
                    <Clock className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                    <p className="text-amber-700 font-medium">Report is being processed</p>
                    <p className="text-sm text-amber-600 mt-1">Please check back later</p>
                  </div>
                )}

                <Button
                  variant="ghost"
                  onClick={() => { setVerified(false); setReport(null); }}
                  className="w-full"
                >
                  Check Another Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <div className="mt-6 p-4 bg-white rounded-xl shadow-sm text-center">
          <p className="text-sm text-slate-600">
            Need help? Contact Mango Health Labs
          </p>
          <a href="tel:+919876543210" className="text-blue-600 font-semibold text-sm hover:underline">
            📞 Call Support
          </a>
        </div>
      </main>
    </div>
  );
};

export default ProtonReportDownload;
