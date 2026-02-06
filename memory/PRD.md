# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-portal healthcare application for:
- DiaGyn (clinic appointments)
- Mango Labs (diagnostic tests)  
- Orange Pharmacy (medicine orders)

With unified staff login, WhatsApp OTP via MSG91, and Super Admin dashboard.

## What's Been Implemented

### Completed (Feb 5, 2026)
- ✅ **Twilio Code Cleanup**: Removed all Twilio SMS code from:
  - `backend/.env` - removed 5 Twilio env vars
  - `backend/services/sms.py` - deleted file
  - `backend/services/notifications.py` - removed Twilio functions
  - `backend/routes/auth_v2.py` - switched to mock OTP
  - `backend/routes/teleconsultation.py` - removed Twilio notification
  
- ✅ **PWA Optimization**: 
  - Updated `manifest.json` with minimal icons for faster parsing
  - Updated `service-worker.js` v5 with minimal precache (only 2 files)
  - Network-first for HTML, cache-first for static assets

### Previously Completed
- ✅ Unified Staff Login at `/staff`
- ✅ Super Admin Dashboard at `/super-admin`
- ✅ Medicine Inventory Sync for pharmacy
- ✅ WhatsApp notifications via MSG91
- ✅ Renamed to "Nevika Cura Staff Portal"

## Active Issues

### P0 - WhatsApp OTP Delivery (BLOCKED)
- MSG91 API calls succeed but messages not delivered
- Cause: WhatsApp 24-hour session window policy
- User must send "Hi" to business number first
- **Action Required**: Add UI instructions for users

### P2 - Overlapping Modals in Pharmacy
- Search button on image search modal may be unclickable
- Needs frontend testing/debugging

## Upcoming Tasks

### P0 - Doctor Schedule Management
- Backend routes exist at `/api/doctor-schedule/`
- Frontend component at `DoctorSchedule.js` needs completion
- Allow doctors to manage their own availability

### P1 - Staff Activity Log
- Backend model and API at `/api/activity-log`
- Need logging middleware for critical actions
- Frontend view in Super Admin dashboard

## Future/Backlog

- Staff Portal Enhancements (Patient History, Prescription Templates, etc.)
- App Engagement Features (health content, reminders, loyalty programs)
- Sample Barcode Scanning for Mango Labs
- Prescription OCR for Pharmacy
- Low Stock Alerts

## Technical Stack
- **Backend**: Python FastAPI
- **Frontend**: React (Vite)
- **Database**: MongoDB
- **Messaging**: MSG91 (WhatsApp templates)
- **Email**: Resend
- **Auth**: JWT tokens

## Staff Credentials
- Super Admin: `staff_nevikacura` / `nevika123`
- DiaGyn: `staff_diagyn` / `12345678`
- Mango Labs: `staff_mango` / `12345678`
- Orange Pharmacy: `staff_pharmacy` / `12345678`
