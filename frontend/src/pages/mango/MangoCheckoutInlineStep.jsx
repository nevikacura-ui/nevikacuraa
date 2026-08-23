import React from 'react';
import { useMango } from './MangoContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getTestIcon } from '@/components/mango';
import { FamilyMemberBooking } from '@/components/mango';
import {
  ArrowLeft, Plus, X, FlaskConical, CheckCircle2, Phone, Home, MapPin,
  CreditCard, Loader2
} from 'lucide-react';

const MangoCheckoutInlineStep = () => {
  const m = useMango();

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Complete Your Booking</h1>
        <p className="text-slate-500 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Review your tests and fill in your details</p>
      </div>

      {/* Selected Tests Summary */}
      <Card className="p-5 rounded-2xl border-green-500/30 bg-green-500/5">
        <h3 className="font-medium text-[#1E293B] mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-green-500" /> Selected Tests ({m.selectedTests.length})
        </h3>
        {m.selectedTests.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-500">No tests in cart</p>
            <Button onClick={() => m.setCurrentStep(0)} className="mt-3 bg-green-500 hover:bg-green-600">Browse Tests</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {m.labCart.map((test) => {
              const memberId = m.getTestMember(test.name);
              const member = m.getMemberById(memberId);
              return (
              <div key={test.name} className="bg-white p-3 rounded-xl border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTestIcon(test.name)}</span>
                    <span className="text-sm font-medium text-[#1E293B]">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {test.price > 0 && <span className="text-sm font-semibold text-green-600">₹{test.price}</span>}
                    <button onClick={() => m.removeFromLabCart(test.name)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                {member?.name && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{member.name}{member.age ? `, ${member.age} yrs` : ''}</span>
                  </div>
                )}
              </div>
              );
            })}
            <div className="flex justify-between items-center pt-3 border-t border-green-500/20 mt-2">
              <span className="font-medium text-[#1E293B]">Estimated Total</span>
              <span className="font-bold text-lg text-green-600">
                {m.labCart.reduce((sum, t) => sum + (t.price || 0), 0) > 0 ? `₹${m.labCart.reduce((sum, t) => sum + (t.price || 0), 0)}` : 'Price on confirmation'}
              </span>
            </div>
          </div>
        )}
        <Button variant="ghost" onClick={() => m.setCurrentStep(0)} className="w-full mt-3 text-green-600 hover:bg-green-50">
          <Plus className="w-4 h-4 mr-2" /> Add More Tests
        </Button>
      </Card>

      <FamilyMemberBooking variant="light" />

      {/* Patient Info - Only show if not verified */}
      {!m.verificationToken && (
        <Card className="p-5 rounded-2xl border-[#D2DAD7]">
          <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2"><Phone className="w-4 h-4 text-green-500" /> Your Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[#6F7B77] text-sm">Full Name *</Label>
              <Input value={m.patientInfo.name} onChange={(e) => m.setPatientInfo({ ...m.patientInfo, name: e.target.value })}
                placeholder="Enter your name" className="mt-1.5 rounded-xl border-[#D2DAD7] focus:border-green-500" data-testid="checkout-patient-name" />
            </div>
            <div>
              <Label className="text-[#6F7B77] text-sm">WhatsApp Number *</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={m.patientInfo.phone} onChange={(e) => m.setPatientInfo({ ...m.patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit mobile number" className="flex-1 rounded-xl border-[#D2DAD7] focus:border-green-500" disabled={m.auth.otpSent} data-testid="checkout-patient-phone" />
                {!m.auth.otpSent && (
                  <Button onClick={m.sendOtp} disabled={m.auth.loading || m.patientInfo.phone.length < 10 || !m.patientInfo.name.trim()}
                    className="px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold shrink-0" data-testid="checkout-verify-phone-btn">
                    {m.auth.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </Button>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[#6F7B77] text-sm">Email (Optional)</Label>
              <Input type="email" value={m.patientInfo.email || ''} onChange={(e) => m.setPatientInfo({ ...m.patientInfo, email: e.target.value })}
                placeholder="your@email.com" className="mt-1.5 rounded-xl border-[#D2DAD7] focus:border-green-500" data-testid="checkout-patient-email" />
            </div>
          </div>

          {m.auth.otpSent && (
            <div className="mt-4 space-y-4">
              <div className="text-center"><p className="text-sm text-slate-600">Enter the 6-digit code sent to +91 {m.patientInfo.phone}</p></div>
              <div className="flex justify-center gap-2">
                {m.otp.map((digit, idx) => (
                  <Input key={idx} ref={(el) => (m.otpRefs.current[idx] = el)} type="text" inputMode="numeric" maxLength={1}
                    value={digit} onChange={(e) => m.handleOtpChange(idx, e.target.value)} onKeyDown={(e) => m.handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border-2 border-gray-200 focus:border-green-500" data-testid={`checkout-otp-input-${idx}`} />
                ))}
              </div>
              <Button onClick={m.verifyOtp} disabled={m.otp.join('').length !== 6 || m.auth.loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-5 rounded-full font-semibold" data-testid="checkout-verify-otp-btn">
                {m.auth.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
              </Button>
              <div className="text-center">
                {m.auth.resendTimer > 0 ? <p className="text-sm text-slate-500">Resend OTP in {m.auth.resendTimer}s</p> 
                  : <button onClick={m.sendOtp} disabled={m.auth.loading} className="text-sm text-green-500 font-medium hover:underline">Resend OTP</button>}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Phone Verified - Collection Details */}
      {m.verificationToken && (
        <>
          <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Phone verified: +91 {m.patientInfo.phone}</span>
          </div>

          <Card className="p-5 rounded-2xl border-[#D2DAD7]" data-testid="checkout-collection-card">
            <h3 className="font-medium text-[#1E293B] mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-green-600" /> Sample Collection</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => m.setCollectionType('home')} data-testid="checkout-home-collection"
                className={`p-4 rounded-2xl border-2 text-left transition-all ${m.collectionType === 'home' ? 'border-green-500 bg-green-500/5' : 'border-[#D2DAD7] hover:border-green-500/50'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${m.collectionType === 'home' ? 'bg-green-500/20' : 'bg-slate-100'}`}>
                  <Home className={`w-6 h-6 ${m.collectionType === 'home' ? 'text-green-500' : 'text-[#6F7B77]'}`} />
                </div>
                <h4 className="font-semibold text-[#1E293B]">Home Collection</h4>
                <p className="text-xs text-[#6F7B77] mt-1">Phlebotomist visits your home</p>
                <p className="text-xs text-[#10B981] font-medium mt-2">FREE for orders above ₹2000</p>
              </button>
              <button onClick={() => m.setCollectionType('center')} data-testid="checkout-center-collection"
                className={`p-4 rounded-2xl border-2 text-left transition-all ${m.collectionType === 'center' ? 'border-green-500 bg-green-500/5' : 'border-[#D2DAD7] hover:border-green-500/50'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${m.collectionType === 'center' ? 'bg-green-500/20' : 'bg-slate-100'}`}>
                  <MapPin className={`w-6 h-6 ${m.collectionType === 'center' ? 'text-green-500' : 'text-[#6F7B77]'}`} />
                </div>
                <h4 className="font-semibold text-[#1E293B]">Visit Center</h4>
                <p className="text-xs text-[#6F7B77] mt-1">Walk-in to collection center</p>
                <p className="text-xs text-slate-400 mt-2">Naigaon East</p>
              </button>
            </div>
            {m.collectionType === 'home' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-[#6F7B77] text-sm">Complete Address *</Label>
                  <Textarea value={m.patientInfo.address} onChange={(e) => m.setPatientInfo({ ...m.patientInfo, address: e.target.value })}
                    placeholder="Enter full address with landmark" rows={2} className="mt-1.5 rounded-xl border-[#D2DAD7] focus:border-green-500" data-testid="checkout-home-address" />
                </div>
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-xs text-green-600">
                  <p className="font-medium">Home Collection Process:</p>
                  <ul className="mt-1 space-y-0.5"><li>• Our phlebotomist will call 30 mins before arrival</li><li>• Sample collected at your doorstep</li><li>• Reports sent via email within 24 hours</li></ul>
                </div>
              </div>
            )}
            {m.collectionType === 'center' && (
              <div className="mt-4 bg-[#F7F9F8] border border-[#D2DAD7] rounded-xl p-4">
                <h4 className="font-medium text-[#1E293B] mb-2">Collection Center</h4>
                <div className="bg-white rounded-lg p-3 border border-[#E6ECEA]">
                  <p className="font-semibold text-sm text-[#1E293B]">Mango Health Labs - Naigaon</p>
                  <p className="text-xs text-[#6F7B77] mt-1">Shop no 3, Sai Darshan, Near Don Bosco School, Naigaon East 401208</p>
                  <p className="text-xs text-slate-400 mt-1">Mon-Sat: 7:00 AM - 7:00 PM</p>
                </div>
              </div>
            )}
          </Card>

          <Button onClick={m.handleSubmit}
            disabled={m.loading || m.selectedTests.length === 0 || (m.collectionType === 'home' && !m.patientInfo.address?.trim())}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            data-testid="checkout-proceed-to-payment">
            {m.loading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>) : (<><CreditCard className="w-5 h-5 mr-2" /> Continue to Payment</>)}
          </Button>
        </>
      )}

      <Button variant="outline" onClick={() => m.navigate('/cart')} className="w-full rounded-full border-slate-300">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cart
      </Button>
    </div>
  );
};

export default MangoCheckoutInlineStep;
