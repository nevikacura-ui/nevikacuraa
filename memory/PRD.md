# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-portal healthcare application for:
- DiaGyn (clinic appointments)
- Mango Labs (diagnostic tests)  
- Orange Pharmacy (medicine orders)

With unified staff login, WhatsApp OTP via MSG91, and Super Admin dashboard.

## What's Been Implemented

### Completed (Feb 7, 2026) - Session 2
- ✅ **Portal Switcher - White Line Fixed**: 
  - Removed hard border/line between header tabs and portal icons
  - Added smooth gradient transition from header teal to content area
  - Seamless visual flow across DiaGyn, Mango, and Orange portals
- ✅ **Pharmacy Carousel Image**: 
  - Updated "4000+ Medicines" slide with bright Indian pharmacy image
  - Shows Indian pharmacist with turban in well-stocked pharmacy
- ✅ **Profile Page Completely Rebuilt (Blinkit Style)**:
  - Single WhatsApp OTP login flow (no double entry)
  - New login screen with gradient header and WhatsApp number input
  - 6-digit OTP entry with auto-focus
  - After-login profile with:
    - Avatar and account header
    - Birthday banner
    - Quick actions (Orders, Wallet, Help)
    - Appearance toggle
    - Your Information section
    - Payment & Coupons section  
    - Other Information section with Logout
- ✅ **Twilio Cleanup**: Removed all remaining references

### Completed (Feb 7, 2026) - Session 1
- ✅ Portal Switcher gradient transition (from teal header)
- ✅ Carousel pharmacy image (Indian pharmacist)
- ✅ WhatsApp OTP for Patient Portal
- ✅ Twilio cleanup from config.py, server_new.py, server.py

### Completed (Feb 6, 2026)
- ✅ New App Icon with sonography machine image
- ✅ Removed Captcha from DiaGyn Booking (mandatory WhatsApp OTP)
- ✅ Guest Login without OTP
- ✅ Staff credentials reset
- ✅ Doctor Schedule Management UI
- ✅ Staff Activity Log system

## Staff Credentials (Feb 6, 2026)

| Role | Username | Password | Portal |
|------|----------|----------|--------|
| Super Admin | admin_nevika | Admin@2026 | /super-admin |
| DiaGyn Staff | staff_diagyn | Staff@2026 | /staff |
| Mango Labs Staff | staff_mango | Staff@2026 | /staff |
| Orange Pharmacy Staff | staff_pharmacy | Staff@2026 | /staff |
| Dr. Vikas | dr_vikas | DrVikas@2026 | /doctor-portal |
| Dr. Neha | dr_neha | DrNeha@2026 | /doctor-portal |

## Known Issues
- WhatsApp OTP delivery requires users to first message business number (918108888330) to open 24-hour session window - this is a platform limitation
- Overlapping modal issue in Orange Pharmacy (P2)

## Code Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── auth_v2.py
│   │   ├── whatsapp_otp.py
│   │   └── ...
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── IntroScreen.jsx (carousel images)
│   │   │   ├── PortalScrollBar.jsx (gradient transition)
│   │   │   └── BottomNav.jsx
│   │   ├── pages/
│   │   │   ├── Home.js (no border in header)
│   │   │   ├── PatientPortal.js (Blinkit-style profile)
│   │   │   └── ...
└── memory/
    └── PRD.md
```
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
