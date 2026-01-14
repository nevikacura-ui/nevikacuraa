import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Calendar, FlaskConical, Pill, Loader2, 
  RefreshCw, Clock, MapPin, User, ChevronRight, Sparkles,
  Stethoscope, TestTube, ShoppingBag
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QuickReorder = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastDoctor, setLastDoctor] = useState(null);
  const [lastTests, setLastTests] = useState([]);
  const [lastMedicines, setLastMedicines] = useState([]);
  const [rebookingDoctor, setRebookingDoctor] = useState(false);
  const [reorderingTests, setReorderingTests] = useState(false);
  const [reorderingMeds, setReorderingMeds] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error('Please login to access Quick Reorder');
      navigate('/');
      return;
    }
    fetchLastOrders();
  }, [user, navigate]);

  const fetchLastOrders = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch last appointment
      const apptRes = await axios.get(`${API}/appointments`, { headers });
      const appointments = apptRes.data || [];
      const completedAppts = appointments.filter(a => 
        a.status === 'completed' || a.status === 'Completed'
      );
      if (completedAppts.length > 0) {
        setLastDoctor(completedAppts[0]);
      } else if (appointments.length > 0) {
        setLastDoctor(appointments[0]);
      }

      // Fetch last diagnostic order
      const testRes = await axios.get(`${API}/diagnostics`, { headers });
      const testOrders = testRes.data || [];
      if (testOrders.length > 0) {
        setLastTests(testOrders[0].tests || []);
      }

      // Fetch last pharmacy order
      const pharmaRes = await axios.get(`${API}/pharmacy`, { headers });
      const pharmaOrders = pharmaRes.data || [];
      if (pharmaOrders.length > 0) {
        setLastMedicines(pharmaOrders[0].medicines || pharmaOrders[0].items || []);
      }

    } catch (error) {
      console.error('Error fetching last orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRebookDoctor = () => {
    if (!lastDoctor) return;
    // Navigate to DiaGyn with pre-selected doctor
    navigate(`/diagyn?doctor=${encodeURIComponent(lastDoctor.doctor)}&clinic=${encodeURIComponent(lastDoctor.clinic)}`);
  };

  const handleReorderTests = async () => {
    if (lastTests.length === 0) return;
    setReorderingTests(true);
    try {
      // Add tests to cart and navigate
      const testNames = lastTests.map(t => t.name || t.test_name || t);
      sessionStorage.setItem('reorder_tests', JSON.stringify(testNames));
      toast.success('Tests added! Redirecting to checkout...');
      navigate('/proton?reorder=true');
    } catch (error) {
      toast.error('Failed to reorder tests');
    } finally {
      setReorderingTests(false);
    }
  };

  const handleReorderMedicines = async () => {
    if (lastMedicines.length === 0) return;
    setReorderingMeds(true);
    try {
      // Add medicines to cart and navigate
      sessionStorage.setItem('reorder_medicines', JSON.stringify(lastMedicines));
      toast.success('Medicines added to cart!');
      navigate('/pharmacy?reorder=true');
    } catch (error) {
      toast.error('Failed to reorder medicines');
    } finally {
      setReorderingMeds(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const hasAnyData = lastDoctor || lastTests.length > 0 || lastMedicines.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-green-800">Quick Reorder</h1>
            <p className="text-sm text-gray-500">One-tap to rebook & reorder</p>
          </div>
          <div className="ml-auto">
            <Sparkles className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {!hasAnyData ? (
          <Card className="p-8 text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700">No Previous Orders</h2>
            <p className="text-gray-500 mt-2">
              Book an appointment, order tests, or buy medicines to enable quick reorder.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Button onClick={() => navigate('/diagyn')} variant="outline">
                <Stethoscope className="w-4 h-4 mr-2" /> Book Doctor
              </Button>
              <Button onClick={() => navigate('/proton')} variant="outline">
                <TestTube className="w-4 h-4 mr-2" /> Book Tests
              </Button>
              <Button onClick={() => navigate('/pharmacy')} variant="outline">
                <ShoppingBag className="w-4 h-4 mr-2" /> Order Medicines
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Last Doctor Visit */}
            <Card className="overflow-hidden" data-testid="last-doctor-card">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <Stethoscope className="w-5 h-5" />
                  <span className="font-semibold">Last Doctor Visit</span>
                </div>
              </div>
              {lastDoctor ? (
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{lastDoctor.doctor}</h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                        <MapPin className="w-3 h-3" />
                        {lastDoctor.clinic}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                        <Clock className="w-3 h-3" />
                        {lastDoctor.date} at {lastDoctor.time}
                      </div>
                    </div>
                    <Button 
                      onClick={handleRebookDoctor}
                      disabled={rebookingDoctor}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="rebook-doctor-btn"
                    >
                      {rebookingDoctor ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Rebook
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>No previous doctor visits</p>
                  <Button variant="link" onClick={() => navigate('/diagyn')}>
                    Book your first appointment →
                  </Button>
                </div>
              )}
            </Card>

            {/* Last Tests */}
            <Card className="overflow-hidden" data-testid="last-tests-card">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <FlaskConical className="w-5 h-5" />
                  <span className="font-semibold">Last Lab Tests</span>
                </div>
              </div>
              {lastTests.length > 0 ? (
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        {lastTests.slice(0, 4).map((test, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                          >
                            {test.name || test.test_name || test}
                          </span>
                        ))}
                        {lastTests.length > 4 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            +{lastTests.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={handleReorderTests}
                      disabled={reorderingTests}
                      className="bg-purple-600 hover:bg-purple-700 ml-4"
                      data-testid="reorder-tests-btn"
                    >
                      {reorderingTests ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reorder
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>No previous test orders</p>
                  <Button variant="link" onClick={() => navigate('/proton')}>
                    Book your first test →
                  </Button>
                </div>
              )}
            </Card>

            {/* Last Medicines */}
            <Card className="overflow-hidden" data-testid="last-medicines-card">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <Pill className="w-5 h-5" />
                  <span className="font-semibold">Last Medicine Order</span>
                </div>
              </div>
              {lastMedicines.length > 0 ? (
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        {lastMedicines.slice(0, 4).map((med, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-sm"
                          >
                            {med.name || med.medicine_name || med}
                          </span>
                        ))}
                        {lastMedicines.length > 4 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            +{lastMedicines.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={handleReorderMedicines}
                      disabled={reorderingMeds}
                      className="bg-orange-600 hover:bg-orange-700 ml-4"
                      data-testid="reorder-meds-btn"
                    >
                      {reorderingMeds ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reorder
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>No previous medicine orders</p>
                  <Button variant="link" onClick={() => navigate('/pharmacy')}>
                    Order your first medicines →
                  </Button>
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => navigate('/diagyn')}
              >
                <Calendar className="w-5 h-5 mb-1 text-blue-600" />
                <span className="text-xs">New Appointment</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                onClick={() => navigate('/proton')}
              >
                <TestTube className="w-5 h-5 mb-1 text-purple-600" />
                <span className="text-xs">Book Tests</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col h-auto py-4 hover:bg-orange-50 hover:border-orange-300"
                onClick={() => navigate('/pharmacy')}
              >
                <ShoppingBag className="w-5 h-5 mb-1 text-orange-600" />
                <span className="text-xs">Order Meds</span>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default QuickReorder;
