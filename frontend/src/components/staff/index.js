/**
 * Staff Portal Components Index
 * 
 * This file exports all refactored staff portal components for easy importing.
 * The migration from StaffPortal.js (4700+ lines) to modular components is in progress.
 * 
 * COMPLETED MIGRATIONS:
 * - WalkInTab: Walk-in appointment booking
 * - EmergencyTab: Emergency appointment booking
 * 
 * COMPONENTS CREATED (Ready for integration):
 * - BillingTab: Fee collection and billing
 * - PatientsTab: Patient management and database
 * 
 * REMAINING TABS TO MIGRATE:
 * - AppointmentsTab: View and manage scheduled appointments
 * - FeesTab: Fee codes reference
 * - FeedbackTab: Patient feedback collection
 * - AttendanceTab: Staff attendance tracking
 * - ANCTab: Antenatal care registration (uses ANCRegistration component)
 * - GlydexTab: Diabetes care portal (uses GlydexStaffPortal component)
 * - PharmacyDashboard: Pharmacy orders and loyalty
 * - DiagnosticsPanel: Lab orders and test creation
 */

// Utilities
export { default as staffUtils } from '@/pages/staff/staffUtils';
export * from '@/pages/staff/staffUtils';

// Auth Components
export { default as StaffLogin } from '@/pages/staff/StaffLogin';

// Booking Tabs - MIGRATED
export { default as WalkInTab } from './WalkInTab';
export { default as EmergencyTab } from './EmergencyTab';

// Management Tabs - CREATED (ready for integration)
export { default as BillingTab } from './BillingTab';
export { default as PatientsTab } from './PatientsTab';

// Biometric
export { default as SmartBiometric } from '@/pages/staff/SmartBiometric';
