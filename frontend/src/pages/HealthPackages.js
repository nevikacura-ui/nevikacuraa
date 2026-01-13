import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Heart, Check, Clock, FlaskConical, Home, 
  Loader2, Star, Percent, ChevronRight, Baby, User, 
  Activity, Stethoscope, ThermometerSun, Users, Shield
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Proton Health Packages (Featured)
const PROTON_PACKAGES = [
  {
    id: 'proton-basic',
    name: 'Proton Basic',
    description: 'Essential health screening for routine checkup',
    tests: ['Complete Blood Count', 'Blood Sugar Fasting', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test', 'Thyroid Profile', 'Urine Routine'],
    testsCount: '40+ Tests',
    category: 'general',
    icon: Activity
  },
  {
    id: 'proton-total',
    name: 'Proton Total',
    description: 'Comprehensive full body health checkup',
    tests: ['Complete Blood Count', 'HbA1c', 'Lipid Profile', 'Liver Function', 'Kidney Function', 'Thyroid Profile', 'Vitamin D', 'Vitamin B12', 'Iron Studies', 'Uric Acid'],
    testsCount: '70+ Tests',
    category: 'general',
    icon: Heart
  },
  {
    id: 'proton-xclusive',
    name: 'Proton Xclusive',
    description: 'Premium comprehensive health assessment',
    tests: ['Complete Blood Count', 'HbA1c', 'Lipid Profile', 'Liver Function', 'Kidney Function', 'Thyroid Complete', 'Vitamin Panel', 'Tumor Markers', 'Cardiac Risk Markers', 'Hormone Panel'],
    testsCount: '90+ Tests',
    category: 'general',
    icon: Shield
  },
  {
    id: 'diabetic-care',
    name: 'Diabetic Care',
    description: 'Complete diabetes monitoring package',
    tests: ['Fasting Blood Sugar', 'Post Prandial Blood Sugar', 'HbA1c', 'Fasting Insulin', 'Kidney Function', 'Lipid Profile', 'Urine Microalbumin'],
    testsCount: '35+ Tests',
    category: 'diabetes',
    icon: ThermometerSun
  },
  {
    id: 'womens-wellness',
    name: "Women's Wellness",
    description: 'Complete health checkup for women',
    tests: ['Complete Blood Count', 'Thyroid Profile', 'Vitamin D', 'Vitamin B12', 'Iron Studies', 'Calcium', 'Pap Smear', 'Mammography'],
    testsCount: '50+ Tests',
    category: 'women',
    icon: Heart
  },
  {
    id: 'cardiac-profile',
    name: 'Cardiac Profile',
    description: 'Heart health assessment package',
    tests: ['Lipid Profile', 'Apolipoprotein', 'hs-CRP', 'Homocysteine', 'ECG', 'Echo', 'Treadmill Test'],
    testsCount: '30+ Tests',
    category: 'cardiac',
    icon: Activity
  }
];

const HealthPackages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [recommendedPackages, setRecommendedPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patient_name: '',
    patient_phone: '',
    address: '',
    preferred_date: '',
    preferred_time: 'morning',
    home_collection: true,
    payment_method: 'cod'
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  
  const categoryIcons = {
    general: <Activity className="w-5 h-5" />,
    diabetes: <ThermometerSun className="w-5 h-5" />,
    women: <Heart className="w-5 h-5" />,
    pregnancy: <Baby className="w-5 h-5" />,
    cardiac: <Activity className="w-5 h-5" />,
    thyroid: <Stethoscope className="w-5 h-5" />,
    senior: <Users className="w-5 h-5" />
  };
  
  const categoryColors = {
    general: 'from-blue-500 to-blue-600',
    diabetes: 'from-orange-500 to-orange-600',
    women: 'from-pink-500 to-pink-600',
    pregnancy: 'from-purple-500 to-purple-600',
    cardiac: 'from-red-500 to-red-600',
    thyroid: 'from-teal-500 to-teal-600',
    senior: 'from-indigo-500 to-indigo-600'
  };
  
  useEffect(() => {
    fetchPackages();
  }, [user]);
  
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const [allRes, recRes] = await Promise.all([
        axios.get(`${API}/health-packages/all`),
        user?.id ? axios.get(`${API}/health-packages/recommended/${user.id}`).catch(() => ({ data: { recommended_packages: [] } })) : { data: { recommended_packages: [] } }
      ]);
      
      setPackages(allRes.data?.packages || []);
      setRecommendedPackages(recRes.data?.recommended_packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    }
    setLoading(false);
  };
  
  const handleBookPackage = async () => {
    if (!bookingForm.patient_name || !bookingForm.patient_phone || !bookingForm.address || !bookingForm.preferred_date) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!user?.id) {
      toast.error('Please login to book a package');
      return;
    }
    
    setBookingLoading(true);
    try {
      const response = await axios.post(`${API}/health-packages/book?user_id=${user.id}&package_id=${selectedPackage.id}`, bookingForm);
      
      toast.success('Package booked successfully!');
      setShowBooking(false);
      setSelectedPackage(null);
      navigate('/my-health');
    } catch (error) {
      toast.error('Failed to book package');
    }
    setBookingLoading(false);
  };
  
  const openBooking = (pkg) => {
    setSelectedPackage(pkg);
    setBookingForm({
      ...bookingForm,
      patient_name: user?.name || '',
      patient_phone: user?.phone || ''
    });
    setShowBooking(true);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-xl text-gray-900">Health Checkup Packages</h1>
                <p className="text-sm text-gray-500">Comprehensive health screening at discounted prices</p>
              </div>
            </div>
            <FlaskConical className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Recommended Packages */}
            {recommendedPackages.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Recommended for You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedPackages.map((pkg) => (
                    <Card key={pkg.id} className="overflow-hidden hover:shadow-lg transition-shadow border-2 border-yellow-200">
                      <div className={`bg-gradient-to-r ${categoryColors[pkg.category] || 'from-blue-500 to-blue-600'} p-4 text-white`}>
                        <div className="flex items-center justify-between">
                          {categoryIcons[pkg.category]}
                          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
                            {pkg.discount_percent}% OFF
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mt-2">{pkg.name}</h3>
                        <p className="text-sm opacity-90">{pkg.tests?.length} tests included</p>
                      </div>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-gray-400 line-through text-sm">₹{pkg.original_price}</span>
                          <span className="text-2xl font-bold text-green-600">₹{pkg.discounted_price}</span>
                        </div>
                        <Button className="w-full" onClick={() => openBooking(pkg)}>
                          Book Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* All Packages */}
            <div>
              <h2 className="text-lg font-semibold mb-4">All Health Packages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <Card key={pkg.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedPackage(pkg)}>
                    <div className={`bg-gradient-to-r ${categoryColors[pkg.category] || 'from-blue-500 to-blue-600'} p-4 text-white`}>
                      <div className="flex items-center justify-between">
                        {categoryIcons[pkg.category]}
                        <span className="bg-white/20 text-xs px-2 py-1 rounded">
                          {pkg.discount_percent}% OFF
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mt-2">{pkg.name}</h3>
                      <p className="text-sm opacity-90">{pkg.tests?.length} tests</p>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
                      
                      {/* Tests Preview */}
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {pkg.tests?.slice(0, 3).map((test, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{test}</span>
                          ))}
                          {pkg.tests?.length > 3 && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">+{pkg.tests.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-400 line-through text-sm">₹{pkg.original_price}</span>
                          <span className="text-xl font-bold text-green-600 ml-2">₹{pkg.discounted_price}</span>
                        </div>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); openBooking(pkg); }}>
                          Book
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Package Details Dialog */}
      <Dialog open={!!selectedPackage && !showBooking} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedPackage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPackage.name}</DialogTitle>
                <DialogDescription>{selectedPackage.description}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Price */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <span className="text-gray-500 line-through">₹{selectedPackage.original_price}</span>
                    <span className="text-2xl font-bold text-green-600 ml-2">₹{selectedPackage.discounted_price}</span>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Save {selectedPackage.discount_percent}%
                  </span>
                </div>
                
                {/* Tests Included */}
                <div>
                  <h4 className="font-semibold mb-2">Tests Included ({selectedPackage.tests?.length})</h4>
                  <div className="space-y-1">
                    {selectedPackage.tests?.map((test, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{test}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500 mb-1" />
                    <p className="text-sm font-medium">Report Time</p>
                    <p className="text-xs text-gray-500">{selectedPackage.report_time}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <FlaskConical className="w-4 h-4 text-gray-500 mb-1" />
                    <p className="text-sm font-medium">Fasting</p>
                    <p className="text-xs text-gray-500">{selectedPackage.fasting_required ? '10-12 hours required' : 'Not required'}</p>
                  </div>
                </div>
                
                {/* Recommended For */}
                {selectedPackage.recommended_for && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommended For</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPackage.recommended_for.map((rec, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{rec}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button className="w-full" onClick={() => { setShowBooking(true); }}>
                  Book This Package - ₹{selectedPackage.discounted_price}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book {selectedPackage?.name}</DialogTitle>
            <DialogDescription>Fill in your details for sample collection</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Patient Name *</label>
              <Input 
                value={bookingForm.patient_name}
                onChange={(e) => setBookingForm({...bookingForm, patient_name: e.target.value})}
                placeholder="Enter patient name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Phone Number *</label>
              <Input 
                value={bookingForm.patient_phone}
                onChange={(e) => setBookingForm({...bookingForm, patient_phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Address for Collection *</label>
              <Input 
                value={bookingForm.address}
                onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                placeholder="Enter complete address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Preferred Date *</label>
                <Input 
                  type="date"
                  value={bookingForm.preferred_date}
                  onChange={(e) => setBookingForm({...bookingForm, preferred_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preferred Time</label>
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={bookingForm.preferred_time}
                  onChange={(e) => setBookingForm({...bookingForm, preferred_time: e.target.value})}
                >
                  <option value="morning">Morning (7-10 AM)</option>
                  <option value="afternoon">Afternoon (12-3 PM)</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <input 
                type="checkbox"
                checked={bookingForm.home_collection}
                onChange={(e) => setBookingForm({...bookingForm, home_collection: e.target.checked})}
                className="w-4 h-4"
              />
              <div>
                <p className="font-medium text-sm">Home Sample Collection</p>
                <p className="text-xs text-gray-500">Phlebotomist will visit your address</p>
              </div>
              <Home className="w-5 h-5 text-blue-500 ml-auto" />
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Amount to Pay</p>
              <p className="text-2xl font-bold text-green-600">₹{selectedPackage?.discounted_price}</p>
              <p className="text-xs text-gray-500">Payment on collection (COD)</p>
            </div>
            
            <Button className="w-full" onClick={handleBookPackage} disabled={bookingLoading}>
              {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HealthPackages;
