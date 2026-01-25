import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Receipt, Loader2, Search, IndianRupee, Clock, CheckCircle2, X, Printer, Send } from 'lucide-react';
import { PatientLookup } from '@/components/PatientRegistration';
import { 
  API, FEE_CODES, SCAN_FEES,
  getIndianDate, getAuthHeaders, formatIndianDate 
} from '@/pages/staff/staffUtils';

const BillingTab = ({ 
  staffInfo,
  appointments,
  fetchAppointments
}) => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [billingItems, setBillingItems] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get today's unpaid appointments
  const todayAppointments = useMemo(() => {
    const today = getIndianDate();
    return appointments.filter(apt => 
      apt.date === today && 
      (apt.payment_status !== 'paid' || !apt.payment_status)
    );
  }, [appointments]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return billingItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [billingItems]);

  // Add fee to billing
  const addFeeItem = (code, type = 'consultation') => {
    const fees = type === 'scan' ? SCAN_FEES : FEE_CODES;
    const fee = fees[code];
    if (!fee) return;

    setBillingItems(prev => [
      ...prev,
      {
        id: Date.now(),
        code,
        type,
        label: fee.label,
        amount: fee.amount
      }
    ]);
  };

  // Remove fee item
  const removeFeeItem = (id) => {
    setBillingItems(prev => prev.filter(item => item.id !== id));
  };

  // Process payment
  const handlePayment = async () => {
    if (!selectedPatient || billingItems.length === 0) {
      toast.error('Please select a patient and add items');
      return;
    }

    setLocalLoading(true);
    try {
      const billingData = {
        patient_name: selectedPatient.patient_name || selectedPatient.name,
        patient_phone: selectedPatient.patient_phone || selectedPatient.mobile,
        patient_id: selectedPatient.patient_id,
        appointment_id: selectedPatient.appointment_id,
        items: billingItems,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: 'paid',
        clinic: staffInfo.clinic,
        staff_name: staffInfo.name,
        date: getIndianDate(),
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(`${API}/billing/collect`, billingData, {
        headers: getAuthHeaders()
      });

      // Update appointment payment status if linked
      if (selectedPatient.appointment_id) {
        await axios.put(`${API}/appointments/${selectedPatient.appointment_id}/payment`, {
          payment_status: 'paid',
          fee_code: billingItems[0]?.code,
          fee_amount: totalAmount,
          payment_method: paymentMethod
        }, {
          headers: getAuthHeaders()
        });
      }

      // Show receipt
      setLastReceipt({
        ...billingData,
        receipt_no: response.data?.receipt_no || `RCP-${Date.now().toString().slice(-8)}`
      });
      setShowReceiptModal(true);

      toast.success(`Payment of ₹${totalAmount} collected successfully`);

      // Reset
      setSelectedPatient(null);
      setBillingItems([]);
      setPaymentMethod('cash');
      
      if (fetchAppointments) fetchAppointments();

    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setLocalLoading(false);
    }
  };

  // Select patient from today's appointments
  const selectFromAppointment = (apt) => {
    setSelectedPatient(apt);
    // Auto-add consultation fee based on appointment
    const feeCode = apt.fee_code || 'G1';
    if (FEE_CODES[feeCode]) {
      setBillingItems([{
        id: Date.now(),
        code: feeCode,
        type: 'consultation',
        label: FEE_CODES[feeCode].label,
        amount: FEE_CODES[feeCode].amount
      }]);
    }
  };

  // Filter appointments by search
  const filteredAppointments = useMemo(() => {
    if (!searchQuery) return todayAppointments;
    const query = searchQuery.toLowerCase();
    return todayAppointments.filter(apt => 
      apt.patient_name?.toLowerCase().includes(query) ||
      apt.patient_phone?.includes(query) ||
      apt.patient_id?.toLowerCase().includes(query)
    );
  }, [todayAppointments, searchQuery]);

  return (
    <div className="space-y-6" data-testid="billing-tab">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Patient Selection */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Select Patient
          </h3>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="pl-10"
              data-testid="billing-search-input"
            />
          </div>

          {/* Todays Appointments (Unpaid) */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Pending Payments Today ({filteredAppointments.length})
            </p>
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map(apt => (
                <div
                  key={apt.appointment_id || apt._id}
                  onClick={() => selectFromAppointment(apt)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedPatient?.appointment_id === apt.appointment_id
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                  data-testid={`billing-patient-${apt.appointment_id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{apt.patient_name}</p>
                      <p className="text-xs text-slate-500">
                        {apt.time} • {apt.doctor}
                      </p>
                    </div>
                    <div className="text-right">
                      {apt.patient_id && (
                        <Badge className="bg-slate-100 text-slate-600 text-xs">{apt.patient_id}</Badge>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{apt.patient_phone}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 py-4">No pending payments for today</p>
            )}
          </div>
        </Card>

        {/* Right: Billing Items */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-600" />
            Billing Items
          </h3>

          {selectedPatient ? (
            <>
              {/* Selected Patient Info */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl mb-4">
                <p className="font-medium text-teal-800">
                  {selectedPatient.patient_name || selectedPatient.name}
                </p>
                <p className="text-sm text-teal-600">
                  {selectedPatient.patient_phone || selectedPatient.mobile}
                  {selectedPatient.patient_id && ` • ${selectedPatient.patient_id}`}
                </p>
              </div>

              {/* Fee Selection Buttons */}
              <div className="mb-4">
                <Label className="text-xs text-slate-500 uppercase tracking-wide">Add Consultation Fee</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(FEE_CODES).slice(0, 6).map(([code, { label, amount }]) => (
                    <Button
                      key={code}
                      variant="outline"
                      size="sm"
                      onClick={() => addFeeItem(code, 'consultation')}
                      className="text-xs"
                    >
                      {code}: ₹{amount}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-xs text-slate-500 uppercase tracking-wide">Add Scan Fee</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(SCAN_FEES).map(([code, { label, amount }]) => (
                    <Button
                      key={code}
                      variant="outline"
                      size="sm"
                      onClick={() => addFeeItem(code, 'scan')}
                      className="text-xs"
                    >
                      {code}: ₹{amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {billingItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.code} • {item.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">₹{item.amount}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeeItem(item.id)}
                        className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {billingItems.length === 0 && (
                  <p className="text-center text-slate-400 py-4 text-sm">No items added</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['cash', 'card', 'upi'].map(method => (
                    <Button
                      key={method}
                      variant={paymentMethod === method ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod(method)}
                      className={paymentMethod === method ? 'bg-teal-600' : ''}
                    >
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Total & Pay Button */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-teal-600 flex items-center">
                    <IndianRupee className="w-5 h-5" />
                    {totalAmount}
                  </span>
                </div>
                <Button
                  onClick={handlePayment}
                  disabled={localLoading || billingItems.length === 0}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  data-testid="billing-pay-btn"
                >
                  {localLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Collect ₹{totalAmount}
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a patient to start billing</p>
            </div>
          )}
        </Card>
      </div>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Payment Successful
            </DialogTitle>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500">Receipt No</p>
                <p className="font-mono font-bold">{lastReceipt.receipt_no}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Patient</p>
                  <p className="font-medium">{lastReceipt.patient_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="font-bold text-teal-600">₹{lastReceipt.total_amount}</p>
                </div>
                <div>
                  <p className="text-slate-500">Payment Method</p>
                  <p className="font-medium capitalize">{lastReceipt.payment_method}</p>
                </div>
                <div>
                  <p className="text-slate-500">Clinic</p>
                  <p className="font-medium">{lastReceipt.clinic}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  Send SMS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingTab;
