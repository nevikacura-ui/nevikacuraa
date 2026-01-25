/**
 * Staff Portal Components Index
 * 
 * This file exports all refactored staff portal components for easy importing.
 * The migration from StaffPortal.js (4736 lines) to modular components is in progress.
 * 
 * MIGRATED TABS (replaced inline code):
 * ✅ AppointmentsTab - View and manage scheduled appointments
 * ✅ WalkInTab - Walk-in appointment booking
 * ✅ EmergencyTab - Emergency appointment booking
 * ✅ FeesTab - Fee codes reference
 * ✅ FeedbackTab - Patient feedback collection
 * ✅ PatientsTab - Patient management and database
 * ✅ SonographyTab - Sonography bookings management (Doctor view)
 * ✅ PharmacyOrdersTab - Pharmacy orders management
 * ✅ PharmacyLoyaltyTab - Pharmacy loyalty points
 * ✅ DiagnosticsOrdersTab - Diagnostic orders management
 * ✅ DiagnosticsCreateTab - Create diagnostic orders
 * ✅ DiagnosticsLoyaltyTab - Diagnostics loyalty points
 * 
 * EXISTING COMPONENTS (not needing migration):
 * - ANCRegistration - Antenatal care registration
 * - GlydexStaffPortal - Diabetes care portal
 * - StaffBillingModule - Billing functionality
 * - StaffDashboard - Dashboard component
 * 
 * RESULTS:
 * - Original StaffPortal.js: 4736 lines
 * - Target: < 2000 lines with all tabs migrated
 * - 12 tabs migrated to separate component files
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

// Management Tabs - MIGRATED
export { default as BillingTab } from './BillingTab';
export { default as PatientsTab } from './PatientsTab';

// Doctor Specialty Tabs - MIGRATED
export { default as SonographyTab } from './SonographyTab';

// Pharmacy Staff Tabs - MIGRATED
export { default as PharmacyOrdersTab } from './PharmacyOrdersTab';
export { default as PharmacyLoyaltyTab } from './PharmacyLoyaltyTab';

// Diagnostics Staff Tabs - MIGRATED
export { default as DiagnosticsOrdersTab } from './DiagnosticsOrdersTab';
export { default as DiagnosticsCreateTab } from './DiagnosticsCreateTab';
export { default as DiagnosticsLoyaltyTab } from './DiagnosticsLoyaltyTab';
