import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Search, Package, TestTube, Clock, CheckCircle2, 
  Loader2, MapPin, Phone, FileText, Download, RefreshCw,
  Truck, FlaskConical, ClipboardList, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const OrderTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  
  const [trackingId, setTrackingId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState('');

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error('Please enter your Order/Booking ID');
      return;
    }
    
    setLoading(true);
    setError('');
    setTrackingData(null);
    
    try {
      const res = await axios.get(`${API}/api/track/${trackingId.trim()}`);
      if (res.data.success) {
        setTrackingData(res.data);
      } else {
        setError(res.data.message || 'Order not found');
      }
    } catch (err) {
      setError('Unable to find order. Please check the ID and try again.');
    }
    setLoading(false);
  };

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
    } catch (err) {
      toast.error('Report not yet available');
    }
  };

  const isPharmacy = trackingData?.tracking_type === 'pharmacy';
  const isLab = trackingData?.tracking_type === 'lab';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-xl">Track Your Order</h1>
              <p className="text-sm text-emerald-100">Pharmacy Orders & Lab Test Bookings</p>
            </div>
          </div>
          
          {/* Search Box */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Enter Order ID or Booking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                className="pl-10 h-12 bg-white text-slate-800 border-0"
                data-testid="tracking-input"
              />
            </div>
            <Button 
              onClick={handleTrack} 
              disabled={loading}
              className="h-12 px-6 bg-orange-500 hover:bg-orange-600"
              data-testid="track-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Track'}
            </Button>
          </div>
          
          <p className="text-xs text-emerald-200 mt-2">
            Example: ORD001, LAB001, PHM123
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Error State */}
        {error && (
          <Card className="p-6 text-center border-red-200 bg-red-50">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-red-500 mt-2">
              Check if you've entered the correct Order ID or Booking ID
            </p>
          </Card>
        )}

        {/* Tracking Results */}
        {trackingData && (
          <div className="space-y-4">
            {/* Order Info Card */}
            <Card className="overflow-hidden">
              <div className={`p-4 text-white ${isPharmacy ? 'bg-orange-500' : 'bg-teal-500'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPharmacy ? (
                      <Package className="w-8 h-8" />
                    ) : (
                      <FlaskConical className="w-8 h-8" />
                    )}
                    <div>
                      <p className="text-xs opacity-80">
                        {isPharmacy ? 'Pharmacy Order' : 'Lab Test Booking'}
                      </p>
                      <p className="font-bold text-lg">#{trackingData.order_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-80">Total Amount</p>
                    <p className="font-bold text-xl">₹{trackingData.total_amount || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="font-semibold">{trackingData.customer_name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Order Date</p>
                    <p className="font-medium">
                      {trackingData.created_at ? new Date(trackingData.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Current Status Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  isPharmacy ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">{trackingData.current_status_label}</span>
                </div>
              </div>
            </Card>

            {/* Status Timeline */}
            <Card className="p-4">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Status Timeline
              </h3>
              
              <div className="relative">
                {trackingData.status_timeline?.map((status, index) => {
                  const isLast = index === trackingData.status_timeline.length - 1;
                  const statusColor = status.completed 
                    ? (isPharmacy ? 'bg-orange-500' : 'bg-teal-500')
                    : 'bg-slate-200';
                  const textColor = status.completed 
                    ? 'text-slate-800' 
                    : 'text-slate-400';
                  
                  return (
                    <div key={status.key} className="flex gap-4 pb-6 last:pb-0">
                      {/* Timeline Line & Dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                          status.completed ? statusColor + ' text-white' : 'bg-slate-100'
                        } ${status.current ? 'ring-4 ring-offset-2 ' + (isPharmacy ? 'ring-orange-200' : 'ring-teal-200') : ''}`}>
                          {status.icon}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 mt-2 ${status.completed ? statusColor : 'bg-slate-200'}`} />
                        )}
                      </div>
                      
                      {/* Status Info */}
                      <div className={`flex-1 ${textColor}`}>
                        <p className={`font-semibold ${status.current ? (isPharmacy ? 'text-orange-600' : 'text-teal-600') : ''}`}>
                          {status.label}
                        </p>
                        {status.timestamp && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(status.timestamp).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        )}
                        {status.current && (
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                            isPharmacy ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'
                          }`}>
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
            {trackingData.items && trackingData.items.length > 0 && (
              <Card className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  {isPharmacy ? 'Order Items' : 'Tests Booked'}
                </h3>
                <div className="space-y-2">
                  {trackingData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-slate-700">{item.name || item}</span>
                      {item.qty && <span className="text-slate-500">x{item.qty}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Download Report Button (Lab only) */}
            {isLab && trackingData.report_available && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Your Report is Ready!</p>
                      <p className="text-sm text-green-600">Download your lab test report</p>
                    </div>
                  </div>
                  <Button onClick={downloadReport} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>
              </Card>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={handleTrack}
              className="w-full"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        )}

        {/* Initial State - No Search Yet */}
        {!trackingData && !error && !loading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <Search className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Track Your Order</h2>
            <p className="text-slate-500 mb-6">
              Enter your Order ID or Booking ID to see the current status
            </p>
            
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <Card className="p-4 text-center hover:shadow-md transition-shadow">
                <Package className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                <p className="font-medium text-slate-700">Pharmacy Orders</p>
                <p className="text-xs text-slate-400">ORD*, PHM*</p>
              </Card>
              <Card className="p-4 text-center hover:shadow-md transition-shadow">
                <FlaskConical className="w-8 h-8 mx-auto text-teal-500 mb-2" />
                <p className="font-medium text-slate-700">Lab Bookings</p>
                <p className="text-xs text-slate-400">LAB*, MHL*</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
