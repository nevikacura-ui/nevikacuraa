# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-portal healthcare application for:
- DiaGyn (clinic appointments)
- Mango Labs (diagnostic tests)  
- Orange Pharmacy (medicine orders)

With unified staff login, WhatsApp OTP via MSG91, and Super Admin dashboard.

## What's Been Implemented

### Completed (Feb 6, 2026)
- ✅ **New App Icon**: Updated all PWA icons with user-provided image (192x192, 512x512, favicon, apple-touch-icon)
- ✅ **Removed Captcha from DiaGyn Booking**: Captcha verification removed from appointment confirmation
- ✅ **Mandatory WhatsApp OTP for DiaGyn Booking**: 
  - OTP step is now mandatory before booking confirmation
  - Updated label to "WhatsApp Number" with hint "(OTP will be sent)"
  - OTP verification screen updated to say "Verify Your WhatsApp"
- ✅ **Guest Login - No OTP Required**:
  - Removed OTP verification from guest login flow
  - Button now says "Continue" (not mentioning skip or OTP)
  - Guest can enter WhatsApp number and proceed directly
- ✅ **Fresh Staff Credentials Created**: All staff and doctor accounts reset with new passwords

### Previously Completed (Feb 5, 2026)
- ✅ Twilio Code Cleanup - removed all SMS code
- ✅ PWA Optimization - faster "add to home screen"
- ✅ Unified Staff Login at `/staff`
- ✅ Super Admin Dashboard at `/super-admin`
- ✅ Medicine Inventory Sync for pharmacy
- ✅ WhatsApp notifications via MSG91

## Staff Credentials (FRESH - Feb 6, 2026)

| Role | Username | Password | Portal |
|------|----------|----------|--------|
| **Admin** | admin_nevika | Nevika@2026 | /super-admin |
| **DiaGyn Staff** | staff_diagyn | Diagyn@2026 | /diagyn-staff |
| **Mango Labs Staff** | staff_mango | Mango@2026 | /mango-staff |
| **Orange Pharmacy Staff** | staff_orange | Orange@2026 | /orange-staff |
| **Dr. Vikas Jha** | dr_vikas | DrVikas@2026 | /doctor-portal |
| **Dr. Neha Patel** | dr_neha | DrNeha@2026 | /doctor-portal |

## Active Issues

### P0 - WhatsApp OTP Delivery (BLOCKED)
- MSG91 API calls succeed but messages not delivered
- Cause: WhatsApp 24-hour session window policy
- User must send "Hi" to business number first

## Upcoming Tasks

### P0 - Doctor Schedule Management
- Backend routes exist at `/api/doctor-schedule/`
- Frontend component at `DoctorSchedule.js` needs completion

### P1 - Staff Activity Log
- Backend model and API at `/api/activity-log`
- Need logging middleware and frontend view

## Technical Stack
- **Backend**: Python FastAPI
- **Frontend**: React (Vite)
- **Database**: MongoDB
- **Messaging**: MSG91 (WhatsApp templates)
- **Email**: Resend
- **Auth**: JWT tokens
