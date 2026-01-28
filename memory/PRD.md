# Nevika Cura - Product Requirements Document

## Original Problem Statement
Build a comprehensive healthcare application named "Nevika Cura" that enhances staff and patient experience with features for appointment booking, pharmacy ordering, lab tests, and more.

## User Personas
1. **Patients** - Book appointments, order medicines, view lab results
2. **Staff** - Manage appointments, handle walk-ins, process orders
3. **Doctors** - View schedules, consult patients, manage prescriptions

## Core Requirements

### Portals
1. **Orange Pharmacy** - Medicine ordering with 4,266+ medicines catalog
2. **Proton Diagnostics** - Lab tests and diagnostic packages
3. **DiaGyn** - Doctor consultations
4. **Evara** - Women's wellness services

### Key Features
- Appointment booking (scheduled, walk-in, emergency)
- Prescription upload and processing
- Live queue status tracking
- Email notifications via Resend
- SMS notifications via Twilio (brand-specific, shortened templates)
- WhatsApp notifications via MSG91 (configured, pending user activation)

## What's Been Implemented

### January 28, 2026 - SMS Testing & Staff Portal Fix
- ✅ Created `/api/test/send-sms` endpoint for direct SMS testing
- ✅ Sent 3 test SMS to verify brand-specific templates:
  - DiaGyn Healthcare (appointment)
  - Proton Diagnostics (lab test)
  - Orange Pharmacy (medicine order)
- ✅ Fixed Staff Portal JavaScript error (`staffToken is not defined`)
- ✅ Verified QR Scanner backend endpoint works

### January 28, 2026 - Booking ID & QR Code System
- ✅ Booking ID generation with clinic-specific prefixes (AC, OP, PD, PC)
- ✅ QR code generation and embedding in confirmation emails
- ✅ Staff Portal QR Scanner UI component
- ✅ Backend endpoint for QR code check-in lookup

### January 28, 2026 - SMS Optimization
- ✅ Shortened all SMS templates to reduce costs
- ✅ Brand-specific sender names (DiaGyn, Proton, Orange)
- ✅ Disabled all SMS notifications to staff (email only)
- ✅ Patient SMS retained for appointments, lab tests, pharmacy

### January 28, 2026 - Loading Screen & UI Updates
- ✅ Created IntroScreen with "Book. Order. Test. Care." animation
- ✅ Words fade in with colors: Book (teal), Order (orange), Test (violet), Care (pink)
- ✅ Removed Trust Badges section from Home page

### January 28, 2026 - Enhancement Features Backend (30+ APIs)

#### Enhancement V2 APIs (`/api/enhancements/*`)
- ✅ AI Triage Assistant, Symptom Checker
- ✅ Teleconsultation booking & management
- ✅ Community Forums
- ✅ Wearable Integration (Apple Watch, Fitbit, Google Fit)
- ✅ Insurance Integration, Broadcast Messages
- ✅ Virtual Health Coach, Two-Way Chat
- ✅ Staff Performance Analytics
- ✅ Patient Check-in Kiosk, Room & Resource Booking
- ✅ Smart Inventory Alerts, Split Payment
- ✅ Voice Prescription, Data Export

#### Enhancement V3 APIs (`/api/admin/*`)
- ✅ Audit Trail Dashboard, Revenue Forecasting
- ✅ Health Outcome Tracking, Staff Shift Management
- ✅ Digital Signage, Lab Report Auto-Import
- ✅ Consent Management, Billing Reconciliation
- ✅ Predictive Health Alerts, Patient Context Card

## Tech Stack
- **Frontend:** React with Tailwind CSS, Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Notifications:** Resend (email), Twilio (SMS), MSG91 (WhatsApp)
- **Payments:** Stripe
- **QR Code:** qrcode (backend), html5-qrcode (frontend)

## Architecture
```
/app/
├── backend/
│   ├── server.py (main app, notification functions, SMS templates)
│   ├── routes/
│   │   ├── staff.py (QR scanner endpoint)
│   │   ├── enhancements.py
│   │   ├── enhancements_v2.py
│   │   └── enhancements_v3.py
│   └── services/
│       └── msg91_whatsapp.py
└── frontend/
    └── src/
        ├── components/
        │   ├── IntroScreen.jsx (unified loading/splash)
        │   └── QRScanner.jsx
        └── pages/
            └── StaffPortal.js (QR Check-In button added)
```

## Staff Portal Access
- **Username:** staff_pushpa
- **Password:** staff123
- **Role:** clinic_staff_pushpa
- **Clinic:** Pushpa Clinic

## Prioritized Backlog

### P0 (Critical)
- ~~Send test SMS to verify templates~~ ✅ DONE
- Complete MSG91 Facebook verification (user action)

### P1 (High Priority)
- Connect frontend enhancement components to backend APIs
- Test Staff Portal QR Scanner end-to-end
- Verify Pharmacy category filtering (awaiting user confirmation)
- Integrate QR emails for Lab Tests & Pharmacy orders

### P2 (Medium Priority)
- Implement real AI/ML for triage and predictions
- Real wearable device SDK integration
- Production OCR for lab reports

### P3 (Future)
- Video teleconsultation
- Apple Watch App
- AR Clinic Navigation

## Known Issues
- Face ID Camera fails on mobile (low priority)
- Enhancement APIs return mock data when DB is empty (by design)

## Last Updated
January 28, 2026
