import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { ArrowLeft, Calendar, FileText, Pill, User, Settings } from 'lucide-react';
import PushNotificationSettings from '@/components/PushNotificationSettings';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [appointmentsRes, diagnosticsRes, pharmacyRes] = await Promise.all([
        axios.get(`${API}/appointments`, { headers }),
        axios.get(`${API}/diagnostics`, { headers }),
        axios.get(`${API}/pharmacy`, { headers })
      ]);

      setAppointments(appointmentsRes.data);
      setDiagnostics(diagnosticsRes.data);
      setPharmacyOrders(pharmacyRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-heading text-2xl font-semibold">My Profile</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={logout}
              data-testid="logout-button"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-teal/10 flex items-center justify-center">
              <User className="w-8 h-8 text-brand-teal" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-semibold" data-testid="user-name">{user.name}</h2>
              <p className="font-body text-muted-foreground" data-testid="user-email">{user.email}</p>
              <p className="font-body text-muted-foreground" data-testid="user-phone">{user.phone}</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments" data-testid="appointments-tab">
              <Calendar className="w-4 h-4 mr-2" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="diagnostics" data-testid="diagnostics-tab">
              <FileText className="w-4 h-4 mr-2" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="pharmacy" data-testid="pharmacy-tab">
              <Pill className="w-4 h-4 mr-2" />
              Pharmacy
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="settings-tab">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-6">
            {loading ? (
              <p className="text-center py-8 font-body text-muted-foreground">Loading...</p>
            ) : appointments.length > 0 ? (
              <div className="space-y-4" data-testid="appointments-list">
                {appointments.map((appointment) => (
                  <Card key={appointment.id} className="p-6" data-testid={`appointment-${appointment.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-heading text-lg font-semibold mb-2">{appointment.doctor}</h3>
                        <p className="font-body text-sm text-muted-foreground mb-1">
                          <strong>Clinic:</strong> {appointment.clinic}
                        </p>
                        <p className="font-body text-sm text-muted-foreground mb-1">
                          <strong>Date:</strong> {appointment.date}
                        </p>
                        <p className="font-body text-sm text-muted-foreground">
                          <strong>Time:</strong> {appointment.time}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {appointment.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-body text-muted-foreground" data-testid="no-appointments-message">
                No appointments found
              </p>
            )}
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-6">
            {loading ? (
              <p className="text-center py-8 font-body text-muted-foreground">Loading...</p>
            ) : diagnostics.length > 0 ? (
              <div className="space-y-4" data-testid="diagnostics-list">
                {diagnostics.map((order) => (
                  <Card key={order.id} className="p-6" data-testid={`diagnostic-${order.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-heading text-lg font-semibold mb-2">Diagnostic Tests</h3>
                        <p className="font-body text-sm text-muted-foreground mb-2">
                          <strong>Preferred Date:</strong> {order.preferred_date}
                        </p>
                        <div className="font-body text-sm text-muted-foreground">
                          <strong>Tests:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {order.tests.map((test, idx) => (
                              <li key={idx}>{test}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {order.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-body text-muted-foreground" data-testid="no-diagnostics-message">
                No diagnostic orders found
              </p>
            )}
          </TabsContent>

          <TabsContent value="pharmacy" className="mt-6">
            {loading ? (
              <p className="text-center py-8 font-body text-muted-foreground">Loading...</p>
            ) : pharmacyOrders.length > 0 ? (
              <div className="space-y-4" data-testid="pharmacy-orders-list">
                {pharmacyOrders.map((order) => (
                  <Card key={order.id} className="p-6" data-testid={`pharmacy-order-${order.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-heading text-lg font-semibold mb-2">Medicine Order</h3>
                        <div className="font-body text-sm text-muted-foreground">
                          <strong>Medicines:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {order.medicines.map((med, idx) => (
                              <li key={idx}>{med.name} - Qty: {med.quantity}</li>
                            ))}
                          </ul>
                        </div>
                        {order.delivery_address && (
                          <p className="font-body text-sm text-muted-foreground mt-2">
                            <strong>Delivery:</strong> {order.delivery_address}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {order.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-body text-muted-foreground" data-testid="no-pharmacy-orders-message">
                No pharmacy orders found
              </p>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <PushNotificationSettings token={localStorage.getItem('token')} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
