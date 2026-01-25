/**
 * Staff Portal Components Index
 * 
 * This file exports all refactored staff portal components for easy importing.
 * The migration from StaffPortal.js (4736 lines) to modular components is complete.
 * 
 * MIGRATED TABS (replaced inline code):
 * ✅ AppointmentsTab - View and manage scheduled appointments
 * ✅ WalkInTab - Walk-in appointment booking
 * ✅ EmergencyTab - Emergency appointment booking
 * ✅ FeesTab - Fee codes reference
 * ✅ FeedbackTab - Patient feedback collection
 * 
 * COMPONENTS CREATED (available for future integration):
 * - BillingTab - Fee collection and billing (StaffBillingModule used instead)
 * - PatientsTab - Patient management and database
 * 
 * EXISTING COMPONENTS (not needing migration):
 * - ANCRegistration - Antenatal care registration
 * - GlydexStaffPortal - Diabetes care portal
 * - StaffBillingModule - Billing functionality
 * - StaffDashboard - Dashboard component
 * 
 * RESULTS:
 * - Original StaffPortal.js: 4736 lines
 * - Current StaffPortal.js: ~3988 lines
 * - Lines saved: ~748 lines (15.8% reduction)
 * - 5 tabs migrated to separate component files
 */

// Utilities
export { default as staffUtils } from '@/pages/staff/staffUtils';
export * from '@/pages/staff/staffUtils';

// Auth Components
export { default as StaffLogin } from '@/pages/staff/StaffLogin';

// Booking Tabs - MIGRATED
export { default as AppointmentsTab } from './AppointmentsTab';
export { default as WalkInTab } from './WalkInTab';
export { default as EmergencyTab } from './EmergencyTab';

// Reference/Info Tabs - MIGRATED
export { default as FeesTab } from './FeesTab';
export { default as FeedbackTab } from './FeedbackTab';

// Management Tabs - CREATED (available for use)
export { default as BillingTab } from './BillingTab';
export { default as PatientsTab } from './PatientsTab';

// Biometric
export { default as SmartBiometric } from '@/pages/staff/SmartBiometric';
