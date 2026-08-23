import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Search, Package, Clock, CheckCircle2, 
  Loader2, Phone, FileText, Download, RefreshCw,
  Truck, FlaskConical, ClipboardList, AlertCircle, User
} from 'lucide-react';
import { DNAStrandProgress, PillJourneyProgress } from '@/components/HealthcareUX';

const API = process.env.REACT_APP_BACKEND_URL;

const OrderTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  
  const [trackingId, setTrackingId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const pollRef = useRef(null);

  const handleTrack = useCallback(async (silent = false) => {
    if (!trackingId.trim()) {
      if (!silent) toast.error('Please enter your Order/Booking ID');
      return;
    }
    if (!silent) { setLoading(true); setError(''); setTrackingData(null); }
    try {
      const res = await axios.get(`${API}/api/track/${trackingId.trim()}`);
      if (res.data.success) {
        setTrackingData(res.data);
        setError('');
      } else {
        if (!silent) setError(res.data.message || 'Order not found');
      }
    } catch {
      if (!silent) setError('Unable to find order. Please check the ID and try again.');
    }
    if (!silent) setLoading(false);
  }, [trackingId]);

  // Auto-track on mount if ID in URL
  useEffect(() => {
    if (initialId) handleTrack();
  }, []);

  // Auto-refresh every 30s when tracking is active
  useEffect(() => {
    if (trackingData && trackingData.current_status !== 'delivered' && trackingData.current_status !== 'cancelled') {
      pollRef.current = setInterval(() => handleTrack(true), 30000);
      return () => clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [trackingData, handleTrack]);

  // Countdown timer for ETA
  useEffect(() => {
    if (!trackingData?.eta) { setCountdown(null); return; }
    const calcCountdown = () => {
      const now = new Date();
      const eta = new Date(trackingData.eta);
      const diff = Math.max(0, Math.floor((eta - now) / 1000));
      if (diff <= 0) return null;
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      return { mins, secs, total: diff };
    };
    setCountdown(calcCountdown());
    const timer = setInterval(() => {
      const cd = calcCountdown();
      setCountdown(cd);
      if (!cd) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [trackingData?.eta]);

  const downloadReport = async () => {
    try {
      const res = await axios.get(`${API}/api/track/${trackingId}/report`);
      if (res.data.success && res.data.report_base64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${res.data.report_base64}`;
        link.download = res.data.filename || 'lab_report.pdf';
        link.click();
        toast.success('Report downloaded');
      }
    } catch { toast.error('Report not yet available'); }
  };

  const isPharmacy = trackingData?.tracking_type === 'pharmacy';
  const isLab = trackingData?.tracking_type === 'lab';
  const accentColor = isPharmacy ? '#ea580c' : '#16a34a';
  const accentBg = isPharmacy ? 'bg-orange-500' : 'bg-green-500';

  return (
    <div className="min-h-screen bg-gray-50" data-testid="order-tracking-page">
      {/* Header */}
      <div className="text-white px-4 py-5" style={{ background: accentColor }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-xl" data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-xl">Track Your Order</h1>
              <p className="text-sm text-white/70">Real-time status updates</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter Order ID or Booking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                className="pl-10 h-12 bg-white text-gray-900 border-0 rounded-xl shadow-sm"
                data-testid="tracking-input"
              />
            </div>
            <Button 
              onClick={() => handleTrack()} 
              disabled={loading}
              className="h-12 px-6 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur"
              data-testid="track-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Track'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {error && (
          <Card className="p-6 text-center border-red-200 bg-red-50 rounded-2xl">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
          </Card>
        )}

        {trackingData && (
          <>
            {/* Order Info */}
            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm" data-testid="order-info-card">
              <div className="p-4 text-white" style={{ backgroundColor: accentColor }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPharmacy ? <Package className="w-8 h-8" /> : <FlaskConical className="w-8 h-8" />}
                    <div>
                      <p className="text-xs text-white/70">{isPharmacy ? 'Pharmacy Order' : 'Lab Test Booking'}</p>
                      <p className="font-bold text-lg">#{trackingData.order_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">Total</p>
                    <p className="font-bold text-xl">&#8377;{trackingData.total_amount || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-semibold text-gray-800">{trackingData.customer_name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Order Date</p>
                    <p className="font-medium text-gray-700">
                      {trackingData.created_at ? new Date(trackingData.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                  <CheckCircle2 className="w-4 h-4" />
                  {trackingData.current_status_label}
                </div>
              </div>
            </Card>

            {/* Countdown Timer (when out for delivery) */}
            {countdown && (
              <Card className="p-4 rounded-2xl border-0 shadow-sm bg-white" data-testid="countdown-card">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Estimated Arrival</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
                      <span className="text-2xl font-black" style={{ color: accentColor }}>{String(countdown.mins).padStart(2, '0')}</span>
                      <span className="text-[9px] font-bold text-gray-400 -mt-0.5">MIN</span>
                    </div>
                    <span className="text-2xl font-black text-gray-300">:</span>
                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
                      <span className="text-2xl font-black" style={{ color: accentColor }}>{String(countdown.secs).padStart(2, '0')}</span>
                      <span className="text-[9px] font-bold text-gray-400 -mt-0.5">SEC</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Delivery Person Details */}
            {trackingData.delivery_partner && (
              <Card className="p-4 rounded-2xl border-0 shadow-sm bg-white" data-testid="delivery-person-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                      <Truck className="w-6 h-6" style={{ color: accentColor }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Delivery Partner</p>
                      <p className="font-bold text-gray-800">{trackingData.delivery_partner}</p>
                      {trackingData.delivery_contact && (
                        <p className="text-sm text-gray-500">{trackingData.delivery_contact}</p>
                      )}
                    </div>
                  </div>
                  {trackingData.delivery_contact && (
                    <a
                      href={`tel:${trackingData.delivery_contact}`}
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500 text-white shadow-lg active:scale-95 transition-transform"
                      data-testid="call-delivery-btn"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </Card>
            )}

            {/* Visual Progress */}
            <Card className="p-4 rounded-2xl border-0 shadow-sm bg-white">
              {isPharmacy ? (
                <>
                  <h3 className="text-xs font-bold text-orange-500 mb-2 uppercase tracking-wider">Delivery Progress</h3>
                  <PillJourneyProgress currentStep={trackingData.status_timeline?.filter(s => s.completed).length - 1 || 0} />
                </>
              ) : (
                <>
                  <h3 className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wider">Lab Progress</h3>
                  <DNAStrandProgress currentStep={trackingData.status_timeline?.filter(s => s.completed).length - 1 || 0} />
                </>
              )}
            </Card>

            {/* Status Timeline */}
            <Card className="p-4 rounded-2xl border-0 shadow-sm bg-white">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />Status Timeline
              </h3>
              <div className="relative">
                {trackingData.status_timeline?.map((status, index) => {
                  const isLast = index === trackingData.status_timeline.length - 1;
                  return (
                    <div key={status.key} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                          status.completed ? `${accentBg} text-white` : 'bg-gray-100 text-gray-400'
                        } ${status.current ? 'ring-4 ring-offset-2' : ''}`}
                          style={status.current ? { ringColor: `${accentColor}40` } : {}}>
                          {status.icon}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 mt-2 ${status.completed ? accentBg : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${status.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                          {status.label}
                        </p>
                        {status.timestamp && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(status.timestamp).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        )}
                        {status.current && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium"
                            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                            Current Status
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Items List */}
            {trackingData.items?.length > 0 && (
              <Card className="p-4 rounded-2xl border-0 shadow-sm bg-white">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  {isPharmacy ? 'Order Items' : 'Tests Booked'}
                </h3>
                <div className="space-y-0">
                  {trackingData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5" style={{ borderBottom: idx < trackingData.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <span className="text-sm text-gray-700 font-medium">{item.name || item}</span>
                      {item.qty && <span className="text-xs text-gray-400 font-semibold">x{item.qty}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Download Report (Lab only) */}
            {isLab && trackingData.report_available && (
              <Card className="p-4 bg-green-50 border-green-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Report Ready!</p>
                      <p className="text-sm text-green-600">Download your lab test report</p>
                    </div>
                  </div>
                  <Button onClick={downloadReport} className="bg-green-600 hover:bg-green-700 rounded-xl">
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>
              </Card>
            )}

            {/* Auto-refresh indicator + Manual refresh */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Auto-refreshing every 30s
              </p>
              <Button variant="outline" size="sm" onClick={() => handleTrack()} disabled={loading} className="rounded-xl">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </>
        )}

        {/* Initial State */}
        {!trackingData && !error && !loading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Search className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Track Your Order</h2>
            <p className="text-gray-500 mb-6">Enter your Order ID or Booking ID</p>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <Card className="p-4 text-center border-0 shadow-sm bg-white rounded-2xl">
                <Package className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                <p className="font-medium text-sm text-gray-700">Pharmacy</p>
                <p className="text-xs text-gray-400">ORD*, PHM*</p>
              </Card>
              <Card className="p-4 text-center border-0 shadow-sm bg-white rounded-2xl">
                <FlaskConical className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="font-medium text-sm text-gray-700">Lab Tests</p>
                <p className="text-xs text-gray-400">LAB*, MHL*</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
