import React from 'react';
import { Search, ShoppingBag, Calendar, Package, Bell, FileText, Heart } from 'lucide-react';

const illustrations = {
  search: { icon: Search, title: 'No results found', desc: 'Try a different search term', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  cart: { icon: ShoppingBag, title: 'Your cart is empty', desc: 'Browse medicines and add them to your cart', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  appointments: { icon: Calendar, title: 'No appointments yet', desc: 'Book your first appointment with our doctors', color: 'text-teal-400', bg: 'bg-teal-500/10' },
  orders: { icon: Package, title: 'No orders yet', desc: "Your order history will appear here", color: 'text-blue-400', bg: 'bg-blue-500/10' },
  notifications: { icon: Bell, title: 'No notifications', desc: "We'll notify you about appointments, orders & more", color: 'text-purple-400', bg: 'bg-purple-500/10' },
  prescriptions: { icon: FileText, title: 'No prescriptions', desc: 'Upload or receive prescriptions from your doctor', color: 'text-green-400', bg: 'bg-green-500/10' },
  default: { icon: Heart, title: 'Nothing here yet', desc: 'Content will appear here soon', color: 'text-pink-400', bg: 'bg-pink-500/10' },
};

const EmptyState = ({ type = 'default', title, description, action, actionText }) => {
  const config = illustrations[type] || illustrations.default;
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayDesc = description || config.desc;

  return (
    <div className="py-16 px-6 text-center" data-testid={`empty-state-${type}`}>
      {/* Animated illustration */}
      <div className="relative mx-auto w-24 h-24 mb-5">
        {/* Background rings */}
        <div className={`absolute inset-0 rounded-full ${config.bg} animate-pulse`} />
        <div className={`absolute inset-2 rounded-full ${config.bg} opacity-60`} />
        <div className={`absolute inset-4 rounded-full ${config.bg} opacity-40`} />
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`w-10 h-10 ${config.color}`} style={{ animation: 'float 3s ease-in-out infinite' }} />
        </div>
      </div>

      <h3 className="text-base font-bold text-white mb-1.5">{displayTitle}</h3>
      <p className="text-sm text-gray-500 max-w-[240px] mx-auto leading-relaxed">{displayDesc}</p>

      {action && (
        <button
          onClick={action}
          data-testid={`empty-state-${type}-action`}
          className="mt-5 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors border border-white/10"
        >
          {actionText || 'Get Started'}
        </button>
      )}

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  );
};

export default EmptyState;
