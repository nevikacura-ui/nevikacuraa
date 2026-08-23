import React from 'react';
import { Shield } from 'lucide-react';
import { useThemeLanguage } from '@/context/ThemeLanguageContext';

const FooterBadge = () => {
  const { isDarkMode } = useThemeLanguage();

  return (
    <div className="flex items-center justify-center py-6 mt-4" data-testid="footer-badge">
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full"
        style={isDarkMode ? {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        } : {
          background: 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <Shield className="w-3.5 h-3.5" style={{ color: isDarkMode ? 'rgba(20,184,166,0.6)' : 'rgba(20,184,166,0.8)' }} />
        <span
          className="text-[10px] font-semibold tracking-wider uppercase"
          style={isDarkMode ? {
            background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          } : {
            color: '#57534E',
          }}
        >
          Powered by Nevika Cura
        </span>
      </div>
    </div>
  );
};

export default FooterBadge;
