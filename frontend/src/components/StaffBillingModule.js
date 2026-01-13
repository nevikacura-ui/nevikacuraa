import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Search, Plus, Minus, Trash2, Receipt, CreditCard, Banknote,
  User, Phone, Mail, Loader2, CheckCircle, AlertCircle,
  Stethoscope, TestTube, Pill, Gift, Send, Printer, X,
  IndianRupee, Building, Clock
} from 'lucide-react';
import debounce from 'lodash/debounce';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const StaffBillingModule = ({ staffInfo, getAuthHeaders }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchCategory, setSearchCategory] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Patient info
  const [patientPhone, setPatientPhone] = useState('');
  const [patientInfo, setPatientInfo] = useState(null);
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  
  // Bill items
  const [billItems, setBillItems] = useState([]);
  const [customItemDialog, setCustomItemDialog] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', price: '', category: 'service' });
  
  // Payment
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pending');
  const [notes, setNotes] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  
  // Bill history
  const [recentBills, setRecentBills] = useState([]);
  const [showBillHistory, setShowBillHistory] = useState(false);
  
  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const params = { q: query };
        if (searchCategory) params.category = searchCategory;
        
        const response = await axios.get(`${API}/staff-billing/inventory/search`, { params });
        setSearchResults(response.data?.results || []);
      } catch (error) {
        console.error('Search error:', error);
      }
      setIsSearching(false);
    }, 300),
    [searchCategory]
  );
  
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);
  
  // Lookup patient by phone
  const lookupPatient = async () => {
    if (patientPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoadingPatient(true);
    try {
      const response = await axios.get(`${API}/patient-flow/patient/lookup`, {
        params: { phone: patientPhone }
      });
      
      setPatientInfo(response.data?.patient);
      setLoyaltyInfo(response.data?.loyalty);
      
      if (response.data?.patient?.name) {
        setPatientName(response.data.patient.name);
      }
      if (response.data?.patient?.email) {
        setPatientEmail(response.data.patient.email);
      }
      
      // Also get loyalty points available
      const loyaltyRes = await axios.get(`${API}/staff-billing/patient-loyalty/${patientPhone}`);
      setLoyaltyInfo(prev => ({
        ...prev,
        ...loyaltyRes.data
      }));
      
      toast.success('Patient found!');
    } catch (error) {
      toast.error('Patient lookup failed');
      setPatientInfo(null);
      setLoyaltyInfo(null);
    }
    setLoadingPatient(false);
  };
  
  // Add item to bill
  const addToBill = (item) => {
    const existingIndex = billItems.findIndex(
      b => b.item_code === item.code || b.item_name === item.name
    );
    
    if (existingIndex >= 0) {
      // Increase quantity
      const updated = [...billItems];
      updated[existingIndex].quantity += 1;
      setBillItems(updated);
    } else {
      setBillItems([...billItems, {
        item_type: item.type,
        item_name: item.name,
        item_code: item.code,
        quantity: 1,
        unit_price: item.price || 0,
        discount_percent: 0,
        source: item.source,
        category: item.category
      }]);
    }
    
    setSearchTerm('');
    setSearchResults([]);
  };
  
  // Update item in bill
  const updateBillItem = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;
    setBillItems(updated);
  };
  
  // Remove item from bill
  const removeFromBill = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };
  
  // Add custom item
  const addCustomItem = () => {
    if (!customItem.name || !customItem.price) {
      toast.error('Please fill in item name and price');
      return;
    }
    
    addToBill({
      type: customItem.category,
      name: customItem.name,
      code: `CUSTOM-${Date.now()}`,
      price: parseFloat(customItem.price),
      source: 'Custom',
      category: 'Custom'
    });
    
    setCustomItem({ name: '', price: '', category: 'service' });
    setCustomItemDialog(false);
  };
  
  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    billItems.forEach(item => {
      const itemTotal = item.unit_price * item.quantity;
      const discount = itemTotal * (item.discount_percent / 100);
      subtotal += itemTotal - discount;
    });
    
    let loyaltyDiscount = 0;
    if (useLoyaltyPoints && loyaltyPointsToUse > 0) {
      loyaltyDiscount = Math.min(loyaltyPointsToUse * 0.10, subtotal * 0.10);
    }
    
    const totalDiscount = discountAmount + loyaltyDiscount;
    const finalTotal = Math.max(0, subtotal - totalDiscount);
    
    return { subtotal, loyaltyDiscount, totalDiscount, finalTotal };
  };
  
  const { subtotal, loyaltyDiscount, totalDiscount, finalTotal } = calculateTotals();
  
  // Create bill
  const createBill = async () => {
    if (billItems.length === 0) {
      toast.error('Please add items to the bill');
      return;
    }
    if (!patientName || !patientPhone) {
      toast.error('Please enter patient name and phone');
      return;
    }
    
    setLoading(true);
    try {
      const billData = {
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || null,
        items: billItems.map(item => ({
          item_type: item.item_type,
          item_name: item.item_name,
          item_code: item.item_code,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          notes: item.notes
        })),
        use_loyalty_points: useLoyaltyPoints,
        loyalty_points_to_use: useLoyaltyPoints ? loyaltyPointsToUse : 0,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        notes: notes,
        clinic: staffInfo?.clinic || 'pushpa'
      };
      
      const response = await axios.post(`${API}/staff-billing/create-bill`, billData);
      
      toast.success(`Bill created! ${response.data.bill.bill_number}`);
      
      if (patientEmail) {
        toast.info('Invoice will be sent to patient email');
      }
      
      // Reset form
      setBillItems([]);
      setPatientPhone('');
      setPatientName('');
      setPatientEmail('');
      setPatientInfo(null);
      setLoyaltyInfo(null);
      setUseLoyaltyPoints(false);
      setLoyaltyPointsToUse(0);
      setDiscountAmount(0);
      setPaymentMethod('pending');
      setNotes('');
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create bill');
    }
    setLoading(false);
  };
  
  // Fetch recent bills
  const fetchRecentBills = async () => {
    try {
      const response = await axios.get(`${API}/staff-billing/bills`, {
        params: { limit: 20, clinic: staffInfo?.clinic }
      });
      setRecentBills(response.data?.bills || []);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    }
  };
  
  const getSourceIcon = (source) => {
    switch (source) {
      case 'DiaGyn': return <Stethoscope className="w-4 h-4 text-blue-500" />;
      case 'Proton': return <TestTube className="w-4 h-4 text-purple-500" />;
      case 'Orange Pharmacy': return <Pill className="w-4 h-4 text-orange-500" />;
      default: return <Receipt className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Patient Lookup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  data-testid="patient-phone-input"
                />
                <Button onClick={lookupPatient} disabled={loadingPatient}>
                  {loadingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Patient Name</Label>
              <Input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label>Email (for invoice)</Label>
              <Input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
          
          {/* Loyalty Points Info */}
          {loyaltyInfo && loyaltyInfo.available_points > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-800">
                    {loyaltyInfo.available_points} Loyalty Points Available
                  </span>
                  <Badge className="bg-amber-100 text-amber-700">
                    ≈ ₹{(loyaltyInfo.available_points * 0.10).toFixed(0)} value
                  </Badge>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useLoyaltyPoints}
                    onChange={(e) => {
                      setUseLoyaltyPoints(e.target.checked);
                      if (e.target.checked) {
                        setLoyaltyPointsToUse(loyaltyInfo.available_points);
                      } else {
                        setLoyaltyPointsToUse(0);
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Use points</span>
                </label>
              </div>
              {useLoyaltyPoints && (
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-sm">Points to use:</Label>
                  <Input
                    type="number"
                    value={loyaltyPointsToUse}
                    onChange={(e) => setLoyaltyPointsToUse(Math.min(parseInt(e.target.value) || 0, loyaltyInfo.available_points))}
                    className="w-24 h-8"
                    max={loyaltyInfo.available_points}
                  />
                  <span className="text-sm text-gray-500">Max: {loyaltyInfo.available_points}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Search & Add Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-600" />
              Bill Items
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setCustomItemDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Custom Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services, tests, medicines..."
                className="pl-10"
                data-testid="item-search-input"
              />
            </div>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="service">Services</SelectItem>
                <SelectItem value="test">Tests</SelectItem>
                <SelectItem value="medicine">Medicines</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-4 max-h-60 overflow-y-auto border rounded-lg divide-y">
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => addToBill(item)}
                  data-testid={`search-result-${idx}`}
                >
                  <div className="flex items-center gap-2">
                    {getSourceIcon(item.source)}
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.source} • {item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.price > 0 ? (
                      <span className="text-sm font-medium">₹{item.price}</span>
                    ) : (
                      <span className="text-xs text-gray-400">Enter price</span>
                    )}
                    <Plus className="w-4 h-4 text-teal-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isSearching && (
            <div className="text-center py-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Searching...
            </div>
          )}
          
          {/* Bill Items List */}
          {billItems.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                <div className="col-span-5">Item</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>
              
              {billItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-lg">
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(item.source)}
                      <div>
                        <p className="font-medium text-sm">{item.item_name}</p>
                        <p className="text-xs text-gray-500">{item.source}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => updateBillItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => updateBillItem(idx, 'quantity', item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateBillItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-8 text-right"
                    />
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    ₹{(item.unit_price * item.quantity).toFixed(0)}
                  </div>
                  <div className="col-span-1 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={() => removeFromBill(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Search and add items to the bill</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Totals & Payment */}
      {billItems.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Discount & Notes */}
              <div className="space-y-3">
                <div>
                  <Label>Additional Discount (₹)</Label>
                  <Input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending (Due)</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes"
                  />
                </div>
              </div>
              
              {/* Totals Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Loyalty Discount</span>
                      <span>-₹{loyaltyDiscount.toFixed(0)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Additional Discount</span>
                      <span>-₹{discountAmount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-teal-600">₹{finalTotal.toFixed(0)}</span>
                  </div>
                </div>
                
                <Button
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
                  onClick={createBill}
                  disabled={loading}
                  data-testid="create-bill-btn"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Receipt className="w-4 h-4 mr-2" />
                  )}
                  {paymentMethod === 'pending' ? 'Create Bill (Due)' : 'Create & Mark Paid'}
                </Button>
                
                {patientEmail && (
                  <p className="text-xs text-center text-gray-500 mt-2">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Invoice will be emailed to {patientEmail}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Custom Item Dialog */}
      <Dialog open={customItemDialog} onOpenChange={setCustomItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>Add a new item not in the inventory</DialogDescription>
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
            <div>
              <Label>Price (₹)</Label>
              <Input
                type="number"
                value={customItem.price}
                onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                placeholder="Enter price"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={customItem.category}
                onValueChange={(v) => setCustomItem({ ...customItem, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="medicine">Medicine</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addCustomItem} className="w-full">
              Add to Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffBillingModule;
