import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const BottomSheet = ({ open, onClose, children, title, showHandle = true, className = '' }) => {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  // Swipe-to-dismiss
  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };
  const onTouchEnd = () => {
    const diff = currentY.current - startY.current;
    if (diff > 80) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startY.current = 0;
    currentY.current = 0;
  };

  if (!open && !closing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500]" data-testid="bottom-sheet">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm bottom-sheet-overlay ${closing ? 'closing' : ''}`}
        onClick={handleClose}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-[#1A1A2E] border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto bottom-sheet-content ${closing ? 'closing' : ''} ${className}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-testid="bottom-sheet-content"
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-2 pb-3">
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              data-testid="bottom-sheet-close"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>
        )}
        {/* Content */}
        <div className="px-5 pb-8">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* Light mode override */
const LightBottomSheet = (props) => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return (
    <BottomSheet
      {...props}
      className={`${props.className || ''} ${!isDark ? '' : ''}`}
    />
  );
};

export { BottomSheet, LightBottomSheet };
export default BottomSheet;
