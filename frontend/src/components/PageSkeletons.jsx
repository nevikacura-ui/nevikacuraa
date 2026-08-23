import React from 'react';

/**
 * Dark-themed Skeleton Loaders for Nevika Cura
 * Content-shaped placeholders matching actual page layouts
 */

const Shimmer = ({ className = '', style = {} }) => (
  <div
    className={`rounded-xl animate-pulse ${className}`}
    style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.8s infinite', ...style }}
  />
);

// ──── Home Page ────
export const HomeSkeleton = () => (
  <div className="space-y-4 px-4 pt-4 pb-28" data-testid="home-skeleton">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2"><Shimmer className="h-5 w-32" /><Shimmer className="h-3 w-48" /></div>
      <Shimmer className="w-10 h-10 rounded-full" />
    </div>
    {/* Portals Scroller */}
    <div className="flex gap-3 overflow-hidden">
      {[1,2,3].map(i => <Shimmer key={i} className="w-72 h-40 rounded-2xl flex-shrink-0" />)}
    </div>
    {/* Quick Actions */}
    <div className="flex gap-2">
      {[1,2,3,4,5].map(i => <Shimmer key={i} className="flex-1 h-16 rounded-xl" />)}
    </div>
    {/* Cards */}
    {[1,2,3].map(i => <Shimmer key={i} className="h-24 rounded-2xl" />)}
  </div>
);

// ──── DiaGyn (Doctor Booking) ────
export const DiaGynSkeleton = () => (
  <div className="flex items-center justify-center min-h-[70vh]" data-testid="diagyn-skeleton">
    <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500" style={{ animation: 'spin 0.8s linear infinite' }} />
  </div>
);

// ──── Mango Labs (Tests) ────
export const MangoSkeleton = () => (
  <div className="space-y-4 px-4 pt-4" data-testid="mango-skeleton">
    {/* Search */}
    <Shimmer className="h-11 w-full rounded-xl" />
    {/* Categories */}
    <div className="flex gap-2 overflow-hidden">
      {[1,2,3,4,5].map(i => <Shimmer key={i} className="h-8 w-24 rounded-full flex-shrink-0" />)}
    </div>
    {/* Test Cards */}
    {[1,2,3,4].map(i => (
      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Shimmer className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-3/4" />
          <Shimmer className="h-3 w-1/2" />
        </div>
        <Shimmer className="w-16 h-8 rounded-lg" />
      </div>
    ))}
  </div>
);

// ──── Orange Pharmacy ────
export const PharmacySkeleton = () => (
  <div className="space-y-4 px-4 pt-4" data-testid="pharmacy-skeleton">
    <Shimmer className="h-11 w-full rounded-xl" />
    {/* Medicine Grid */}
    <div className="grid grid-cols-2 gap-3">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Shimmer className="h-28 w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-4 w-full" />
            <div className="flex justify-between pt-1">
              <Shimmer className="h-4 w-14" />
              <Shimmer className="h-8 w-14 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ──── Staff Portal (Queue) ────
export const StaffPortalSkeleton = () => (
  <div className="space-y-4 px-4 pt-4" data-testid="staff-skeleton">
    {/* Stats Row */}
    <div className="grid grid-cols-3 gap-2">
      {[1,2,3].map(i => (
        <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Shimmer className="h-6 w-10 mb-1" />
          <Shimmer className="h-3 w-16" />
        </div>
      ))}
    </div>
    {/* Queue Cards */}
    {[1,2,3,4,5].map(i => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Shimmer className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-3 w-36" />
        </div>
        <Shimmer className="w-20 h-8 rounded-lg" />
      </div>
    ))}
  </div>
);

// ──── Admin Dashboard ────
export const AdminSkeleton = () => (
  <div className="space-y-4 px-4 pt-4" data-testid="admin-skeleton">
    {/* KPI Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1,2,3,4].map(i => (
        <div key={i} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Shimmer className="w-8 h-8 rounded-lg mb-2" />
          <Shimmer className="h-7 w-16 mb-1" />
          <Shimmer className="h-3 w-24" />
        </div>
      ))}
    </div>
    {/* Chart Placeholder */}
    <Shimmer className="h-48 w-full rounded-2xl" />
    {/* Table Rows */}
    {[1,2,3,4].map(i => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <Shimmer className="w-8 h-8 rounded-lg" />
        <div className="flex-1 space-y-1"><Shimmer className="h-4 w-40" /><Shimmer className="h-3 w-28" /></div>
        <Shimmer className="w-16 h-6 rounded-full" />
      </div>
    ))}
  </div>
);

// ──── Generic Page Skeleton ────
export const PageSkeleton = () => (
  <div className="space-y-4 px-4 pt-4 pb-28" data-testid="page-skeleton">
    <div className="flex items-center gap-3 mb-2">
      <Shimmer className="w-9 h-9 rounded-full" />
      <div className="space-y-1.5"><Shimmer className="h-5 w-32" /><Shimmer className="h-3 w-20" /></div>
    </div>
    {[1,2,3,4,5].map(i => <Shimmer key={i} className="h-16 rounded-xl" />)}
  </div>
);

// ──── Shimmer CSS (inject once) ────
export const ShimmerCSS = () => (
  <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
);

export default { HomeSkeleton, DiaGynSkeleton, MangoSkeleton, PharmacySkeleton, StaffPortalSkeleton, AdminSkeleton, PageSkeleton };
