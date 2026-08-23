import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

/**
 * LuxuryNotification Component
 * Beautiful, animated notification for confirmations
 * 
 * @param {string} type - 'welcome' | 'order' | 'appointment' | 'booking'
 * @param {string} message - Main message text
 * @param {string} subtitle - Optional subtitle
 * @param {function} onClose - Callback when closed
 * @param {number} duration - Auto-dismiss duration (ms), 0 = no auto-dismiss
 */
const LuxuryNotification = ({ 
  type = 'welcome',
  message = 'Welcome!',
  subtitle = '',
  onClose,
  duration = 4000,
  show = true
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (duration > 0 && isVisible) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isVisible]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const getGradient = () => {
    switch(type) {
      case 'welcome':
        return 'from-emerald-600 via-teal-500 to-cyan-400';
      case 'order':
        return 'from-orange-500 via-amber-500 to-yellow-400';
      case 'appointment':
        return 'from-rose-500 via-pink-500 to-fuchsia-400';
      case 'booking':
        return 'from-teal-500 via-emerald-500 to-green-400';
      default:
        return 'from-emerald-600 via-teal-500 to-cyan-400';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'welcome':
        return <Sparkles className="w-6 h-6" />;
      case 'order':
      case 'appointment':
      case 'booking':
      default:
        return <CheckCircle2 className="w-6 h-6" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] p-4 transition-all duration-300 ${
        isExiting ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}
      data-testid="luxury-notification"
    >
      {/* Main notification card */}
      <div className={`
        relative overflow-hidden
        bg-gradient-to-r ${getGradient()}
        rounded-2xl shadow-2xl
        p-4 mx-auto max-w-md
        backdrop-blur-xl
        border border-white/20
      `}>
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shine" />
        
        {/* Sparkle decorations */}
        <div className="absolute top-2 right-12 w-2 h-2 bg-white/60 rounded-full animate-pulse" />
        <div className="absolute bottom-3 right-20 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse delay-200" />
        <div className="absolute top-4 left-1/4 w-1 h-1 bg-white/50 rounded-full animate-pulse delay-500" />
        
        {/* Content */}
        <div className="relative flex items-center gap-4">
          {/* Icon with glow effect */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse" />
              <div className="relative w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg">
                <div className="text-white drop-shadow-lg">
                  {getIcon()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg tracking-wide drop-shadow-md">
              {message}
            </h3>
            {subtitle && (
              <p className="text-white/80 text-sm mt-0.5 drop-shadow-sm">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 
                       flex items-center justify-center transition-colors
                       border border-white/20"
            data-testid="close-notification-btn"
          >
            <X className="w-4 h-4 text-white/90" />
          </button>
        </div>
        
        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-white/50 rounded-full"
              style={{ 
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shine {
          animation: shine 2s infinite;
        }
      `}</style>
    </div>
  );
};

/**
 * Custom toast function to show luxury notification
 * Usage: showLuxuryToast({ type: 'welcome', message: 'Welcome!' })
 */
export const showLuxuryToast = (props) => {
  const container = document.createElement('div');
  container.id = 'luxury-toast-container';
  document.body.appendChild(container);

  const handleClose = () => {
    const existing = document.getElementById('luxury-toast-container');
    if (existing) {
      existing.remove();
    }
  };

  // Render the component
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(<LuxuryNotification {...props} onClose={handleClose} />);
  });
};

export default LuxuryNotification;
