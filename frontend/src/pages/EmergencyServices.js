import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, AlertTriangle, Phone, MapPin, Hospital, Ambulance,
  Shield, Heart, Siren, Navigation, Star, Clock, CheckCircle,
  AlertCircle, User, Users, Droplet, Pill, FileText, QrCode,
  Share2, Loader2, Plus, Edit, Trash2, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const EmergencyServices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sos');
  const [loading, setLoading] = useState(false);
  const [medicalId, setMedicalId] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [ambulanceServices, setAmbulanceServices] = useState([]);
  const [showEditMedicalId, setShowEditMedicalId] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [location, setLocation] = useState(null);
  
  // Medical ID form state
  const [medicalIdForm, setMedicalIdForm] = useState({
    blood_group: '',
    allergies: [],
    medical_conditions: [],
    current_medications: [],
    emergency_contacts: [],
    organ_donor: false,
    doctor_name: '',
    doctor_phone: '',
    notes: ''
  });
  
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '' });
  const [newContact, setNewContact] = useState({ name: '', relation: '', phone: '' });
  
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  useEffect(() => {
    fetchData();
    getCurrentLocation();
  }, [user]);
  
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location error:', error);
        }
      );
    }
  };
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [hospitalsRes, ambulanceRes] = await Promise.all([
        axios.get(`${API}/emergency/hospitals`, {
          params: location ? { latitude: location.latitude, longitude: location.longitude } : {}
        }),
        axios.get(`${API}/emergency/ambulance-services`)
      ]);
      
      setHospitals(hospitalsRes.data?.hospitals || []);
      setAmbulanceServices(ambulanceRes.data?.services || []);
      
      if (user?.id) {
        const medicalIdRes = await axios.get(`${API}/emergency/medical-id/${user.id}`);
        setMedicalId(medicalIdRes.data);
        setMedicalIdForm({
          blood_group: medicalIdRes.data?.blood_group || '',
          allergies: medicalIdRes.data?.allergies || [],
          medical_conditions: medicalIdRes.data?.medical_conditions || [],
          current_medications: medicalIdRes.data?.current_medications || [],
          emergency_contacts: medicalIdRes.data?.emergency_contacts || [],
          organ_donor: medicalIdRes.data?.organ_donor || false,
          doctor_name: medicalIdRes.data?.doctor_name || '',
          doctor_phone: medicalIdRes.data?.doctor_phone || '',
          notes: medicalIdRes.data?.notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };
  
  const handleSOS = async () => {
    if (!user?.id) {
      toast.error('Please login to use SOS feature');
      return;
    }
    
    if (!location) {
      toast.error('Unable to get your location. Please enable location services.');
      getCurrentLocation();
      return;
    }
    
    setSosTriggered(true);
    
    try {
      const response = await axios.post(`${API}/emergency/sos/${user.id}`, {
        latitude: location.latitude,
        longitude: location.longitude,
        message: 'Emergency! I need immediate help!'
      });
      
      setSosResult(response.data);
      toast.success('SOS Alert Sent! Emergency contacts notified.');
    } catch (error) {
      toast.error('Failed to send SOS. Please call 108 directly.');
      console.error(error);
    }
  };
  
  const saveMedicalId = async () => {
    if (!user?.id) {
      toast.error('Please login to save Medical ID');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/emergency/medical-id/${user.id}`, medicalIdForm);
      toast.success('Medical ID saved successfully!');
      setShowEditMedicalId(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save Medical ID');
    }
    setLoading(false);
  };
  
  const addAllergy = () => {
    if (newAllergy.trim()) {
      setMedicalIdForm(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };
  
  const addCondition = () => {
    if (newCondition.trim()) {
      setMedicalIdForm(prev => ({
        ...prev,
        medical_conditions: [...prev.medical_conditions, newCondition.trim()]
      }));
      setNewCondition('');
    }
  };
  
  const addMedication = () => {
    if (newMedication.name.trim()) {
      setMedicalIdForm(prev => ({
        ...prev,
        current_medications: [...prev.current_medications, { ...newMedication }]
      }));
      setNewMedication({ name: '', dosage: '', frequency: '' });
    }
  };
  
  const addEmergencyContact = () => {
    if (newContact.name.trim() && newContact.phone.trim()) {
      setMedicalIdForm(prev => ({
        ...prev,
        emergency_contacts: [...prev.emergency_contacts, { ...newContact }]
      }));
      setNewContact({ name: '', relation: '', phone: '' });
    }
  };
  
  const removeItem = (field, index) => {
    setMedicalIdForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };
  
  const callEmergency = (number) => {
    window.location.href = `tel:${number}`;
  };
  
  const openMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <header className="bg-red-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-red-500">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Siren className="w-6 h-6" />
                  Emergency Services
                </h1>
                <p className="text-red-100 text-sm">SOS, Medical ID & Emergency Help</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Emergency Numbers */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            onClick={() => callEmergency('108')} 
            className="bg-red-600 hover:bg-red-700 h-16 flex flex-col gap-1"
            data-testid="call-108-btn"
          >
            <Phone className="w-5 h-5" />
            <span className="text-sm font-bold">108</span>
          </Button>
          <Button 
            onClick={() => callEmergency('102')} 
            className="bg-pink-600 hover:bg-pink-700 h-16 flex flex-col gap-1"
            data-testid="call-102-btn"
          >
            <Heart className="w-5 h-5" />
            <span className="text-sm font-bold">102</span>
          </Button>
          <Button 
            onClick={() => callEmergency('112')} 
            className="bg-orange-600 hover:bg-orange-700 h-16 flex flex-col gap-1"
            data-testid="call-112-btn"
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm font-bold">112</span>
          </Button>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="sos" className="text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" />
              SOS
            </TabsTrigger>
            <TabsTrigger value="medical-id" className="text-xs sm:text-sm">
              <FileText className="w-4 h-4 mr-1" />
              Medical ID
            </TabsTrigger>
            <TabsTrigger value="hospitals" className="text-xs sm:text-sm">
              <Hospital className="w-4 h-4 mr-1" />
              Hospitals
            </TabsTrigger>
            <TabsTrigger value="ambulance" className="text-xs sm:text-sm">
              <Ambulance className="w-4 h-4 mr-1" />
              Ambulance
            </TabsTrigger>
          </TabsList>
          
          {/* SOS Tab */}
          <TabsContent value="sos" className="mt-4 space-y-4">
            {!sosTriggered ? (
              <Card className="border-red-200">
                <CardContent className="p-6 text-center">
                  <div className="mb-6">
                    <div className="w-32 h-32 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                      <Siren className="w-16 h-16 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Emergency SOS</h2>
                    <p className="text-gray-600 mt-2">
                      Press the button below to send an emergency alert with your location to your emergency contacts.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleSOS}
                    className="w-full h-20 text-xl bg-red-600 hover:bg-red-700 rounded-xl"
                    disabled={!user}
                    data-testid="sos-button"
                  >
                    <AlertTriangle className="w-8 h-8 mr-3" />
                    SEND SOS ALERT
                  </Button>
                  
                  {!user && (
                    <p className="text-sm text-orange-600 mt-4">
                      Please login to use SOS feature
                    </p>
                  )}
                  
                  {location && (
                    <p className="text-sm text-green-600 mt-4 flex items-center justify-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Location detected
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-green-800">SOS Alert Sent!</h2>
                    <p className="text-green-600">Emergency contacts have been notified</p>
                  </div>
                  
                  {sosResult && (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Alert Details</h3>
                        <p className="text-sm text-gray-600">Alert ID: {sosResult.alert_id}</p>
                        <p className="text-sm text-gray-600">Contacts notified: {sosResult.contacts_notified}</p>
                        <a 
                          href={sosResult.location_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View location on map
                        </a>
                      </div>
                      
                      {sosResult.nearby_hospitals?.length > 0 && (
                        <div className="bg-white p-4 rounded-lg">
                          <h3 className="font-semibold mb-2">Nearest Hospital</h3>
                          <p className="font-medium">{sosResult.nearby_hospitals[0].name}</p>
                          <p className="text-sm text-gray-600">{sosResult.nearby_hospitals[0].address}</p>
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={() => callEmergency(sosResult.nearby_hospitals[0].emergency_phone)}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call Hospital
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => { setSosTriggered(false); setSosResult(null); }}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    Reset
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Medical ID Tab */}
          <TabsContent value="medical-id" className="mt-4 space-y-4">
            {user ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-600" />
                        Medical ID Card
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowEditMedicalId(true)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* User Info */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <User className="w-10 h-10" />
                        <div>
                          <h3 className="font-bold text-lg">{medicalId?.user_name || user?.name}</h3>
                          <p className="text-red-100">{medicalId?.user_phone || user?.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Droplet className="w-4 h-4" />
                          <span className="font-bold">{medicalId?.blood_group || 'Not set'}</span>
                        </div>
                        {medicalId?.organ_donor && (
                          <Badge className="bg-white text-red-600">Organ Donor</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Allergies */}
                    {medicalId?.allergies?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Allergies
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {medicalId.allergies.map((allergy, idx) => (
                            <Badge key={idx} variant="destructive">{allergy}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Medical Conditions */}
                    {medicalId?.medical_conditions?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          Medical Conditions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {medicalId.medical_conditions.map((condition, idx) => (
                            <Badge key={idx} variant="outline" className="border-orange-300">{condition}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Current Medications */}
                    {medicalId?.current_medications?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-1">
                          <Pill className="w-4 h-4" />
                          Current Medications
                        </h4>
                        <div className="space-y-1">
                          {medicalId.current_medications.map((med, idx) => (
                            <p key={idx} className="text-sm">
                              {med.name} - {med.dosage} ({med.frequency})
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Emergency Contacts */}
                    {medicalId?.emergency_contacts?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Emergency Contacts
                        </h4>
                        <div className="space-y-2">
                          {medicalId.emergency_contacts.map((contact, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div>
                                <p className="font-medium">{contact.name}</p>
                                <p className="text-sm text-gray-500">{contact.relation}</p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => callEmergency(contact.phone)}>
                                <Phone className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!medicalId?.is_complete && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          Your Medical ID is incomplete. Please add blood group and emergency contacts.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Create Your Medical ID</h3>
                  <p className="text-gray-600 mb-4">
                    Please login to create and manage your Medical ID card.
                  </p>
                  <Button onClick={() => navigate('/')}>Login</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Hospitals Tab */}
          <TabsContent value="hospitals" className="mt-4 space-y-3">
            {hospitals.map((hospital) => (
              <Card key={hospital.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Hospital className="w-4 h-4 text-red-500" />
                        {hospital.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{hospital.address}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">{hospital.type}</Badge>
                        {hospital.has_icu && <Badge className="bg-blue-100 text-blue-700">ICU</Badge>}
                        {hospital.has_ambulance && <Badge className="bg-green-100 text-green-700">Ambulance</Badge>}
                      </div>
                      {hospital.distance_km && (
                        <p className="text-sm text-gray-500 mt-2">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          {hospital.distance_km} km away
                        </p>
                      )}
                      <div className="flex items-center mt-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm ml-1">{hospital.rating}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => callEmergency(hospital.emergency_phone)}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openMaps(hospital.latitude, hospital.longitude)}
                      >
                        <Navigation className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          {/* Ambulance Tab */}
          <TabsContent value="ambulance" className="mt-4 space-y-3">
            {ambulanceServices.map((service) => (
              <Card key={service.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Ambulance className="w-4 h-4 text-red-500" />
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{service.type}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{service.response_time}</span>
                        {service.available_24x7 && (
                          <Badge className="bg-green-100 text-green-700">24/7</Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      className="bg-red-600 hover:bg-red-700 h-14 w-20"
                      onClick={() => callEmergency(service.phone)}
                    >
                      <div className="flex flex-col items-center">
                        <Phone className="w-5 h-5" />
                        <span className="text-sm font-bold">{service.phone}</span>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Edit Medical ID Dialog */}
      <Dialog open={showEditMedicalId} onOpenChange={setShowEditMedicalId}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medical ID</DialogTitle>
            <DialogDescription>
              Update your medical information for emergency situations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Blood Group */}
            <div>
              <Label>Blood Group</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {bloodGroups.map((bg) => (
                  <Button
                    key={bg}
                    type="button"
                    size="sm"
                    variant={medicalIdForm.blood_group === bg ? 'default' : 'outline'}
                    className={medicalIdForm.blood_group === bg ? 'bg-red-600' : ''}
                    onClick={() => setMedicalIdForm(prev => ({ ...prev, blood_group: bg }))}
                  >
                    {bg}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Allergies */}
            <div>
              <Label>Allergies</Label>
              <div className="flex gap-2 mt-2">
                <Input 
                  placeholder="Add allergy" 
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                />
                <Button type="button" onClick={addAllergy}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {medicalIdForm.allergies.map((allergy, idx) => (
                  <Badge key={idx} variant="destructive" className="cursor-pointer" onClick={() => removeItem('allergies', idx)}>
                    {allergy} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Medical Conditions */}
            <div>
              <Label>Medical Conditions</Label>
              <div className="flex gap-2 mt-2">
                <Input 
                  placeholder="Add condition" 
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                />
                <Button type="button" onClick={addCondition}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {medicalIdForm.medical_conditions.map((condition, idx) => (
                  <Badge key={idx} variant="outline" className="cursor-pointer" onClick={() => removeItem('medical_conditions', idx)}>
                    {condition} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Medications */}
            <div>
              <Label>Current Medications</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Input 
                  placeholder="Medicine name" 
                  value={newMedication.name}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input 
                  placeholder="Dosage" 
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                />
                <Input 
                  placeholder="Frequency" 
                  value={newMedication.frequency}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
                />
              </div>
              <Button type="button" size="sm" onClick={addMedication} className="mt-2">
                <Plus className="w-4 h-4 mr-1" /> Add Medication
              </Button>
              <div className="mt-2 space-y-1">
                {medicalIdForm.current_medications.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{med.name} - {med.dosage} ({med.frequency})</span>
                    <Button size="sm" variant="ghost" onClick={() => removeItem('current_medications', idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Emergency Contacts */}
            <div>
              <Label>Emergency Contacts</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Input 
                  placeholder="Name" 
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input 
                  placeholder="Relation" 
                  value={newContact.relation}
                  onChange={(e) => setNewContact(prev => ({ ...prev, relation: e.target.value }))}
                />
                <Input 
                  placeholder="Phone" 
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <Button type="button" size="sm" onClick={addEmergencyContact} className="mt-2">
                <Plus className="w-4 h-4 mr-1" /> Add Contact
              </Button>
              <div className="mt-2 space-y-1">
                {medicalIdForm.emergency_contacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{contact.name} ({contact.relation}) - {contact.phone}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeItem('emergency_contacts', idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Doctor Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Doctor Name</Label>
                <Input 
                  placeholder="Dr. Name" 
                  value={medicalIdForm.doctor_name}
                  onChange={(e) => setMedicalIdForm(prev => ({ ...prev, doctor_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Doctor Phone</Label>
                <Input 
                  placeholder="Phone" 
                  value={medicalIdForm.doctor_phone}
                  onChange={(e) => setMedicalIdForm(prev => ({ ...prev, doctor_phone: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Organ Donor */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="organ_donor"
                checked={medicalIdForm.organ_donor}
                onChange={(e) => setMedicalIdForm(prev => ({ ...prev, organ_donor: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="organ_donor">I am an organ donor</Label>
            </div>
            
            {/* Notes */}
            <div>
              <Label>Additional Notes</Label>
              <Input 
                placeholder="Any other important information" 
                value={medicalIdForm.notes}
                onChange={(e) => setMedicalIdForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <Button onClick={saveMedicalId} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Medical ID
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencyServices;
