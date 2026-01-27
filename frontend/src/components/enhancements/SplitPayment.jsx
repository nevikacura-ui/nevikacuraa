import React, { useState } from 'react';
import { CreditCard, Calendar, Calculator, CheckCircle, ArrowRight, Percent, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

const SplitPayment = () => {
  const [totalAmount, setTotalAmount] = useState(5000);
  const [paymentType, setPaymentType] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [emiMonths, setEmiMonths] = useState(3);
  const [step, setStep] = useState(1);

  const emiOptions = [
    { months: 3, interest: 0, label: 'No Cost EMI' },
    { months: 6, interest: 5, label: '5% Interest' },
    { months: 12, interest: 8, label: '8% Interest' }
  ];

  const calculateEMI = (months) => {
    const option = emiOptions.find(o => o.months === months);
    const totalWithInterest = totalAmount * (1 + option.interest / 100);
    return Math.ceil(totalWithInterest / months);
  };

  const handlePartialPayment = () => {
    const amount = parseFloat(partialAmount);
    if (amount <= 0 || amount >= totalAmount) {
      toast.error('Please enter a valid partial amount');
      return;
    }
    toast.success(`Partial payment of ₹${amount} processed. Remaining: ₹${totalAmount - amount}`);
    setStep(3);
  };

  const handleEMIPayment = () => {
    toast.success(`EMI payment initiated: ₹${calculateEMI(emiMonths)}/month for ${emiMonths} months`);
    setStep(3);
  };

  return (
    <div className="space-y-4" data-testid="split-payment">
      {/* Header */}
      <Card className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Split Payment</h2>
              <p className="text-violet-100 text-sm">Pay in parts or EMI</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {step === 1 && (
        <>
          {/* Total Amount */}
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Amount Due</p>
              <p className="text-4xl font-bold">₹{totalAmount.toLocaleString()}</p>
            </CardContent>
          </Card>

          {/* Payment Options */}
          <div className="space-y-3">
            <Card
              className={`cursor-pointer transition-all ${paymentType === 'partial' ? 'ring-2 ring-violet-500 bg-violet-50' : 'hover:bg-gray-50'}`}
              onClick={() => { setPaymentType('partial'); setStep(2); }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Pay Partial Amount</h3>
                    <p className="text-sm text-gray-500">Pay some now, rest later</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${paymentType === 'emi' ? 'ring-2 ring-violet-500 bg-violet-50' : 'hover:bg-gray-50'}`}
              onClick={() => { setPaymentType('emi'); setStep(2); }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">EMI Payment</h3>
                    <p className="text-sm text-gray-500">Split into monthly installments</p>
                    <Badge className="bg-green-100 text-green-700 mt-1">0% EMI Available</Badge>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-gray-50" onClick={() => toast.success('Redirecting to full payment...')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Pay Full Amount</h3>
                    <p className="text-sm text-gray-500">Complete payment now</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {step === 2 && paymentType === 'partial' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Partial Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
            </div>

            <div>
              <Label>Amount to Pay Now</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                className="mt-1"
              />
            </div>

            {partialAmount && parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < totalAmount && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Paying Now</span>
                  <span className="font-medium">₹{parseFloat(partialAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Remaining Balance</span>
                  <span className="font-medium text-amber-600">₹{(totalAmount - parseFloat(partialAmount)).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={handlePartialPayment} className="flex-1">
                Pay ₹{partialAmount || 0}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && paymentType === 'emi' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">EMI Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              {emiOptions.map(option => (
                <Card
                  key={option.months}
                  className={`cursor-pointer transition-all ${emiMonths === option.months ? 'ring-2 ring-violet-500 bg-violet-50' : ''}`}
                  onClick={() => setEmiMonths(option.months)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{option.months} Months</p>
                          {option.interest === 0 && (
                            <Badge className="bg-green-100 text-green-700">No Cost</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{option.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">₹{calculateEMI(option.months).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">/month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-violet-50 border-violet-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-violet-600" />
                  <span className="font-medium text-violet-800">EMI Summary</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Monthly EMI</span>
                    <span className="font-medium">₹{calculateEMI(emiMonths).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span className="font-medium">{emiMonths} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Payable</span>
                    <span className="font-medium">₹{(calculateEMI(emiMonths) * emiMonths).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={handleEMIPayment} className="flex-1">
                Start EMI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Initiated!</h3>
            <p className="text-gray-500 mb-4">
              {paymentType === 'partial' 
                ? 'Your partial payment has been processed. Please clear the remaining balance within 7 days.'
                : 'Your EMI has been set up. First installment will be deducted on the 1st of next month.'}
            </p>
            <Button onClick={() => { setStep(1); setPaymentType(null); setPartialAmount(''); }}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SplitPayment;
