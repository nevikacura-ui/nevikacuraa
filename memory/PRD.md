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
- SMS notifications via Twilio
- WhatsApp notifications via MSG91 (configured, pending user activation)

## What's Been Implemented

### January 28, 2026 - MSG91 Integration & Verification
- ✅ MSG91 WhatsApp API fully integrated in backend
- ✅ MSG91 Auth Key configured (487196As2GZMEjzz5L696de447P1)
- ✅ MSG91 routes loaded and ready (`/api/msg91-whatsapp/*`)
- ✅ Quick Shop pills filtering VERIFIED WORKING
- ✅ Category filtering on Pharmacy page working correctly
- ⏳ MSG91 pending: User completing Facebook/Meta business verification

### January 27, 2026 - UI Redesign & WhatsApp Integration
- ✅ Home page redesigned - removed search bar, cleaned up sections
- ✅ Trust badges section added (Trusted Labs, Doctor Curated, Home Sample, Fast Reports)
- ✅ Service tiles updated (Orange Pharmacy, Proton Diagnostics, DiaGyn, Evara)
- ✅ Quick action cards (Full body Packages, Call, WhatsApp, Upload Prescription)
- ✅ Pharmacy categories with image-based cards (12 health categories)
- ✅ Proton trust badges section added
- ✅ Medicine count verified: 4,266 records

### Previous Implementations
- ✅ Role-based appointment visibility (doctors/staff)
- ✅ Staff appointment editing functionality
- ✅ Email confirmations for walk-in/emergency appointments
- ✅ Live queue backend functionality
- ✅ Splash screen with loading animation
- ✅ Loyalty points system for pharmacy

## MSG91 WhatsApp Configuration

### Current Status: CONFIGURED (Pending User Activation)
```
MSG91_AUTH_KEY=487196As2GZMEjzz5L696de447P1
MSG91_WHATSAPP_NUMBER=919403890429
```

### Available Endpoints
- `GET /api/msg91-whatsapp/status` - Check configuration
- `GET /api/msg91-whatsapp/setup-guide` - Setup instructions
- `POST /api/msg91-whatsapp/send/appointment-confirmation`
- `POST /api/msg91-whatsapp/send/appointment-reminder`
- `POST /api/msg91-whatsapp/send/appointment-completion`
- `POST /api/msg91-whatsapp/send/pharmacy-order`
- `POST /api/msg91-whatsapp/send/lab-report`

### Required Templates (to create in MSG91 dashboard)
1. `appointment_confirmation` - For booking confirmations
2. `appointment_reminder` - For reminders
3. `consultation_complete` - After appointment completion
4. `pharmacy_order_update` - Pharmacy order status
5. `lab_report_ready` - Lab report notifications

## Enhancement Features Status

### Already Implemented (13 features with backend APIs)
1. Queue Tracker (#2)
2. Prescription Wallet (#3)
3. Family Hub (#4)
4. Health Score Gamification (#5)
5. Loyalty Points (#11)
6. Smart Reminders (#1)
7. Notification Preferences (#49)
8. Payment Links (#48)
9. Emergency SOS (#30)
10. Medication Interaction Checker (#20)
11. Health Content Hub (#17)
12. Enhanced Features APIs
13. Medicine Reminders

### Frontend Stubs (30+ features needing full backend)
- AI Appointment Suggestions
- AI Triage Assistant
- Audit Trail Dashboard
- Automated Health Reports
- Billing Reconciliation
- Broadcast Messages
- Community Forums
- Consent Management
- Data Export
- Digital Signage
- Health Outcome Tracking
- Insurance Integration
- Lab Report Auto Import
- Patient Check-in Kiosk
- Patient Context Card
- Patient Journey Analytics
- Predictive Health Alerts
- Predictive Health Insights
- Revenue Forecasting
- Room Resource Booking
- Smart Inventory Alerts
- Smart Medical Records
- Smart Schedule Optimizer
- Split Payment
- Staff Performance Analytics
- Staff Shift Management
- Teleconsultation
- Two-Way Chat
- Virtual Health Coach
- Voice Assistant
- Voice Prescription
- Wearable Integration

## Prioritized Backlog

### P0 (Critical)
- Complete MSG91 Facebook/Meta verification (user action)
- Test WhatsApp notifications end-to-end

### P1 (High Priority)
- Implement backend for remaining 30+ enhancement features
- Video Consultations implementation
- Offline Mode support

### P2 (Medium Priority)
- Widget Support for mobile
- Apple Watch App
- Insurance Pre-Authorization
- Corporate/Insurance Tie-ups

### P3 (Lower Priority)
- Automated Follow-up Calls
- AR Clinic Navigation
- Multi-language Voice Assistant

## Tech Stack
- **Frontend:** React with Tailwind CSS, Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Notifications:** Resend (email), Twilio (SMS), MSG91 (WhatsApp)
- **Payments:** Stripe

## Architecture
```
/app/
├── backend/
│   ├── routes/
│   │   ├── staff.py
│   │   ├── msg91_whatsapp.py (WhatsApp API routes)
│   │   ├── enhancements.py (13 enhancement APIs)
│   │   └── enhanced_features.py
│   └── services/
│       └── msg91_whatsapp.py (MSG91 service)
└── frontend/
    └── src/
        ├── components/
        │   ├── home/ (TrustBadges, ServiceTiles, QuickActionCards)
        │   └── enhancements/ (46 enhancement components)
        └── pages/
            ├── Home.js (redesigned)
            ├── Pharmacy.js (image categories, filtering)
            └── Proton.js (diagnostics)
```

## Known Issues
- Face ID Camera fails on mobile (low priority)

## Last Updated
January 28, 2026
