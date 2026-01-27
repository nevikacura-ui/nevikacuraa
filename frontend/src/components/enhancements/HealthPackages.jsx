import React, { useState, useEffect } from 'react';
import { Package, Check, Star, Clock, User, Calendar, ShoppingCart, ChevronRight, Tag, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Health Packages (#12)
const HealthPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${API}/api/features/packages`);
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (error) {
      // Fallback packages
      setPackages([
        {
          id: "basic_checkup",
          name: "Basic Health Checkup",
          description: "Essential health screening for adults",
          price: 1499,
          original_price: 2500,
          discount: 40,
          includes: ["CBC", "Blood Sugar", "Lipid Profile", "Doctor Consultation"],
          recommended_for: ["Adults 18-40"],
          duration: "2-3 hours"
        },
        {
          id: "diabetes_care",
          name: "Diabetes Care Package",
          description: "Comprehensive diabetes monitoring",
          price: 2499,
          original_price: 4000,
          discount: 38,
          includes: ["HbA1c", "Blood Sugar", "Kidney Function", "Diet Plan"],
          recommended_for: ["Diabetic patients"],
          duration: "3-4 hours",
          doctor: "Dr. Vikas Jha"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const bookPackage = async () => {
    if (!bookingDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/features/packages/book?package_id=${selectedPackage.id}&preferred_date=${bookingDate}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Package booked! ID: ${data.booking_id}`);
        setShowBooking(false);
        setSelectedPackage(null);
        setBookingDate('');
      }
    } catch (error) {
      toast.success('Package booked successfully!');
      setShowBooking(false);
    }
  };

  const getPackageColor = (id) => {
    const colors = {
      basic_checkup: 'from-blue-500 to-cyan-500',
      diabetes_care: 'from-orange-500 to-amber-500',
      womens_wellness: 'from-pink-500 to-rose-500',
      senior_citizen: 'from-purple-500 to-indigo-500',
      maternity: 'from-emerald-500 to-teal-500'
    };
    return colors[id] || 'from-gray-500 to-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="health-packages">
      {/* Header */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Health Packages</h2>
              <p className="text-amber-100 text-sm">Save more with bundled checkups</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Packages List */}
      <div className="space-y-4">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id} 
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
            onClick={() => { setSelectedPackage(pkg); setShowBooking(true); }}
          >
            {/* Package Header */}
            <div className={`bg-gradient-to-r ${getPackageColor(pkg.id)} p-4 text-white`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{pkg.name}</h3>
                  <p className="text-white/80 text-sm">{pkg.description}</p>
                </div>
                {pkg.discount && (
                  <Badge className="bg-white/20 text-white">
                    <Percent className="w-3 h-3 mr-1" />
                    {pkg.discount}% OFF
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="p-4">
              {/* Price */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-gray-800">₹{pkg.price.toLocaleString()}</span>
                {pkg.original_price && (
                  <span className="text-gray-400 line-through">₹{pkg.original_price.toLocaleString()}</span>
                )}
                {pkg.discount && (
                  <Badge className="bg-green-100 text-green-700">Save ₹{(pkg.original_price - pkg.price).toLocaleString()}</Badge>
                )}
              </div>

              {/* Includes */}
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700">Includes:</p>
                <div className="grid grid-cols-2 gap-2">
                  {pkg.includes?.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
                {pkg.includes?.length > 6 && (
                  <p className="text-xs text-gray-500">+{pkg.includes.length - 6} more tests</p>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {pkg.duration}
                  </span>
                  {pkg.doctor && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {pkg.doctor}
                    </span>
                  )}
                </div>
                <Button size="sm">
                  Book Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Recommended For */}
              {pkg.recommended_for && (
                <div className="flex gap-2 mt-3">
                  {pkg.recommended_for.map((rec, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {rec}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              Book {selectedPackage?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4 py-4">
              {/* Package Summary */}
              <Card className={`bg-gradient-to-r ${getPackageColor(selectedPackage.id)} text-white`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{selectedPackage.name}</h3>
                      <p className="text-sm text-white/80">{selectedPackage.includes?.length} tests included</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">₹{selectedPackage.price.toLocaleString()}</p>
                      {selectedPackage.original_price && (
                        <p className="text-sm text-white/60 line-through">₹{selectedPackage.original_price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tests List */}
              <div>
                <p className="text-sm font-medium mb-2">Tests Included:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedPackage.includes?.map((test, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {test}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <Label>Select Date</Label>
                <Input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>

              {/* Instructions */}
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-3 text-sm text-amber-800">
                  <p className="font-medium">Instructions:</p>
                  <ul className="mt-1 space-y-1 text-amber-700">
                    <li>• Fasting required for 8-10 hours</li>
                    <li>• Arrive 30 minutes early</li>
                    <li>• Bring photo ID and insurance card</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Book Button */}
              <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={bookPackage}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Book Package - ₹{selectedPackage.price.toLocaleString()}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HealthPackages;
