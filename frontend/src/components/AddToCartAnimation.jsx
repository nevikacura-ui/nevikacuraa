import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Pill, Package, FlaskConical } from 'lucide-react';

// Context for managing cart animations globally
const CartAnimationContext = createContext();

export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) {
    throw new Error('useCartAnimation must be used within a CartAnimationProvider');
  }
  return context;
};

// Flying item component
const FlyingItem = ({ id, startX, startY, endX, endY, type, onComplete }) => {
  const [style, setStyle] = useState({
    left: startX,
    top: startY,
    opacity: 1,
    transform: 'scale(1) rotate(0deg)',
  });

  useEffect(() => {
    // Start animation after mount
    const timer = setTimeout(() => {
      setStyle({
        left: endX,
        top: endY,
        opacity: 0,
        transform: 'scale(0.3) rotate(360deg)',
      });
    }, 50);

    // Cleanup after animation
    const cleanup = setTimeout(() => {
      onComplete(id);
    }, 600);

    return () => {
      clearTimeout(timer);
      clearTimeout(cleanup);
    };
  }, [endX, endY, id, onComplete]);

  const Icon = type === 'lab' ? FlaskConical : type === 'pharmacy' ? Pill : Package;
  const bgColor = type === 'lab' ? 'from-green-500 to-emerald-500' : 'from-orange-500 to-amber-500';

  return (
    <div
      className={`fixed z-[9999] pointer-events-none`}
      style={{
        left: style.left,
        top: style.top,
        opacity: style.opacity,
        transform: style.transform,
        transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${bgColor} flex items-center justify-center shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
};

// Cart bounce effect component
const CartBounce = ({ active, children }) => {
  return (
    <div
      className={`transition-transform duration-200 ${active ? 'scale-125' : 'scale-100'}`}
      style={{
        animation: active ? 'cartBounce 0.4s ease-out' : 'none',
      }}
    >
      {children}
    </div>
  );
};

// Provider component
export const CartAnimationProvider = ({ children }) => {
  const [flyingItems, setFlyingItems] = useState([]);
  const [cartBouncing, setCartBouncing] = useState(false);
  const [cartPosition, setCartPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });

  // Update cart position when floating cart is rendered
  const updateCartPosition = useCallback((x, y) => {
    setCartPosition({ x, y });
  }, []);

  // Animation disabled - clean add to cart
  const triggerAddAnimation = useCallback(() => {}, []);

  // Remove completed animation
  const removeItem = useCallback((id) => {
    setFlyingItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Pop sound when item starts flying
  const playPopSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);

      setTimeout(() => audioContext.close(), 200);
    } catch (e) {
      // Silent fail
    }
  };

  // Success sound when item reaches cart
  const playCartSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Pleasant "ding" sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);

      setTimeout(() => audioContext.close(), 300);
    } catch (e) {
      // Silent fail
    }
  };

  const value = {
    triggerAddAnimation,
    updateCartPosition,
    cartBouncing,
    CartBounce,
  };

  return (
    <CartAnimationContext.Provider value={value}>
      {children}
      {/* Render flying items */}
      {flyingItems.map(item => (
        <FlyingItem
          key={item.id}
          {...item}
          onComplete={removeItem}
        />
      ))}
      {/* Global styles for cart bounce */}
      <style>{`
        @keyframes cartBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          50% { transform: scale(0.9); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes itemPop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </CartAnimationContext.Provider>
  );
};

export default CartAnimationProvider;
