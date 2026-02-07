# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-portal healthcare application for:
- DiaGyn (clinic appointments)
- Mango Labs (diagnostic tests)  
- Orange Pharmacy (medicine orders)

With unified staff login, WhatsApp OTP via MSG91, and Super Admin dashboard.

## What's Been Implemented

### Completed (Feb 7, 2026) - Session 5
- ✅ **30-Day Persistent Login for ALL Staff Portals**:
  - Mango Labs Staff Portal (`/mango-staff`): Added 30-day login persistence
  - Orange Pharmacy Staff Portal (`/orange-staff`): Added 30-day login persistence
  - DiaGyn Staff Portal (`/diagyn-staff`): Already implemented
  - Doctor Portal (`/doctor-portal`): Already implemented
  - Implementation details:
    - `staffToken` stored in localStorage
    - `staffInfo` stored in localStorage
    - `staffLoginExpiry` timestamp (30 days from login)
    - On page load, checks if session expired
    - Clears all auth data on logout
    - Shows "Logged in for 30 days" toast on successful login
- ✅ **"Remember Me" Checkbox on All Portals**:
  - Added to: DiaGyn Staff, Mango Labs, Orange Pharmacy, Doctor Portal
  - Default: Checked (30-day persistence)
  - When unchecked: Session-based login (no expiry stored)
  - Visual: "Remember me for 30 days" label with themed checkbox
- ✅ **Updated Mango Health Labs Logo**:
  - New logo saved to `/frontend/public/mango-logo.png`
  - Updated in: MangoLabsStaffPortal (login + header), DoctorPortal (login + header), UnifiedStaffLogin, HealthPackages, ProtonReportDownload, Mango main page hero
  - Logo sizes enlarged for better visibility
- ✅ **Mango Carousel Images Updated**:
  - "Why Mango? Fast, Safe and Accurate" slide: Hand holding blood vial
  - "Home Sample Collection" slide: Phlebotomist drawing blood
- ✅ **Patient Profile Features Built Out**:
  - **My Orders Modal** with tabs: All, Pharmacy, Appointments
  - **My Lab Tests Modal** with test details and report links
  - **Wallet Modal** with balance card, quick add (₹100-1000), custom amount, add money button
  - Wallet balance stored in localStorage (MOCKED - no backend API)
- ✅ **Patient 30-Day Login** - Working with `patientLoginExpiry` timestamp

### Completed (Feb 7, 2026) - Session 4
- ✅ **Doctor Portal - Add Fees Before Completion**:
  - New "ADD FEES" button (orange) for patients in consultation
  - Opens billing modal to add fee code, scan codes, and total
  - Saves billing without completing the appointment
  - "EDIT FEES" shown if billing already added
- ✅ **Doctor Portal - Follow-up Date Field**:
  - Added follow-up date picker in billing modal
  - Label: "FOLLOW-UP DATE (Shared with Staff)"
  - Date validation (minimum today's date)
  - Shows formatted date preview after selection
  - Saved to database and visible to staff
- ✅ **DiaGyn Staff Portal - Mobile Number Display**:
  - Patient mobile number shown in teal badge beside patient name
  - Clickable to initiate phone call (tap-to-call)
  - Phone icon with number clearly visible
- ✅ **DiaGyn Staff Portal - Follow-up Date Display**:
  - Follow-up date shown as teal badge: "F/U: 14 Feb"
  - Calendar icon with formatted date
  - Visible alongside appointment type and amount
- ✅ **Staff Credentials Recreated**:
  - All staff accounts recreated in correct database (test_database)

### Completed (Feb 7, 2026) - Session 3
- ✅ **Pharmacy Carousel Image**: 
  - Changed to medicine bottles on shelves (no person)
  - Image: Colorful medicine bottles on wooden shelves
- ✅ **Gradient Reversed**: 
  - PortalScrollBar now transitions from light → teal (bottom)
  - Content area is clean white, teal at bottom edge
- ✅ **Profile Page - 30-Day Login Persistence**:
  - Users stay logged in for 30 days
  - Token + patient info stored in localStorage with expiry
  - "Stay logged in for 30 days" message shown on login
- ✅ **Profile Page - Removed Appearance Toggle**
- ✅ **Profile Page - Built Real Features** (no more "coming soon"):
  - Your Orders modal with appointments, pharmacy orders, lab tests
  - Address Book with add/remove addresses
  - Saved Doctors list
  - Your Prescriptions list
  - Payment & Rewards section
  - All menu items are functional
- ✅ **Cashfree Payment Confirmed Working**:
  - Orange Pharmacy: ✅ Order creation works
  - Mango Labs: ✅ Order creation works
  - Both tested via API, orders created successfully

### Completed (Feb 7, 2026) - Session 2
- ✅ Portal Switcher white line fixed (gradient transition)
- ✅ Profile rebuilt Blinkit-style with WhatsApp OTP
- ✅ Twilio cleanup completed

### Completed (Feb 6, 2026)
- ✅ New App Icon with sonography machine image
- ✅ Removed Captcha from DiaGyn Booking
- ✅ Guest Login without OTP
- ✅ Staff credentials reset
- ✅ Doctor Schedule Management UI
- ✅ Staff Activity Log system

## Staff Credentials

| Role | Username | Password | Portal |
|------|----------|----------|--------|
| Super Admin | admin_nevika | Admin@2026 | /super-admin |
| DiaGyn Staff | staff_diagyn | Staff@2026 | /staff |
| Mango Labs Staff | staff_mango | Staff@2026 | /staff |
| Orange Pharmacy Staff | staff_pharmacy | Staff@2026 | /staff |
| Dr. Vikas | dr_vikas | DrVikas@2026 | /doctor-portal |
| Dr. Neha | dr_neha | DrNeha@2026 | /doctor-portal |

## Payment Integration - Cashfree
- Environment: Production
- Credentials in `/app/backend/.env`
- Supported: UPI, Cards, Wallets, Net Banking
- Order types: pharmacy, lab_test, appointment

## Known Issues
- WhatsApp OTP delivery requires users to first message business number (918108888330)
- Overlapping modal issue in Orange Pharmacy (P2)

## Code Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── cashfree.py (payment gateway)
│   │   ├── whatsapp_otp.py
│   │   └── ...
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── IntroScreen.jsx (carousel)
│   │   │   ├── PortalScrollBar.jsx (reversed gradient)
│   │   │   └── CashfreeCheckout.jsx
│   │   ├── pages/
│   │   │   ├── PatientPortal.js (30-day login, full features)
│   │   │   ├── Pharmacy.js (Cashfree integrated)
│   │   │   └── Mango.js (Cashfree integrated)
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
