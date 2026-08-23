import React from 'react';
import { useMango } from './MangoContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Shield, Loader2, Bookmark } from 'lucide-react';

const MangoOTPStep = () => {
  const m = useMango();

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Card className="p-8 rounded-3xl border-[#D2DAD7] shadow-lg">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#1F4F46]/20 to-[#2E6B5F]/20 rounded-2xl flex items-center justify-center mb-5">
            <Shield className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>Verify Your Phone</h2>
          <p className="text-[#6F7B77] mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Enter the 6-digit code sent to +91 {m.patientInfo.phone}</p>
        </div>

        <div className="flex justify-center gap-2.5 mb-8">
          {m.otp.map((digit, idx) => (
            <Input key={idx} ref={(el) => (m.otpRefs.current[idx] = el)} type="text" inputMode="numeric" maxLength={1}
              value={digit} onChange={(e) => m.handleOtpChange(idx, e.target.value)} onKeyDown={(e) => m.handleOtpKeyDown(idx, e)}
              className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-[#D2DAD7] focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              data-testid={`otp-input-${idx}`} />
          ))}
        </div>

        <Button onClick={m.verifyOtp} disabled={m.otp.join('').length !== 6 || m.auth.loading}
          className="w-full bg-gradient-to-r from-[#1F4F46] to-[#2E6B5F] hover:from-[#2E6B5F] hover:to-[#3E8A7A] text-white py-6 rounded-full font-semibold"
          data-testid="verify-otp-btn">
          {m.auth.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
        </Button>

        <div className="text-center mt-5">
          {m.auth.resendTimer > 0 ? (
            <p className="text-sm text-[#6F7B77]">Resend OTP in {m.auth.resendTimer}s</p>
          ) : (
            <button onClick={m.sendOtp} disabled={m.auth.loading} className="text-sm text-green-500 font-medium hover:underline">Resend OTP</button>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={m.goToStep1} className="flex-1 rounded-full border-[#D2DAD7]" data-testid="back-to-tests">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tests
        </Button>
        <Button variant="outline" onClick={m.saveCartForLater} className="flex-1 rounded-full border-amber-300 text-green-600 hover:bg-green-50" data-testid="save-for-later-btn">
          <Bookmark className="w-4 h-4 mr-2" /> Save for Later
        </Button>
      </div>
    </div>
  );
};

export default MangoOTPStep;
