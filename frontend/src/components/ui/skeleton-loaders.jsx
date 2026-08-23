import React from 'react';

/**
 * Skeleton Loading Components
 * Content-shaped placeholders that match actual component layouts
 */

// Base skeleton with shimmer animation
export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
    style={{ animation: 'shimmer 1.5s infinite' }}
    {...props}
  />
);

// Medicine Card Skeleton (for Pharmacy)
export const MedicineCardSkeleton = () => (
  <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-hidden">
    {/* Image placeholder */}
    <div className="h-28 bg-zinc-800 animate-pulse" />
    
    {/* Content */}
    <div className="p-3.5 space-y-3">
      {/* Form type */}
      <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
      {/* Medicine name */}
      <div className="h-4 w-full bg-zinc-700 rounded animate-pulse" />
      <div className="h-4 w-3/4 bg-zinc-700 rounded animate-pulse" />
      
      {/* Price and button */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <div className="h-5 w-20 bg-zinc-700 rounded animate-pulse" />
        <div className="h-9 w-16 bg-orange-500/30 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

// Medicine Grid Skeleton
export const MedicineGridSkeleton = ({ count = 10 }) => (
  <div className="max-w-7xl mx-auto px-3 py-4">
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {[...Array(count)].map((_, i) => (
        <MedicineCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Doctor Card Skeleton (for DiaGyn)
export const DoctorCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
    {/* Header with gradient */}
    <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
    
    {/* Avatar placeholder */}
    <div className="relative px-4 -mt-10">
      <div className="w-20 h-20 rounded-full bg-gray-300 border-4 border-white animate-pulse" />
    </div>
    
    {/* Content */}
    <div className="p-4 space-y-3">
      {/* Name */}
      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
      {/* Specialty */}
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      {/* Rating */}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      {/* Availability */}
      <div className="flex gap-2 pt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-8 h-10 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      {/* Button */}
      <div className="h-10 w-full bg-teal-100 rounded-xl animate-pulse mt-3" />
    </div>
  </div>
);

// Lab Test Card Skeleton (for Mango Labs)
export const LabTestCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-4">
    <div className="flex items-start gap-3">
      {/* Icon placeholder */}
      <div className="w-12 h-12 rounded-xl bg-green-100 animate-pulse" />
      
      <div className="flex-1 space-y-2">
        {/* Test name */}
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        {/* Description */}
        <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
        
        {/* Price and button row */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-20 bg-green-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

// Order Card Skeleton
export const OrderCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
    <div className="flex items-center justify-between mb-3">
      {/* Order ID */}
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      {/* Status badge */}
      <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
    </div>
    
    {/* Items */}
    <div className="space-y-2 mb-3">
      <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
    </div>
    
    {/* Footer */}
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  </div>
);

// Appointment Card Skeleton
export const AppointmentCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
    <div className="flex items-start gap-3">
      {/* Doctor avatar */}
      <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
      
      <div className="flex-1 space-y-2">
        {/* Doctor name */}
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        {/* Specialty */}
        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        {/* Date & Time */}
        <div className="flex gap-4 pt-1">
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      {/* Status */}
      <div className="h-6 w-16 bg-teal-100 rounded-full animate-pulse" />
    </div>
  </div>
);

// List Skeleton (generic)
export const ListSkeleton = ({ count = 5, ItemSkeleton = OrderCardSkeleton }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <ItemSkeleton key={i} />
    ))}
  </div>
);

// Search Results Skeleton
export const SearchResultsSkeleton = ({ count = 5 }) => (
  <div className="space-y-2">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

// Profile Skeleton
export const ProfileSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Avatar and name */}
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
      <div className="space-y-2">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-xl p-4 space-y-2">
          <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
      ))}
    </div>
    
    {/* Menu items */}
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

// Home Greeting Skeleton
export const GreetingSkeleton = () => (
  <div className="px-4 pt-4 pb-1">
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Skeleton className="h-6 w-48 mb-3" />
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5">
          <Skeleton className="w-4 h-4 rounded" />
          <div className="flex-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-2.5 w-24 mt-1" /></div>
        </div>
      </div>
    </div>
  </div>
);

// Timeline Event Skeleton
export const TimelineEventSkeleton = () => (
  <div className="relative pl-12 mb-3">
    <div className="absolute left-[13px] top-4 w-[14px] h-[14px] rounded-full bg-white/10" />
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  </div>
);

export const TimelineSkeleton = ({ count = 4 }) => (
  <div className="px-4 pt-4">
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-white/5" />
      {Array.from({ length: count }).map((_, i) => <TimelineEventSkeleton key={i} />)}
    </div>
  </div>
);


// Add shimmer keyframes to global styles
export const SkeletonStyles = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `}</style>
);

export default Skeleton;
