import React, { useState, useEffect } from 'react';
import { Package, Calendar, Check, Gift, ChevronRight, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// Package Deals / Health Packages (#12)
const HealthPackages = () => {
  const [packages, setPackages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'checkup', name: 'Health Checkups' },
    { id: 'maternity', name: 'Maternity' },
    { id: 'diabetes', name: 'Diabetes Care' },
    { id: 'cardiac', name: 'Heart Health' },
  ];

  const healthPackages = [
    {
      id: 1,
      name: 'Basic Health Checkup',
      category: 'checkup',
      originalPrice: 2500,
      discountedPrice: 1999,
      discount: 20,
      includes: ['Blood Test (CBC)', 'Urine Analysis', 'BMI Check', 'BP Check', 'Doctor Consultation'],
      validity: '1 year',
      popular: true,
      rating: 4.8,
      bookings: 1250
    },
    {
      id: 2,
      name: 'Complete Health Package',
      category: 'checkup',
      originalPrice: 5000,
      discountedPrice: 3999,
      discount: 20,
      includes: ['Full Body Checkup', 'ECG', 'X-Ray Chest', 'Thyroid Profile', 'Liver Function', 'Kidney Function', 'Doctor Consultation'],
      validity: '1 year',
      popular: true,
      rating: 4.9,
      bookings: 890
    },
    {
      id: 3,
      name: 'Diabetes Care Package',
      category: 'diabetes',
      originalPrice: 3500,
      discountedPrice: 2799,
      discount: 20,
      includes: ['HbA1c', 'Fasting Blood Sugar', 'PP Blood Sugar', 'Lipid Profile', 'Kidney Function', '3 Doctor Consultations'],
      validity: '6 months',
      popular: false,
      rating: 4.7,
      bookings: 560
    },
    {
      id: 4,
      name: 'Maternity Care Bundle',
      category: 'maternity',
      originalPrice: 25000,
      discountedPrice: 19999,
      discount: 20,
      includes: ['9 Prenatal Checkups', '3 Ultrasounds', 'Blood Tests', 'Delivery Package', 'Postnatal Care'],
      validity: '9 months',
      popular: true,
      rating: 4.9,
      bookings: 320
    },
    {
      id: 5,
      name: 'Cardiac Health Package',
      category: 'cardiac',
      originalPrice: 4500,
      discountedPrice: 3599,
      discount: 20,
      includes: ['ECG', 'Echo', 'Lipid Profile', 'Blood Pressure Monitoring', 'Cardiologist Consultation'],
      validity: '1 year',
      popular: false,
      rating: 4.8,
      bookings: 445
    },
  ];

  const filteredPackages = selectedCategory === 'all' 
    ? healthPackages 
    : healthPackages.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-4" data-testid="health-packages">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-teal-600" />
          Health Packages
        </h2>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Package Cards */}
      <div className="space-y-4">
        {filteredPackages.map(pkg => (
          <Card key={pkg.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      {pkg.popular && (
                        <Badge className="bg-orange-500">Popular</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{pkg.rating}</span>
                      <span className="text-sm text-gray-500">• {pkg.bookings} bookings</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    {pkg.discount}% OFF
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-teal-600">₹{pkg.discountedPrice.toLocaleString()}</span>
                  <span className="text-gray-400 line-through">₹{pkg.originalPrice.toLocaleString()}</span>
                </div>

                {/* Includes */}
                <div className="space-y-1">
                  {pkg.includes.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                  {pkg.includes.length > 4 && (
                    <p className="text-sm text-teal-600 ml-6">+{pkg.includes.length - 4} more included</p>
                  )}
                </div>

                {/* Validity */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  Valid for {pkg.validity}
                </div>

                {/* CTA */}
                <Button className="w-full bg-teal-600 hover:bg-teal-700">
                  Book Now
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Package CTA */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Gift className="w-10 h-10 text-purple-600" />
            <div className="flex-1">
              <p className="font-semibold">Need a Custom Package?</p>
              <p className="text-sm text-gray-600">Create a personalized health package</p>
            </div>
            <Button variant="outline" className="border-purple-300 text-purple-600">
              Customize
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthPackages;
