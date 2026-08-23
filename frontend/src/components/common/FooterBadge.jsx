import React from 'react';
import { Shield } from 'lucide-react';

const FooterBadge = () => (
  <div className="flex items-center justify-center py-6 mt-4" data-testid="footer-badge">
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Shield className="w-3.5 h-3.5 text-teal-400/60" />
      <span
        className="text-[10px] font-semibold tracking-wider uppercase"
        style={{
          background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Powered by Nevika Cura
      </span>
    </div>
  </div>
);

export default FooterBadge;
