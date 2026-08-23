import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Clock, Package, AlertTriangle, Phone, Mail } from 'lucide-react';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';
import { ProductLicenseBadge } from '@/components/TrustBadges';

const POLICIES = [
  {
    title: 'Return Eligibility',
    icon: Package,
    items: [
      'Returns accepted within 7 days of delivery for damaged, defective, or wrong products.',
      'Product must be unused, in original packaging with all tags and seals intact.',
      'Prescription medicines cannot be returned once dispensed (as per Drugs & Cosmetics Act, 1940).',
      'Temperature-sensitive medicines (insulin, vaccines) are non-returnable.',
      'Health devices and equipment can be returned within 7 days if unopened and unused.',
    ],
  },
  {
    title: 'Refund Policy',
    icon: Clock,
    items: [
      'Refunds are processed within 5-7 business days after return is received and inspected.',
      'Refund will be credited to the original payment method.',
      'For COD orders, refund will be transferred via UPI/bank account provided by the customer.',
      'CuraPay wallet refunds are processed instantly.',
      'Partial refunds may be issued if only part of the order is returned.',
    ],
  },
  {
    title: 'How to Initiate a Return',
    icon: ShieldCheck,
    items: [
      'Contact our support team via WhatsApp or call within 7 days of delivery.',
      'Provide your Order ID and reason for return.',
      'Our delivery partner will pick up the item from your address.',
      'Inspection will be completed within 48 hours of pickup.',
      'You will receive an email/SMS confirmation once the refund is processed.',
    ],
  },
  {
    title: 'Non-Returnable Items',
    icon: AlertTriangle,
    items: [
      'Opened or used medicines and health supplements.',
      'Prescription medicines once dispensed.',
      'Surgical items, syringes, and disposable medical supplies.',
      'Products with broken seals or tampered packaging.',
      'Items purchased during clearance sales (unless defective).',
    ],
  },
];

const ReturnRefundPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }} data-testid="return-refund-policy">
      <ServiceHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Return & Refund Policy</h1>
            <p className="text-xs text-white/30 mt-0.5">Effective from 1st January 2026</p>
          </div>
        </div>

        {/* Trust Banner */}
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.2)' }}>
            <ShieldCheck className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hassle-Free Returns</p>
            <p className="text-xs text-white/40 mt-0.5">7-day return window | 5-7 day refund processing | Free return pickup</p>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-5">
          {POLICIES.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`policy-section-${idx}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-orange-400" />
                  <h2 className="text-sm font-bold text-white">{section.title}</h2>
                </div>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400/40 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-white/50 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Contact for Returns */}
        <div className="mt-6 rounded-2xl p-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
          <h3 className="text-sm font-bold text-white mb-3">Need Help with a Return?</h3>
          <div className="space-y-2">
            <a href="tel:+919876543210" className="flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 transition-colors">
              <Phone className="w-3.5 h-3.5" /> Call: +91 98765 43210
            </a>
            <a href="mailto:support@nevikacura.com" className="flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Email: support@nevikacura.com
            </a>
          </div>
          <p className="text-[10px] text-white/25 mt-3">Available Mon-Sat, 9 AM - 9 PM IST</p>
        </div>

        {/* License Badge */}
        <ProductLicenseBadge />

        {/* Legal Footer */}
        <div className="mt-6 text-center">
          <p className="text-[9px] text-white/15 leading-relaxed">
            This policy is governed by the Consumer Protection Act, 2019 and the Drugs & Cosmetics Act, 1940.
            Nevika Cura Health Pvt Ltd reserves the right to modify this policy. Changes will be communicated via email.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default ReturnRefundPolicy;
