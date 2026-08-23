import React from 'react';
import { useMango } from './MangoContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { timeSlots } from '@/data/mangoData';
import {
  FlaskConical, CheckCircle2, Clock, CreditCard, Loader2, Banknote, AlertTriangle
} from 'lucide-react';

const MangoBookingStep = () => {
  const m = useMango();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 text-[#10B981] mb-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Phone verified: +91 {m.patientInfo.phone}</span>
        </div>
        <h1 className="text-3xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>Booking Details</h1>
      </div>

      {/* Selected Tests Summary */}
      <Card className="p-5 rounded-2xl bg-green-500/5 border-green-500/20">
        <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-green-500" /> Selected Tests ({m.selectedTests.length})
        </h3>
        <div className="space-y-2">
          {m.labCart.map((test) => (
            <div key={test.name} className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-green-500/10">
              <span className="text-sm text-[#1E293B]">{test.name}</span>
              {test.price > 0 && <span className="text-sm font-medium text-green-600">₹{test.price}</span>}
            </div>
          ))}
        </div>
        {m.labCart.reduce((sum, t) => sum + (t.price || 0), 0) > 0 && (
          <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-green-500/30">
            <span className="font-semibold text-[#1E293B]">Total Amount</span>
            <span className="font-bold text-xl text-green-600">₹{m.labCart.reduce((sum, t) => sum + (t.price || 0), 0)}</span>
          </div>
        )}
      </Card>

      {/* Preferred Date */}
      <Card className="p-5 rounded-2xl border-[#D2DAD7]">
        <Label className="flex items-center gap-2 mb-3 font-medium text-[#1E293B]">
          <Clock className="w-4 h-4 text-green-500" /> Preferred Date *
        </Label>
        <CalendarComponent mode="single" selected={m.preferredDate} onSelect={m.setPreferredDate}
          disabled={(date) => date < new Date()} className="rounded-xl border border-[#D2DAD7]" />
      </Card>

      {/* Time Slot Selection */}
      <Card className="p-5 rounded-2xl border-[#D2DAD7]">
        <Label className="flex items-center gap-2 mb-3 font-medium text-[#1E293B]">
          <Clock className="w-4 h-4 text-green-500" /> Preferred Time Slot
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {timeSlots.map((slot) => (
            <button key={slot.value} onClick={() => m.setPreferredTimeSlot(slot.value)}
              className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${m.preferredTimeSlot === slot.value ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-[#D2DAD7] hover:border-green-500/30 text-[#6F7B77]'}`}
              data-testid={`time-slot-${slot.value}`}>
              {slot.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Test Preparation Instructions */}
      {m.getSelectedTestPreparations().length > 0 && (
        <Card className="p-5 rounded-2xl bg-green-50 border-green-200">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Test Preparation Instructions</h3>
          <div className="space-y-2">
            {m.getSelectedTestPreparations().map((prep, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-green-100">
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${prep.fasting ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {prep.fasting ? `${prep.hours}hr Fasting` : 'No Fasting'}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2B2B2B]">{prep.test}</p>
                  <p className="text-xs text-[#6F7B77]">{prep.instruction}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Address for Home Collection */}
      <Card className="p-5 rounded-2xl border-[#D2DAD7]">
        <Label className="flex items-center gap-2 mb-2 text-[#6F7B77]">
          {m.collectionType === 'home' ? 'Address for Home Collection *' : 'Address (Optional)'}
        </Label>
        <Textarea value={m.patientInfo.address} onChange={(e) => m.setPatientInfo({ ...m.patientInfo, address: e.target.value })}
          placeholder="Enter your address for home sample collection" className="min-h-20 rounded-xl border-[#D2DAD7] focus:border-green-500"
          data-testid="patient-address" />
      </Card>

      {/* Home Collection Charges */}
      {m.collectionType === 'home' && (
        <Card className="p-5 rounded-2xl border-[#D2DAD7] bg-gradient-to-br from-slate-50 to-teal-50/30" data-testid="pricing-summary-card">
          <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2"><Banknote className="w-4 h-4 text-green-500" /> Home Collection Charges</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-[#D2DAD7]">
              <span className="text-sm text-[#6F7B77]">Home Visit Fee</span><span className="text-sm font-medium text-slate-700">₹50</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#6F7B77]">Discount (Orders above ₹2000)</span><span className="text-sm font-medium text-[#10B981]">-₹50</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t-2 border-green-500/20 mt-2">
              <span className="font-semibold text-[#1E293B]">Home Visit Total</span><span className="font-bold text-lg text-green-500">₹0*</span>
            </div>
            <p className="text-xs text-[#6F7B77] mt-1">*Home collection is FREE for test orders above ₹2000. A ₹50 fee applies for orders below ₹2000.</p>
          </div>
        </Card>
      )}

      {/* Submit Button */}
      <Button onClick={m.handleSubmit}
        disabled={m.loading || !m.preferredDate || !m.bookingLimits.canBook || (m.collectionType === 'home' && !m.patientInfo.address?.trim())}
        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        data-testid="proceed-to-payment-btn">
        {m.loading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>) 
          : !m.bookingLimits.canBook ? (<><AlertTriangle className="w-5 h-5 mr-2" /> Complete Existing Orders First</>) 
          : (<><CreditCard className="w-5 h-5 mr-2" /> Proceed to Payment</>)}
      </Button>
    </div>
  );
};

export default MangoBookingStep;
