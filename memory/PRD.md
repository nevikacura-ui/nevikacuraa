# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-portal healthcare application for:
- DiaGyn (clinic appointments)
- Mango Labs (diagnostic tests)  
- Orange Pharmacy (medicine orders)

With unified staff login, WhatsApp OTP via MSG91, and Super Admin dashboard.

## What's Been Implemented

### Completed (Feb 7, 2026)
- ✅ **Portal Switcher Redesigned**: 
  - Removed harsh white border line divider
  - Added soft shadow (`shadow-sm`) for subtle depth transition
  - Maintains visual continuity without stark line separation
- ✅ **Carousel Pharmacy Image Updated**: 
  - Replaced medicine strips image with beautiful pharmacy shop interior
  - Shows pharmacist in a well-stocked pharmacy
- ✅ **WhatsApp OTP for Patient Portal**:
  - Patient Portal login now uses WhatsApp OTP via MSG91
  - Updated UI to show "WhatsApp Number" and "Send OTP via WhatsApp"
  - Green button styling for WhatsApp branding
- ✅ **Twilio Cleanup Completed**:
  - Removed Twilio references from config.py
  - Cleaned server_new.py imports
  - Updated server.py comments
- ✅ **Footer Profile - WhatsApp OTP Login**:
  - BottomNav profile button includes WhatsApp OTP login modal for non-authenticated users
  - Patient Portal page uses WhatsApp OTP

### Completed (Feb 6, 2026)
- ✅ **New App Icon**: Updated all PWA icons with user-provided image
- ✅ **Removed Captcha from DiaGyn Booking**: Replaced with mandatory WhatsApp OTP
- ✅ **Guest Login - No OTP Required**: Button says "Continue" (not skip)
- ✅ **Fresh Staff Credentials Created**: All accounts reset with new passwords
- ✅ **Doctor Schedule Management UI**: 
  - Doctors can manage their own weekly availability
  - Set working hours for each day (MON-SUN)
  - Configure slot duration, max patients per slot, buffer time
  - Block specific dates for holidays/leave
  - Accessible via Settings icon in Doctor Portal header
- ✅ **Staff Activity Log**:
  - Activity logging added to staff login (all portals)
  - Activity logging added to DiaGyn appointment status changes
  - Activity logging added to Orange Pharmacy order status updates
  - Activity logging added to Mango Labs booking status updates
  - Super Admin can view all activity logs in Activity Logs tab

### Previously Completed (Feb 5, 2026)
- ✅ Twilio Code Cleanup - removed all SMS code
- ✅ PWA Optimization - faster "add to home screen"
- ✅ Unified Staff Login at `/staff`
- ✅ Super Admin Dashboard at `/super-admin`
- ✅ Medicine Inventory Sync for pharmacy
- ✅ WhatsApp notifications via MSG91

## Staff Credentials (Feb 6, 2026)

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

## Technical Stack
- **Backend**: Python FastAPI
- **Frontend**: React (Vite)
- **Database**: MongoDB
- **Messaging**: MSG91 (WhatsApp templates)
- **Email**: Resend
- **Auth**: JWT tokens

## Key Features

### Doctor Schedule Manager
- Access: Doctor Portal → Settings icon (⚙️)
- Features:
  - Weekly schedule (MON-SUN)
  - Toggle working/off days
  - Multiple time slots per day
  - Slot duration configuration
  - Block dates for holidays

### Staff Activity Log
- Access: Super Admin Dashboard → Activity Logs tab
- Tracks:
  - Staff logins (all portals)
  - Appointment check-ins, completions
  - Order status updates
  - Lab booking status changes

## Future/Backlog
- Staff Portal Enhancements (Patient History, Prescription Templates)
- Pharmacy features (Low Stock Alerts, Prescription OCR)
- Lab features (Sample Barcode Scanning)
- App Engagement Features (health content, reminders)
