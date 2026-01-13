import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Phone, Calendar, Clock, Package, Stethoscope, Pill, TestTube, ChevronRight, CheckCircle, AlertCircle, Truck, PackageCheck, Home, ClipboardCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Order Timeline Component
const OrderTimeline = ({ status, type }) => {
  const pharmacySteps = [
    { key: 'Order Booked', label: 'Order Placed', icon: ClipboardCheck },
    { key: 'In Process', label: 'Packed', icon: Package },
    { key: 'Out for Delivery', label: 'Dispatched', icon: Truck },
    { key: 'Delivered', label: 'Delivered', icon: Home }
  ];
  
  const diagnosticSteps = [
    { key: 'Order Booked', label: 'Booked', icon: ClipboardCheck },
    { key: 'Sample Collected', label: 'Sample Collected', icon: PackageCheck },
    { key: 'In Process', label: 'Processing', icon: TestTube },
    { key: 'Reports Generated', label: 'Reports Ready', icon: CheckCircle }
  ];
  
  const steps = type === 'pharmacy' ? pharmacySteps : diagnosticSteps;
  const currentStepIndex = steps.findIndex(s => s.key === status);
  const isCancelled = status === 'Cancelled';
  
  if (isCancelled) {
    return (
      <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Order Cancelled
        </p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const Icon = step.icon;
          
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? type === 'pharmacy' ? 'bg-orange-500 text-white' : 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-offset-2 ring-orange-300' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] mt-1 text-center max-w-[60px] ${
                  isCompleted ? 'text-gray-700 font-medium' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded ${
                  idx < currentStepIndex 
                    ? type === 'pharmacy' ? 'bg-orange-500' : 'bg-purple-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const TrackOrder = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/guest/orders?phone=${phone}`);
      setOrders(response.data);
      setSearched(true);
      
      if (response.data.total_orders === 0) {
        toast.info('No orders found for this phone number');
      }
    } catch (error) {
      toast.error('Failed to fetch orders');
      setOrders(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Booked': 'bg-blue-100 text-blue-700',
      'In Clinic': 'bg-yellow-100 text-yellow-700',
      'Completed': 'bg-green-100 text-green-700',
      'Cancelled': 'bg-red-100 text-red-700',
      'Order Booked': 'bg-blue-100 text-blue-700',
      'In Process': 'bg-yellow-100 text-yellow-700',
      'Out for Delivery': 'bg-purple-100 text-purple-700',
      'Delivered': 'bg-green-100 text-green-700',
      'Sample Collected': 'bg-yellow-100 text-yellow-700',
      'Reports Generated': 'bg-green-100 text-green-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-heading font-bold text-xl text-brand-teal flex items-center gap-2">
              <Search className="w-5 h-5" />
              Track Your Orders
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Search Box */}
        <Card className="mb-8 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Enter Your Mobile Number</h2>
              <p className="text-muted-foreground text-sm">
                We'll find all your appointments and orders
              </p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">+91</span>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="pl-12 h-12 text-lg"
                  maxLength={10}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="track-phone-input"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={loading || phone.length < 10}
                className="h-12 px-6 bg-brand-teal hover:bg-brand-teal/90"
                data-testid="track-search-btn"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && orders && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Found <span className="font-semibold text-foreground">{orders.total_orders}</span> order(s) for 
                <span className="font-semibold text-foreground"> +91 {orders.phone}</span>
              </p>
            </div>

            {/* Appointments */}
            {orders.appointments?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  DiaGyn Appointments ({orders.appointments.length})
                </h3>
                <div className="space-y-3">
                  {orders.appointments.map((apt, idx) => (
                    <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-blue-700">{apt.doctor}</p>
                            <p className="text-sm text-muted-foreground">{apt.clinic}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(apt.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {apt.time}
                              </span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pharmacy Orders */}
            {orders.pharmacy_orders?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-orange-600" />
                  Pharmacy Orders ({orders.pharmacy_orders.length})
                </h3>
                <div className="space-y-3">
                  {orders.pharmacy_orders.map((order, idx) => (
                    <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-orange-700">
                              {order.medicines?.length || 0} Medicine(s)
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {order.medicines?.map(m => m.name).join(', ') || 'See prescription'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Order ID: {order.id?.slice(0, 8)}...
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        {/* Order Timeline */}
                        <OrderTimeline status={order.status} type="pharmacy" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostic Orders */}
            {orders.diagnostic_orders?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-purple-600" />
                  Diagnostic Orders ({orders.diagnostic_orders.length})
                </h3>
                <div className="space-y-3">
                  {orders.diagnostic_orders.map((order, idx) => (
                    <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-purple-700">
                              {order.tests?.length || 0} Test(s)
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {order.tests?.join(', ') || 'See prescription'}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>Preferred: {formatDate(order.preferred_date)}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        {/* Order Timeline */}
                        <OrderTimeline status={order.status} type="diagnostic" />
                        {order.report_url && (
                          <a 
                            href={order.report_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Download Report
                            <ChevronRight className="w-4 h-4" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* No Orders */}
            {orders.total_orders === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                  <p className="text-muted-foreground mb-6">
                    We couldn't find any orders with this phone number.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => navigate('/diagyn')} variant="outline">
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                    <Button onClick={() => navigate('/pharmacy')} className="bg-brand-orange hover:bg-brand-orange/90">
                      <Pill className="w-4 h-4 mr-2" />
                      Order Medicines
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Initial State */}
        {!searched && (
          <div className="text-center py-12">
            <Package className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Track Your Orders</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Enter your mobile number to view all your appointments, medicine orders, and diagnostic test bookings.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TrackOrder;
