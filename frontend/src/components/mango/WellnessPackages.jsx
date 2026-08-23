import React from 'react';
import { CheckCircle2, FlaskConical, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CURACORE_LOGO = 'https://customer-assets.emergentagent.com/job_f435cb78-8b8c-4f4d-94bf-4259b725de5d/artifacts/bnbe6yr6_file_00000000d1287208b718f99df0749580%20%281%29.png';
const CURAPRO_LOGO = 'https://customer-assets.emergentagent.com/job_f435cb78-8b8c-4f4d-94bf-4259b725de5d/artifacts/tri0tjal_file_00000000d1287208b718f99df0749580%20%282%29.png';
const CURAELITE_LOGO = 'https://customer-assets.emergentagent.com/job_f435cb78-8b8c-4f4d-94bf-4259b725de5d/artifacts/b2s43kq9_file_00000000d1287208b718f99df0749580%20%283%29.png';

const wellnessPackages = [
  {
    id: 'curacore',
    name: 'CuraCore',
    subtitle: 'Mango Wellness Series',
    logo: CURACORE_LOGO,
    price: 999,
    gradient: 'linear-gradient(135deg, #FDBA74 0%, #FB923C 50%, #F97316 100%)',
    accentColor: '#F97316',
    borderColor: 'rgba(249,115,22,0.3)',
    tests: [
      'CBC',
      'Liver Function Test',
      'Renal Function Test',
      'Lipid Profile',
      'Thyroid Profile',
      'HbA1c',
      'Urine Routine',
    ],
  },
  {
    id: 'curapro',
    name: 'CuraPro',
    subtitle: 'Mango Wellness Series',
    logo: CURAPRO_LOGO,
    price: 1599,
    gradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 50%, #C2410C 100%)',
    accentColor: '#EA580C',
    borderColor: 'rgba(234,88,12,0.4)',
    badgeText: 'Recommended',
    tests: [
      'CBC',
      'Liver Function Test',
      'Renal Function Test',
      'Lipid Profile',
      'Thyroid Profile',
      'HbA1c',
      'Vitamin B12',
      'Vitamin D3',
      'Cardiac Markers',
      'Urine Routine',
    ],
  },
  {
    id: 'curaelite',
    name: 'CuraElite',
    subtitle: 'Mango Wellness Series',
    logo: CURAELITE_LOGO,
    price: 1999,
    gradient: 'linear-gradient(135deg, #EA580C 0%, #C2410C 50%, #9A3412 100%)',
    accentColor: '#C2410C',
    borderColor: 'rgba(194,65,12,0.5)',
    badgeText: 'Best Value',
    tests: [
      'CBC',
      'Liver Function Test',
      'Renal Function Test',
      'Lipid Profile',
      'Thyroid Profile',
      'HbA1c',
      'Vitamin B12',
      'Vitamin D3',
      'Cardiac Markers',
      'Iron Studies',
      'Urine Routine',
      'Electrolytes',
      'Arthritis Profile',
    ],
  },
];

export default function WellnessPackages({ onAddToCart }) {
  return (
    <div className="w-full px-4 mt-8 max-w-5xl mx-auto" data-testid="wellness-packages-section">
      <div className="mb-5">
        <h2
          className="text-xl font-bold text-stone-900"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Mango <span style={{ color: '#10B981' }}>Wellness</span> Series
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Comprehensive health packages curated for complete wellness
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {wellnessPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="min-w-[280px] max-w-[320px] flex-shrink-0 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 flex flex-col"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
            }}
            data-testid={`wellness-pkg-${pkg.id}`}
          >
            {/* Gradient Header */}
            <div
              className="px-5 pt-5 pb-4 relative"
              style={{ background: pkg.gradient }}
            >
              {pkg.badgeText && (
                <span
                  className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    color: '#fff',
                    backdropFilter: 'blur(8px)',
                  }}
                  data-testid={`wellness-badge-${pkg.id}`}
                >
                  {pkg.badgeText}
                </span>
              )}
              <img
                src={pkg.logo}
                alt={pkg.name}
                className="h-10 object-contain mb-2"
                width="120"
                height="40"
                loading="lazy"
                decoding="async"
                data-testid={`wellness-logo-${pkg.id}`}
              />
              <div className="flex items-center justify-between">
                <p className="text-white/80 text-xs font-medium tracking-wide">
                  {pkg.subtitle}
                </p>
                <span className="text-white text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {pkg.tests.length} Tests
                </span>
              </div>
            </div>

            {/* Tests List */}
            <div className="px-5 pt-4 pb-3 flex-1">
              <div className="flex items-center gap-1.5 mb-3">
                <FlaskConical className="w-3.5 h-3.5" style={{ color: pkg.accentColor }} />
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  {pkg.tests.length} Tests Included
                </span>
              </div>
              <ul className="space-y-1.5">
                {pkg.tests.map((test) => (
                  <li
                    key={test}
                    className="flex items-center gap-2 text-sm text-stone-700"
                  >
                    <CheckCircle2
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: pkg.accentColor }}
                    />
                    <span>{test}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price & CTA */}
            <div
              className="px-5 pb-5 pt-3 mt-auto"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-[11px] text-stone-400 uppercase tracking-wide">
                    Package Price
                  </p>
                  <p className="text-2xl font-bold text-stone-900">
                    <span className="text-lg" style={{ color: pkg.accentColor }}>
                      &#8377;
                    </span>
                    {pkg.price.toLocaleString('en-IN')}
                  </p>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-1 rounded-full"
                  style={{
                    background: `${pkg.accentColor}12`,
                    color: pkg.accentColor,
                    border: `1px solid ${pkg.accentColor}30`,
                  }}
                >
                  Save up to 40%
                </span>
              </div>
              <Button
                className="w-full rounded-xl font-semibold py-3 text-white transition-all active:translate-y-[2px] active:shadow-none"
                style={{
                  background: pkg.gradient,
                  boxShadow: `0 4px 0 ${pkg.accentColor}, 0 6px 16px ${pkg.accentColor}40`,
                }}
                onClick={() =>
                  onAddToCart?.({
                    name: `${pkg.name} - Mango Wellness Series`,
                    price: pkg.price,
                    parameters: pkg.tests.length,
                    tests: pkg.tests,
                  })
                }
                data-testid={`wellness-add-${pkg.id}`}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
