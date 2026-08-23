import React from 'react';

/* Badge images — actual brand stamps */

const PHARMACY_BADGE_URL = "https://customer-assets.emergentagent.com/job_562b50e2-8e75-4b3c-a379-dea7e06c89db/artifacts/meqljrlw_file_00000000a6bc7208999d0f2ce2f08d95.png";
const MANGO_BADGE_DARK_URL = "https://customer-assets.emergentagent.com/job_562b50e2-8e75-4b3c-a379-dea7e06c89db/artifacts/rkzofqdj_file_0000000093607208a1af436d3de996d5.png";
const MANGO_BADGE_LIGHT_URL = "https://customer-assets.emergentagent.com/job_562b50e2-8e75-4b3c-a379-dea7e06c89db/artifacts/dpg3h8fr_file_00000000f7707208ad1c6a7a11b90b66.png";

/* Wrapper with explicit warm-cream background so the white portions
   of the badge image vanish via mix-blend-mode: multiply */
const BadgeWrapper = ({ children, testId }) => (
  <div
    className="flex justify-center py-3"
    data-testid={testId}
    style={{
      backgroundColor: '#FFF8F0',
      isolation: 'auto',
    }}
  >
    {children}
  </div>
);

export const PharmacyStampBadge = () => (
  <BadgeWrapper testId="pharmacy-trust-stamp">
    <img
      src={PHARMACY_BADGE_URL}
      alt="Orange Pharmacy - Lowest Price, Genuine Quality, FSSAI Licensed"
      className="w-44 h-auto object-contain"
      style={{ mixBlendMode: 'multiply', filter: 'contrast(1.05)' }}
      loading="lazy"
    />
  </BadgeWrapper>
);

export const MangoStampBadge = ({ variant = 'dark' }) => (
  <BadgeWrapper testId="mango-trust-stamp">
    <img
      src={variant === 'light' ? MANGO_BADGE_LIGHT_URL : MANGO_BADGE_DARK_URL}
      alt="Mango Health Labs - Precision Diagnostics, Trusted Labs, NABL & CAP Accredited"
      className="w-44 h-auto object-contain"
      style={{ mixBlendMode: 'multiply', filter: 'contrast(1.05)' }}
      loading="lazy"
    />
  </BadgeWrapper>
);
