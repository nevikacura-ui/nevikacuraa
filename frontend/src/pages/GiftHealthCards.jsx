import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft, Gift, Heart, Cake, Sparkles, Briefcase,
  Send, MessageCircle, Mail, ChevronRight, Check,
  CreditCard, Loader2, Copy, Star, Users, Baby
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const templateIcons = {
  heart: Heart, cake: Cake, sparkles: Sparkles, briefcase: Briefcase, baby: Baby, shield: Star
};

const GiftHealthCards = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState({});
  const [selected, setSelected] = useState('general');
  const [amount, setAmount] = useState(999);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState(1); // 1=choose, 2=details, 3=success
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    buyer_name: '', buyer_phone: '', recipient_name: '', recipient_phone: '', personal_message: ''
  });
  const [giftCard, setGiftCard] = useState(null);

  useEffect(() => {
    fetchTemplates();
    // Check for payment return
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (orderId) {
      fetch(`${API}/api/payments/cashfree/verify/${orderId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.gift_card) {
            setGiftCard(data.gift_card);
            setStep(3);
            toast.success('Gift card purchased and activated!');
          }
        })
        .catch(() => {});
    }
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/api/gift-cards/templates`);
      setTemplates(res.data.templates || {});
    } catch (e) { /* silent */ }
  };

  const template = templates[selected] || {};
  const Icon = templateIcons[template.emoji] || Gift;
  const finalAmount = customAmount ? parseInt(customAmount) : amount;

  const handlePurchase = async () => {
    if (!form.buyer_name || !form.buyer_phone || !form.recipient_name || !form.recipient_phone) {
      toast.error('Please fill all required fields');
      return;
    }
    if (finalAmount < 100) {
      toast.error('Minimum amount is Rs.100');
      return;
    }
    setLoading(true);
    try {
      // Step 1: Create gift card record
      const gcRes = await axios.post(`${API}/api/gift-cards/purchase`, {
        ...form,
        amount: finalAmount,
        template: selected,
        delivery_method: 'whatsapp'
      });
      
      if (!gcRes.data.success) {
        toast.error('Failed to create gift card');
        return;
      }

      const giftCardId = gcRes.data.gift_card.id;

      // Step 2: Create Cashfree order
      const payRes = await fetch(`${API}/api/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `GC_${Date.now()}`,
          customer_name: form.buyer_name.trim(),
          customer_email: `${form.buyer_phone}@nevikacura.com`,
          customer_phone: form.buyer_phone.replace(/\D/g, ''),
          amount: finalAmount,
          product_type: 'gift_card',
          product_id: giftCardId,
          return_url: `${window.location.origin}/gift-cards?order_id=`,
        }),
      });
      const payData = await payRes.json();

      if (payData.success && payData.payment_session_id) {
        toast.success('Redirecting to payment...');
        if (window.Cashfree) {
          const cashfree = window.Cashfree({ mode: 'production' });
          cashfree.checkout({ paymentSessionId: payData.payment_session_id, redirectTarget: '_self' });
        } else {
          window.location.href = payData.payment_link || '#';
        }
      } else {
        toast.error(payData.detail || 'Payment setup failed');
      }
    } catch (e) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (giftCard?.code) {
      navigator.clipboard.writeText(giftCard.code);
      toast.success('Code copied!');
    }
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `${form.recipient_name || giftCard?.recipient_name}, you've received a Health Gift Card worth Rs.${giftCard?.amount || finalAmount} from ${form.buyer_name || giftCard?.buyer_name}!\n\n` +
      `Code: ${giftCard?.code}\n${form.personal_message ? `Message: "${form.personal_message}"\n` : ''}` +
      `\nRedeem at Nevika Cura for lab tests, doctor consultations, or medicines. Valid for 6 months.`
    );
    const phone = form.recipient_phone || giftCard?.recipient_phone || '';
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24" data-testid="gift-cards-page">
      {/* Header */}
      <div className={`bg-gradient-to-br ${template.bg_gradient || 'from-teal-500 to-emerald-500'} text-white px-4 pt-12 pb-8 transition-all duration-500`}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="p-2 rounded-full bg-white/20" data-testid="gift-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Gift Health</h1>
        </div>

        {step < 3 && (
          <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{template.title || 'Gift of Health'}</h2>
                <p className="text-xs text-white/80">{template.subtitle || 'Because you care'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">Rs.{finalAmount}</p>
              <p className="text-xs text-white/70">Valid for 6 months</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        {/* Step 1: Choose Template & Amount */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Occasion */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Choose Occasion</h3>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(templates).map(([key, t]) => {
                  const TIcon = templateIcons[t.emoji] || Gift;
                  return (
                    <button key={key} onClick={() => { setSelected(key); setAmount(t.suggested_amounts?.[0] || 999); }}
                      className={`p-3 rounded-xl text-center transition-all border ${
                        selected === key
                          ? 'bg-teal-50 border-teal-300 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`} data-testid={`gift-template-${key}`}>
                      <TIcon className={`w-5 h-5 mx-auto mb-1 ${selected === key ? 'text-teal-500' : 'text-gray-400'}`} />
                      <p className="text-[10px] font-medium text-gray-700 leading-tight">{t.title?.split(' ').slice(-1)[0]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Amount</h3>
              <div className="flex gap-2 flex-wrap">
                {(template.suggested_amounts || [500, 999, 1999, 2999]).map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      amount === a && !customAmount
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
                    }`} data-testid={`gift-amount-${a}`}>
                    Rs.{a.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                  placeholder="Custom amount" min="100" max="50000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-teal-400 outline-none text-gray-800"
                  data-testid="gift-custom-amount" />
              </div>
            </div>

            <button onClick={() => setStep(2)}
              className="w-full py-3.5 bg-teal-500 text-white font-bold rounded-2xl hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
              data-testid="gift-next-btn">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Your Details</h3>
              <input type="text" placeholder="Your Name" value={form.buyer_name}
                onChange={e => setForm({...form, buyer_name: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:border-teal-400 outline-none"
                data-testid="gift-buyer-name" />
              <input type="tel" placeholder="Your Phone" value={form.buyer_phone}
                onChange={e => setForm({...form, buyer_phone: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:border-teal-400 outline-none"
                data-testid="gift-buyer-phone" />
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Recipient Details</h3>
              <input type="text" placeholder="Recipient Name" value={form.recipient_name}
                onChange={e => setForm({...form, recipient_name: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:border-teal-400 outline-none"
                data-testid="gift-recipient-name" />
              <input type="tel" placeholder="Recipient Phone (WhatsApp)" value={form.recipient_phone}
                onChange={e => setForm({...form, recipient_phone: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:border-teal-400 outline-none"
                data-testid="gift-recipient-phone" />
              <textarea placeholder="Personal message (optional)" value={form.personal_message}
                onChange={e => setForm({...form, personal_message: e.target.value})} rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:border-teal-400 outline-none resize-none"
                data-testid="gift-message" />
            </div>

            <button onClick={handlePurchase} disabled={loading}
              className="w-full py-3.5 bg-teal-500 text-white font-bold rounded-2xl hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="gift-purchase-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Pay Rs.{finalAmount} & Send Gift
            </button>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && giftCard && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Gift Card Ready!</h2>
              <p className="text-sm text-gray-500 mb-4">Send it to {form.recipient_name} now</p>

              <div className={`bg-gradient-to-br ${template.bg_gradient || 'from-teal-500 to-emerald-500'} rounded-2xl p-5 text-white mb-4`}>
                <p className="text-xs text-white/70 mb-1">{template.title}</p>
                <p className="text-3xl font-bold mb-3">Rs.{finalAmount}</p>
                <button onClick={copyCode} className="bg-white/20 px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                  data-testid="gift-copy-code">
                  <span className="font-mono font-bold tracking-wider">{giftCard.code}</span>
                  <Copy className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-white/60 mt-2">Valid until {new Date(giftCard.expires_at).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={shareWhatsApp}
                className="py-3 bg-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                data-testid="gift-share-whatsapp">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              <button onClick={() => { setStep(1); setGiftCard(null); setForm({ buyer_name: '', buyer_phone: '', recipient_name: '', recipient_phone: '', personal_message: '' }); }}
                className="py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2"
                data-testid="gift-buy-another">
                <Gift className="w-4 h-4" /> Buy Another
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default GiftHealthCards;
