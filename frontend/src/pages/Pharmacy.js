import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Upload, Plus, Minus, Trash2, Search, Pill, ShoppingCart, X, Package } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '+917039030030';

const Pharmacy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [forms, setForms] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  
  // Manual entry state
  const [manualMedicine, setManualMedicine] = useState({ name: '', quantity: 1 });

  // Fetch inventory on mount
  useEffect(() => {
    fetchInventory();
    fetchForms();
  }, []);

  // Fetch inventory when search/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedForm]);

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedForm) params.append('form', selectedForm);
      
      const response = await axios.get(`${API}/pharmacy/inventory?${params.toString()}`);
      setInventory(response.data.medicines);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API}/pharmacy/forms`);
      setForms(response.data.forms);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const addToCart = (medicine) => {
    const existingIndex = medicines.findIndex(m => m.name === medicine.name);
    if (existingIndex >= 0) {
      const updated = [...medicines];
      updated[existingIndex].quantity += 1;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { ...medicine, quantity: 1 }]);
    }
    toast.success(`Added ${medicine.name} to cart`);
  };

  const addManualMedicine = () => {
    if (!manualMedicine.name.trim()) {
      toast.error('Please enter medicine name');
      return;
    }
    
    const existingIndex = medicines.findIndex(m => m.name.toLowerCase() === manualMedicine.name.toLowerCase());
    if (existingIndex >= 0) {
      const updated = [...medicines];
      updated[existingIndex].quantity += manualMedicine.quantity;
      setMedicines(updated);
    } else {
      setMedicines([...medicines, { 
        name: manualMedicine.name.trim(), 
        quantity: manualMedicine.quantity,
        form: 'Manual Entry',
        company: 'Custom'
      }]);
    }
    toast.success(`Added ${manualMedicine.name} to cart`);
    setManualMedicine({ name: '', quantity: 1 });
  };

  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, quantity) => {
    if (quantity < 1) return;
    const updated = [...medicines];
    updated[index].quantity = quantity;
    setMedicines(updated);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPrescriptionFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user) {
        formData.append('user_id', user.id);
      }

      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(user && { Authorization: `Bearer ${localStorage.getItem('token')}` })
        }
      });

      setPrescriptionUrl(response.data.url);
      toast.success('Prescription uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload prescription');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (medicines.length === 0) {
      toast.error('Please add at least one medicine to cart');
      return;
    }

    if (!patientInfo.name || !patientInfo.phone) {
      toast.error('Please fill name and mobile number');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        medicines: medicines.map(m => ({ name: m.name, quantity: m.quantity })),
        prescription_url: prescriptionUrl || null,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_email: patientInfo.email || null,
        delivery_address: deliveryAddress || null
      };

      if (user) {
        await axios.post(`${API}/pharmacy`, orderData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      const medicinesList = medicines.map(m => `${m.name} (Qty: ${m.quantity})`).join('%0A• ');
      const whatsappMessage = `*New Orange Pharmacy Order*%0A%0A*Medicines:*%0A• ${medicinesList}%0A%0A${prescriptionUrl ? `*Prescription:* ${prescriptionUrl}%0A` : ''}${deliveryAddress ? `*Delivery Address:* ${deliveryAddress}%0A` : ''}%0A*Patient Details:*%0AName: ${patientInfo.name}%0APhone: ${patientInfo.phone}${patientInfo.email ? `%0AEmail: ${patientInfo.email}` : ''}`;
      
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`, '_blank');
      
      toast.success('Order sent via WhatsApp!');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to process order');
    } finally {
      setLoading(false);
    }
  };

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
              <img 
                src="https://customer-assets.emergentagent.com/job_healthcare-trio/artifacts/dvlg3alh_6_20260102_012214_0002.png" 
                alt="Orange Pharmacy" 
                className="h-16 w-auto"
                data-testid="pharmacy-logo"
              />
            </div>
            <Button 
              onClick={() => setShowCart(!showCart)}
              className="relative rounded-full bg-brand-orange hover:bg-brand-orange/90"
              data-testid="cart-toggle-button"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart
              {medicines.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {medicines.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-2 text-foreground">Order Medicines</h1>
          <p className="font-body text-muted-foreground">Browse inventory or add medicines manually</p>
          <p className="font-body text-sm text-muted-foreground mt-1">
            📍 A-4, Sai Darshan, Near Don Bosco High School, Naigaon East
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Medicine Selection - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Manual Entry Card - Priority */}
            <Card className="p-4 border-2 border-orange-200 bg-orange-50/50">
              <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-orange" />
                Add Medicine Manually
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Enter medicine name..."
                    value={manualMedicine.name}
                    onChange={(e) => setManualMedicine({...manualMedicine, name: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addManualMedicine()}
                    data-testid="manual-medicine-name"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setManualMedicine({...manualMedicine, quantity: Math.max(1, manualMedicine.quantity - 1)})}
                      className="h-12 w-12"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={manualMedicine.quantity}
                      onChange={(e) => setManualMedicine({...manualMedicine, quantity: parseInt(e.target.value) || 1})}
                      className="text-center h-12 w-16"
                      data-testid="manual-medicine-qty"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setManualMedicine({...manualMedicine, quantity: manualMedicine.quantity + 1})}
                      className="h-12 w-12"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={addManualMedicine}
                  className="h-12 rounded-xl bg-brand-orange hover:bg-brand-orange/90"
                  data-testid="add-manual-medicine-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </Card>

            {/* Search and Filter */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <Pill className="w-5 h-5 text-brand-orange" />
                Browse Inventory
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search medicines by name or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    data-testid="medicine-search-input"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={selectedForm}
                    onChange={(e) => setSelectedForm(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-input bg-background text-foreground"
                    data-testid="form-filter-select"
                  >
                    <option value="">All Forms</option>
                    {forms.map((form) => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Medicine Grid */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground" data-testid="inventory-count">
                    {inventory.length} items found
                  </span>
                </div>
                
                {inventoryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Pill className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No medicines found. Use manual entry above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {inventory.map((medicine, index) => (
                      <div
                        key={`${medicine.name}-${index}`}
                        className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl border border-orange-100 hover:border-brand-orange/50 transition-colors"
                        data-testid={`inventory-item-${index}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" title={medicine.name}>
                            {medicine.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {medicine.form} • {medicine.company}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(medicine)}
                          className="ml-2 shrink-0 hover:bg-brand-orange hover:text-white hover:border-brand-orange"
                          data-testid={`add-to-cart-${index}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Cart & Order - Right Side */}
          <div className={`lg:col-span-1 space-y-4 ${showCart ? 'block' : 'hidden lg:block'}`}>
            {/* Cart */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Your Cart
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowCart(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {medicines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="empty-cart-message">
                  Your cart is empty
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto" data-testid="cart-items">
                  {medicines.map((medicine, index) => (
                    <div 
                      key={`cart-${index}`} 
                      className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg"
                      data-testid={`cart-item-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{medicine.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, medicine.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{medicine.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, medicine.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => removeMedicine(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm font-medium">
                  Total Items: <span className="text-brand-orange">{medicines.reduce((sum, m) => sum + m.quantity, 0)}</span>
                </p>
              </div>
            </Card>

            {/* Upload Prescription */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3">Prescription (Optional)</h3>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                {prescriptionFile ? (
                  <div className="space-y-1">
                    <p className="text-sm truncate">{prescriptionFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {uploading ? 'Uploading...' : '✓ Uploaded'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="prescription-upload"
                      data-testid="prescription-upload-input"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('prescription-upload').click()}
                      data-testid="prescription-upload-button"
                    >
                      Upload
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Patient Details */}
            <Card className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-3">Your Details</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="patient-name" className="text-sm">Full Name *</Label>
                  <Input
                    id="patient-name"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                    data-testid="patient-name-input"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-phone" className="text-sm">Mobile Number *</Label>
                  <Input
                    id="patient-phone"
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({...patientInfo, phone: e.target.value})}
                    data-testid="patient-phone-input"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="delivery-address" className="text-sm">Delivery Address</Label>
                  <Textarea
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    data-testid="delivery-address-input"
                    className="min-h-16 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-email" className="text-sm">Email (Optional)</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    value={patientInfo.email}
                    onChange={(e) => setPatientInfo({...patientInfo, email: e.target.value})}
                    data-testid="patient-email-input"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </Card>

            {/* Place Order Button */}
            <Button 
              className="w-full rounded-full py-6 bg-brand-orange hover:bg-brand-orange/90 text-lg font-medium" 
              onClick={handleSubmit}
              disabled={loading || medicines.length === 0}
              data-testid="place-order-button"
            >
              {loading ? 'Processing...' : 'Place Order via WhatsApp'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pharmacy;
