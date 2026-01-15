/**
 * Staff Portal Shared UI Components
 * Reusable UI elements for staff portal views
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Package, RefreshCw, Loader2 } from 'lucide-react';
import { getStatusColor } from './staffUtils';

/**
 * Date Navigation Component
 * Shows a row of date buttons for quick navigation
 */
export const DateNavigation = ({ 
  currentDate, 
  onDateChange, 
  dateRange = [-2, -1, 0, 1, 2],
  dateCounts = {},
  colorClass = 'bg-teal-500'
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {dateRange.map(offset => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        const dateStr = d.toISOString().split('T')[0];
        const counts = dateCounts[dateStr];
        const isSelected = dateStr === currentDate;
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        return (
          <button
            key={offset}
            onClick={() => onDateChange(dateStr)}
            className={`flex flex-col items-center px-3 py-2 rounded-lg min-w-[60px] transition-colors ${
              isSelected 
                ? `${colorClass} text-white` 
                : offset === 0
                ? 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
            data-testid={`date-nav-${offset}`}
          >
            <span className="text-xs">{dayNames[d.getDay()]}</span>
            <span className="font-semibold">{d.getDate()}</span>
            {offset === 0 && !isSelected && <span className="text-[10px]">Today</span>}
            {counts && (
              <span className={`text-xs ${isSelected ? 'opacity-80' : 'text-gray-500'}`}>
                {counts.total || counts}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Status Badge Component
 */
export const StatusBadge = ({ status, className = '' }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)} ${className}`}>
    {status}
  </span>
);

/**
 * Loading Spinner Component
 */
export const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-2" />
    <p className="text-gray-500 text-sm">{text}</p>
  </div>
);

/**
 * Empty State Component
 */
export const EmptyState = ({ icon: Icon = Package, title, subtitle }) => (
  <div className="text-center py-12 bg-gray-50 rounded-lg">
    <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
    <p className="text-gray-500">{title}</p>
    {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
  </div>
);

/**
 * Refresh Button Component
 */
export const RefreshButton = ({ onClick, isRefreshing, className = '' }) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    disabled={isRefreshing}
    className={className}
  >
    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
  </Button>
);

/**
 * Section Header Component
 */
export const SectionHeader = ({ icon: Icon, title, action, className = '' }) => (
  <div className={`flex items-center justify-between mb-4 ${className}`}>
    <h2 className="font-semibold text-lg flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-teal-500" />}
      {title}
    </h2>
    {action}
  </div>
);

/**
 * Order Card Component (for Pharmacy/Diagnostic orders)
 */
export const OrderCard = ({ 
  order, 
  type = 'pharmacy',
  onStatusChange,
  statusOptions = []
}) => {
  const colorMap = {
    pharmacy: 'orange',
    diagnostic: 'purple'
  };
  const color = colorMap[type] || 'gray';
  
  return (
    <Card className={`p-4 border-l-4 border-${color}-400`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-medium">{order.patient_name}</span>
          <StatusBadge status={order.status} className="ml-2" />
        </div>
        <span className="text-sm text-gray-500">{order.patient_phone}</span>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        {type === 'pharmacy' 
          ? order.medicines?.map(m => `${m.name} (${m.quantity})`).join(', ')
          : order.tests?.join(', ')
        }
      </div>
      
      {statusOptions.length > 0 && onStatusChange && (
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map(status => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(order.id, status)}
              className="text-xs"
            >
              {status}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
};

export default {
  DateNavigation,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  RefreshButton,
  SectionHeader,
  OrderCard
};
