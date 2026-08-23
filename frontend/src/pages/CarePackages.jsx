import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft, Heart, Shield, Activity, Users, Zap,
  Check, ChevronRight, FlaskConical, Stethoscope, Pill,
  Clock, Star, Loader2, CreditCard, HeartPulse, Baby
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const packageIcons = {
  activity: Activity, shield: Shield, heart: Heart, users: Users,
  'heart-pulse': HeartPulse, baby: Baby, zap: Zap
};

const typeIcons = {
  lab_test: FlaskConical, consultation: Stethoscope, medicine: Pill,
  imaging: Activity, digital: Zap, special: Star
};

const CarePackages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    fetchPackages();
    if (user?.phone) fetchMyEnrollments();
    // Check for payment return
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (orderId) {
      fetch(`${API}/api/payments/cashfree/verify/${orderId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.care_package) {
            setPaymentSuccess(data.care_package);
            toast.success(`Enrolled in ${data.care_package.package_name}!`);
            fetchMyEnrollments();
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${API}/api/care-packages/list`);
      setPackages(res.data.packages || []);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchMyEnrollments = async () => {
    try {
      const res = await axios.get(`${API}/api/care-packages/enrollments/list?phone=${user.phone}`);
      setMyEnrollments(res.data.enrollments || []);
    } catch (e) { /* silent */ }
  };

  const handleEnroll = async (pkg) => {
    if (!user) {
      toast.error('Please sign in to enroll');
      return;
    }
    setEnrolling(true);
    try {
      // Step 1: Create enrollment record
      const enrollRes = await axios.post(`${API}/api/care-packages/enroll`, {
        patient_name: user.name || user.patient_name || '',
        patient_phone: user.phone || '',
        patient_email: user.email || '',
        package_id: pkg.id,
        payment_method: 'online'
      });

      if (!enrollRes.data.success) {
        toast.error('Enrollment failed');
        return;
      }

      const enrollmentId = enrollRes.data.enrollment.id;

      // Step 2: Create Cashfree order
      const payRes = await fetch(`${API}/api/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `CP_${Date.now()}`,
          customer_name: (user.name || user.patient_name || '').trim(),
          customer_email: user.email || `${user.phone}@nevikacura.com`,
          customer_phone: (user.phone || '').replace(/\D/g, ''),
          amount: pkg.price,
          product_type: 'care_package',
          product_id: enrollmentId,
          return_url: `${window.location.origin}/care-programs?order_id=`,
        }),
      });
      const payData = await payRes.json();

      if (payData.success && payData.payment_session_id) {
        toast.success('Redirecting to payment...');
        if (window.Cashfree) {
          const cashfree = window.Cashfree({ mode: 'production' });
          cashfree.checkout({ paymentSessionId: payData.payment_session_id, redirectTarget: '_self' });
        } else {
          window.location.href = payData.payment_link || '#';
        }
      } else {
        toast.error(payData.detail || 'Payment setup failed');
      }
    } catch (e) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24" data-testid="care-packages-page">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => selectedPkg ? setSelectedPkg(null) : navigate(-1)} className="p-2 rounded-full bg-white/10"
            data-testid="care-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{selectedPkg ? selectedPkg.name : 'Care Programs'}</h1>
        </div>
        {!selectedPkg && (
          <p className="text-sm text-white/70">Comprehensive health programs at bundled prices. Save up to 40% vs individual services.</p>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Payment Success State */}
        {paymentSuccess && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-200 text-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Enrollment Confirmed!</h2>
            <p className="text-sm text-gray-500 mb-3">Welcome to {paymentSuccess.package_name}</p>
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Program</span>
                <span className="font-medium text-gray-800">{paymentSuccess.package_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valid until</span>
                <span className="font-medium text-gray-800">{paymentSuccess.end_date ? new Date(paymentSuccess.end_date).toLocaleDateString('en-IN') : ''}</span>
              </div>
            </div>
            <button onClick={() => { setPaymentSuccess(null); navigate('/care-programs'); }}
              className="mt-4 px-6 py-2 bg-teal-500 text-white font-medium rounded-xl text-sm"
              data-testid="care-success-continue">
              View My Programs
            </button>
          </div>
        )}

        {/* My Active Enrollments */}
        {!selectedPkg && myEnrollments.filter(e => e.status === 'active').length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">My Active Programs</h3>
            {myEnrollments.filter(e => e.status === 'active').map(e => (
              <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border border-green-200 mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{e.package_name}</p>
                    <p className="text-xs text-gray-500">Enrolled {new Date(e.start_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">Active</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  Expires {new Date(e.end_date).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Package Detail */}
        {selectedPkg ? (
          <div className="space-y-4">
            {/* Price Card */}
            <div className={`bg-gradient-to-br ${selectedPkg.color} rounded-2xl p-5 text-white`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-white/70 uppercase tracking-wider">{selectedPkg.billing_period}</p>
                  <p className="text-3xl font-bold mt-1">Rs.{selectedPkg.price.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 rounded-xl px-3 py-1.5">
                  <p className="text-xs font-bold">Save {selectedPkg.savings_percent}%</p>
                  <p className="text-[10px] text-white/70 line-through">Rs.{selectedPkg.original_value.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-sm text-white/80 mt-2">{selectedPkg.description}</p>
            </div>

            {/* What's Included */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">What's Included</h3>
              <div className="space-y-3">
                {selectedPkg.includes.map((item, i) => {
                  const TypeIcon = typeIcons[item.type] || Check;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <TypeIcon className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{item.frequency}</span>
                          {item.value > 0 && <span className="text-xs text-gray-400">Worth Rs.{item.value}</span>}
                        </div>
                      </div>
                      <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enroll Button */}
            <button onClick={() => handleEnroll(selectedPkg)} disabled={enrolling}
              className={`w-full py-3.5 bg-gradient-to-r ${selectedPkg.color} text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50`}
              data-testid="care-enroll-btn">
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Enroll for Rs.{selectedPkg.price.toLocaleString()}/{selectedPkg.billing_period}
            </button>
          </div>
        ) : (
          /* Package List */
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Available Programs</h3>
            {packages.map(pkg => {
              const PkgIcon = packageIcons[pkg.icon] || Heart;
              return (
                <button key={pkg.id} onClick={() => setSelectedPkg(pkg)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
                  data-testid={`care-package-${pkg.id}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${pkg.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <PkgIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{pkg.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{pkg.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-bold text-gray-800">Rs.{pkg.price.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 line-through">Rs.{pkg.original_value.toLocaleString()}</span>
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">Save {pkg.savings_percent}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-3" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CarePackages;
