import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import debounce from 'lodash/debounce';
import { 
  Search, Plus, Minus, Trash2, User, Phone, Mail, Gift, 
  Receipt, Loader2, IndianRupee, CreditCard, Banknote, Smartphone
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * ServiceBillingModule - A billing component specific to each service
 * @param {string} serviceType - 'diagyn' | 'proton' | 'pharmacy'
 * @param {string} serviceName - Display name (e.g., 'DiaGyn Healthcare', 'Proton Diagnostics', 'Orange Pharmacy')
 * @param {Array} inventory - Service-specific inventory items
 * @param {string} serviceColor - Tailwind color class (e.g., 'blue', 'indigo', 'orange')
 */
const ServiceBillingModule = ({ serviceType, serviceName, inventory = [], serviceColor = 'teal' }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Patient info
  const [patientPhone, setPatientPhone] = useState('');
  const [patientInfo, setPatientInfo] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  
  // Bill items
  const [billItems, setBillItems] = useState([]);
  const [customItem, setCustomItem] = useState({ name: '', price: '', quantity: 1 });
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  
  // Loyalty & Payment
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  
  // Filter inventory based on search
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.length < 2) {
        setFilteredItems([]);
        return;
      }
      
      setIsSearching(true);
      const filtered = inventory.filter(item => 
        item.name?.toLowerCase().includes(query.toLowerCase()) ||
        item.code?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(filtered.slice(0, 10));
      setIsSearching(false);
    }, 300),
    [inventory]
  );
  
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);
  
  // Lookup patient by phone
  const lookupPatient = async () => {
    if (patientPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoadingPatient(true);
    try {
      // Get patient info
      const patientRes = await axios.get(`${API}/patient-flow/patient/lookup?phone=${patientPhone}`);
      setPatientInfo(patientRes.data.patient);
      
      // Get loyalty points
      const loyaltyRes = await axios.get(`${API}/staff-billing/patient-loyalty/${patientPhone}`);
      setLoyaltyPoints(loyaltyRes.data.available_points || 0);
      
      if (patientRes.data.patient) {
        toast.success(`Found: ${patientRes.data.patient.name}`);
      } else {
        toast.info('New patient - please enter details');
        setPatientInfo({ phone: patientPhone, name: '', email: '', is_registered: false });
      }
    } catch (error) {
      console.error('Patient lookup error:', error);
      setPatientInfo({ phone: patientPhone, name: '', email: '', is_registered: false });
    }
    setLoadingPatient(false);
  };
  
  // Add item to bill
  const addToBill = (item) => {
    const existing = billItems.find(b => b.code === item.code || b.name === item.name);
    if (existing) {
      setBillItems(prev => prev.map(b => 
        (b.code === item.code || b.name === item.name) 
          ? { ...b, quantity: b.quantity + 1 } 
          : b
      ));
    } else {
      setBillItems(prev => [...prev, { 
        ...item, 
        quantity: 1,
        source: serviceName
      }]);
    }
    setSearchTerm('');
    setFilteredItems([]);
    toast.success(`Added: ${item.name}`);
  };
  
  // Update quantity
  const updateQuantity = (index, delta) => {
    setBillItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };
  
  // Remove item
  const removeItem = (index) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };
  
  // Add custom item
  const addCustomItem = () => {
    if (!customItem.name || !customItem.price) {
      toast.error('Please fill in item name and price');
      return;
    }
    
    setBillItems(prev => [...prev, {
      name: customItem.name,
      price: parseFloat(customItem.price),
      quantity: parseInt(customItem.quantity) || 1,
      code: `CUSTOM_${Date.now()}`,
      source: serviceName,
      isCustom: true
    }]);
    
    setCustomItem({ name: '', price: '', quantity: 1 });
    setShowCustomDialog(false);
    toast.success('Custom item added');
  };
  
  // Calculate totals
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const loyaltyDiscount = useLoyalty ? Math.min(loyaltyPoints, subtotal * 0.1) : 0;
  const discountAmount = discount > 0 ? (subtotal * discount / 100) : 0;
  const total = subtotal - loyaltyDiscount - discountAmount;
  
  // Create bill
  const createBill = async () => {
    if (billItems.length === 0) {
      toast.error('Please add items to the bill');
      return;
    }
    
    setLoading(true);
    try {
      const billData = {
        patient_phone: patientInfo?.phone || patientPhone,
        patient_name: patientInfo?.name || 'Walk-in Customer',
        patient_email: patientInfo?.email,
        items: billItems.map(item => ({
          code: item.code,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          source: item.source
        })),
        subtotal,
        discount_percent: discount,
        loyalty_points_used: useLoyalty ? loyaltyDiscount : 0,
        total,
        payment_method: paymentMethod,
        service_type: serviceType,
        staff_id: 'counter_staff'
      };
      
      const response = await axios.post(`${API}/staff-billing/create-bill`, billData);
      
      toast.success(`Bill #${response.data.bill_number} created successfully!`);
      
      // Reset form
      setBillItems([]);
      setPatientInfo(null);
      setPatientPhone('');
      setUseLoyalty(false);
      setDiscount(0);
      setPaymentMethod('cash');
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create bill');
    }
    setLoading(false);
  };
  
  const colorClasses = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', btn: 'bg-teal-600 hover:bg-teal-700' }
  };
  
  const colors = colorClasses[serviceColor] || colorClasses.teal;

  return (
    <div className="space-y-6">
      {/* Patient Information */}
      <Card className={`${colors.bg} ${colors.border}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg flex items-center gap-2 ${colors.text}`}>
            <User className="w-5 h-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="10-digit mobile"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="flex-1"
                  data-testid="billing-patient-phone"
                />
                <Button 
                  onClick={lookupPatient}
                  disabled={loadingPatient || patientPhone.length !== 10}
                  variant="outline"
                >
                  {loadingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {patientInfo && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Patient Name</Label>
                <Input
                  value={patientInfo.name || ''}
                  onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Email (for invoice)</Label>
                <Input
                  type="email"
                  value={patientInfo.email || ''}
                  onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                  placeholder="patient@email.com"
                />
              </div>
            </div>
          )}
          
          {loyaltyPoints > 0 && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium">Available Loyalty Points: {loyaltyPoints}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLoyalty}
                  onChange={(e) => setUseLoyalty(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Use points</span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Bill Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className={`w-5 h-5 ${colors.text}`} />
              {serviceName} Bill
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCustomDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Custom Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder={`Search ${serviceName} items...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="billing-item-search"
            />
            
            {/* Search Results Dropdown */}
            {filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredItems.map((item, idx) => (
                  <div
                    key={item.code || idx}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => addToBill(item)}
                    data-testid={`search-result-${idx}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.code}</p>
                      </div>
                      <span className="font-semibold text-green-600">₹{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Bill Items List */}
          {billItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No items added yet</p>
              <p className="text-sm">Search above to add items</p>
            </div>
          ) : (
            <div className="space-y-2">
              {billItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.code} • ₹{item.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(index, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(index, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-semibold w-20 text-right">₹{item.price * item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Totals */}
          {billItems.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              
              {/* Discount Input */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Discount %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-20 h-8 text-right"
                />
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discount}%)</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              {useLoyalty && loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm text-yellow-600">
                  <span>Loyalty Points</span>
                  <span>-₹{loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className={colors.text}>₹{total.toFixed(2)}</span>
              </div>
              
              {/* Payment Method */}
              <div className="pt-2">
                <Label className="text-sm">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="upi">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        UPI
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Card
                      </div>
                    </SelectItem>
                    <SelectItem value="due">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4" />
                        Due / Pending
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Create Bill Button */}
              <Button
                className={`w-full ${colors.btn}`}
                onClick={createBill}
                disabled={loading || billItems.length === 0}
                data-testid="create-bill-btn"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Receipt className="w-4 h-4 mr-2" />
                )}
                {paymentMethod === 'due' ? 'Create Bill (Due)' : `Collect ₹${total.toFixed(2)}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Custom Item Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>Add an item that's not in the inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={customItem.name}
                onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                placeholder="Enter item name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={customItem.price}
                  onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={customItem.quantity}
                  onChange={(e) => setCustomItem({ ...customItem, quantity: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>Cancel</Button>
            <Button onClick={addCustomItem} className={colors.btn}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceBillingModule;
