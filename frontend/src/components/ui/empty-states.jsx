import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Search, 
  Package, 
  Calendar, 
  FileText, 
  FlaskConical,
  Clock,
  Heart,
  Pill,
  Stethoscope,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Empty State Illustrations
 * Friendly, helpful illustrations for empty/no-content states
 */

// Base empty state component
const EmptyState = ({ 
  icon: Icon,
  iconBgColor = 'bg-gray-100',
  iconColor = 'text-gray-400',
  title,
  description,
  primaryAction,
  secondaryAction,
  illustration,
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    {/* Illustration or Icon */}
    <div className="relative mb-6">
      {illustration ? (
        <div className="text-6xl">{illustration}</div>
      ) : (
        <div className={`w-20 h-20 rounded-full ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`w-10 h-10 ${iconColor}`} />
        </div>
      )}
      {/* Decorative elements */}
      <div className="absolute -top-2 -right-2 w-4 h-4 bg-gray-200 rounded-full animate-pulse" />
      <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-gray-300 rounded-full animate-pulse delay-100" />
    </div>
    
    {/* Text */}
    <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm max-w-xs mb-6">{description}</p>
    
    {/* Actions */}
    <div className="flex flex-col sm:flex-row gap-3">
      {primaryAction && (
        <Button 
          onClick={primaryAction.onClick}
          className={primaryAction.className || "bg-teal-600 hover:bg-teal-700 text-white"}
        >
          {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
          {primaryAction.label}
        </Button>
      )}
      {secondaryAction && (
        <Button 
          variant="outline"
          onClick={secondaryAction.onClick}
          className={secondaryAction.className}
        >
          {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2" />}
          {secondaryAction.label}
        </Button>
      )}
    </div>
  </div>
);

// Empty Cart
export const EmptyCart = ({ onBrowse, type = 'pharmacy' }) => {
  const navigate = useNavigate();
  
  const config = {
    pharmacy: {
      illustration: '🛒💨',
      title: 'Your cart feels lonely!',
      description: 'Add some health essentials to get started. We have 6,000+ medicines ready for you.',
      primaryAction: {
        label: 'Browse Pharmacy',
        icon: Pill,
        onClick: () => navigate('/pharmacy'),
        className: 'bg-orange-500 hover:bg-orange-600 text-white',
      },
    },
    lab: {
      illustration: '🧪✨',
      title: 'No tests selected',
      description: 'Choose from 500+ lab tests with home sample collection.',
      primaryAction: {
        label: 'Explore Tests',
        icon: FlaskConical,
        onClick: () => navigate('/mango'),
        className: 'bg-green-500 hover:bg-green-600 text-white',
      },
    },
  };
  
  const c = config[type] || config.pharmacy;
  
  return (
    <EmptyState
      illustration={c.illustration}
      title={c.title}
      description={c.description}
      primaryAction={c.primaryAction}
    />
  );
};

// No Search Results
export const NoSearchResults = ({ query, onClear, type = 'generic' }) => {
  const config = {
    pharmacy: {
      iconBgColor: 'bg-orange-100',
      iconColor: 'text-orange-500',
      title: `No medicines found for "${query}"`,
      description: 'Try a different search term or browse our categories.',
    },
    lab: {
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-500',
      title: `No tests found for "${query}"`,
      description: 'Try searching for a different test or health package.',
    },
    generic: {
      iconBgColor: 'bg-gray-100',
      iconColor: 'text-gray-500',
      title: `No results for "${query}"`,
      description: 'Try a different search term.',
    },
  };
  
  const c = config[type] || config.generic;
  
  return (
    <EmptyState
      icon={Search}
      iconBgColor={c.iconBgColor}
      iconColor={c.iconColor}
      title={c.title}
      description={c.description}
      primaryAction={onClear && {
        label: 'Clear Search',
        icon: RefreshCw,
        onClick: onClear,
        className: 'bg-gray-600 hover:bg-gray-700 text-white',
      }}
    />
  );
};

// No Orders
export const NoOrders = ({ onBrowse }) => {
  const navigate = useNavigate();
  
  return (
    <EmptyState
      illustration="📦🕐"
      title="No orders yet"
      description="Your first order is just a tap away! Start shopping and we'll deliver to your doorstep."
      primaryAction={{
        label: 'Start Shopping',
        icon: ShoppingCart,
        onClick: () => navigate('/pharmacy'),
        className: 'bg-orange-500 hover:bg-orange-600 text-white',
      }}
      secondaryAction={{
        label: 'Book Lab Test',
        icon: FlaskConical,
        onClick: () => navigate('/mango'),
      }}
    />
  );
};

// No Appointments
export const NoAppointments = ({ onBook }) => {
  const navigate = useNavigate();
  
  return (
    <EmptyState
      illustration="📅✨"
      title="No upcoming appointments"
      description="Book a consultation with our expert doctors. Same-day appointments available!"
      primaryAction={{
        label: 'Book Appointment',
        icon: Calendar,
        onClick: () => navigate('/diagyn'),
        className: 'bg-teal-600 hover:bg-teal-700 text-white',
      }}
    />
  );
};

// No Lab Results
export const NoLabResults = ({ onBookTest }) => {
  const navigate = useNavigate();
  
  return (
    <EmptyState
      illustration="🔬⏳"
      title="No reports yet"
      description="Your lab reports will appear here once your tests are processed. Usually takes 24-48 hours."
      primaryAction={{
        label: 'Book a Test',
        icon: FlaskConical,
        onClick: () => navigate('/mango'),
        className: 'bg-green-500 hover:bg-green-600 text-white',
      }}
    />
  );
};

// No Prescriptions
export const NoPrescriptions = ({ onUpload }) => (
  <EmptyState
    illustration="📋💊"
    title="No prescriptions saved"
    description="Upload your prescriptions and we'll help you order medicines quickly."
    primaryAction={onUpload && {
      label: 'Upload Prescription',
      icon: FileText,
      onClick: onUpload,
      className: 'bg-blue-500 hover:bg-blue-600 text-white',
    }}
  />
);

// No Favorites/Wishlist
export const NoFavorites = ({ onBrowse }) => {
  const navigate = useNavigate();
  
  return (
    <EmptyState
      illustration="❤️✨"
      title="No favorites yet"
      description="Save medicines you frequently order for quick access."
      primaryAction={{
        label: 'Browse Medicines',
        icon: Pill,
        onClick: () => navigate('/pharmacy'),
        className: 'bg-pink-500 hover:bg-pink-600 text-white',
      }}
    />
  );
};

// No Reminders
export const NoReminders = ({ onAdd }) => (
  <EmptyState
    illustration="⏰💊"
    title="No reminders set"
    description="Never miss a dose! Set up medicine reminders to stay on track with your health."
    primaryAction={onAdd && {
      label: 'Add Reminder',
      icon: Clock,
      onClick: onAdd,
      className: 'bg-purple-500 hover:bg-purple-600 text-white',
    }}
  />
);

// Error State
export const ErrorState = ({ onRetry, message }) => (
  <EmptyState
    illustration="😕🔧"
    title="Oops! Something went wrong"
    description={message || "We couldn't load this content. Please try again."}
    primaryAction={onRetry && {
      label: 'Try Again',
      icon: RefreshCw,
      onClick: onRetry,
      className: 'bg-red-500 hover:bg-red-600 text-white',
    }}
  />
);

// Offline State
export const OfflineState = () => (
  <EmptyState
    illustration="📡❌"
    title="You're offline"
    description="Check your internet connection and try again."
    primaryAction={{
      label: 'Retry',
      icon: RefreshCw,
      onClick: () => window.location.reload(),
      className: 'bg-gray-600 hover:bg-gray-700 text-white',
    }}
  />
);

// Coming Soon
export const ComingSoon = ({ feature = 'This feature' }) => (
  <EmptyState
    illustration="🚀✨"
    title="Coming Soon!"
    description={`${feature} is under development. We're working hard to bring it to you soon.`}
  />
);

// No Doctors Available
export const NoDoctorsAvailable = ({ onNotify }) => (
  <EmptyState
    illustration="👨‍⚕️📅"
    title="No slots available"
    description="All doctors are currently booked. Try a different date or get notified when slots open."
    primaryAction={onNotify && {
      label: 'Notify Me',
      icon: Calendar,
      onClick: onNotify,
      className: 'bg-teal-600 hover:bg-teal-700 text-white',
    }}
  />
);

export default EmptyState;
