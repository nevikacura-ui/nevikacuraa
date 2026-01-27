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
- WhatsApp notifications via Baileys (FREE)

## What's Been Implemented

### January 28, 2026 - UI Redesign & WhatsApp Integration
- ✅ Home page redesigned - removed search bar, cleaned up sections
- ✅ Trust badges section added (Trusted Labs, Doctor Curated, Home Sample, Fast Reports)
- ✅ Service tiles updated (Orange Pharmacy, Proton Diagnostics, DiaGyn, Evara)
- ✅ Quick action cards (Full body Packages, Call, WhatsApp, Upload Prescription)
- ✅ Pharmacy categories with image-based cards (12 health categories)
- ✅ Proton trust badges section added
- ✅ WhatsApp integration (number: 9403890429) for appointment confirmations
- ✅ Medicine count verified: 4,266 records

### Previous Implementations
- ✅ Role-based appointment visibility (doctors/staff)
- ✅ Staff appointment editing functionality
- ✅ Email confirmations for walk-in/emergency appointments
- ✅ Live queue backend functionality
- ✅ Splash screen with loading animation
- ✅ Loyalty points system for pharmacy

## Prioritized Backlog

### P0 (Critical)
- User verification of WhatsApp notifications

### P1 (High Priority)
- Complete remaining enhancements (~11 features)
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
- **Notifications:** Resend (email), Twilio (SMS), Baileys (WhatsApp)
- **Payments:** Stripe

## Key API Endpoints
- `/api/pharmacy/count` - Returns medicine count (4266)
- `/api/pharmacy/inventory` - Medicine listing
- `/api/whatsapp/templates` - WhatsApp message templates
- `/api/whatsapp/send/*` - Send WhatsApp notifications
- `/api/staff/appointments/*` - Appointment management

## Architecture
```
/app/
├── backend/
│   ├── routes/
│   │   ├── staff.py (WhatsApp notifications added)
│   │   ├── whatsapp.py (NEW - WhatsApp API)
│   │   └── pharmacy.py
│   └── services/
│       └── whatsapp_service.py (NEW)
└── frontend/
    └── src/
        ├── components/home/
        │   ├── TrustBadges.jsx
        │   ├── ServiceTiles.jsx
        │   └── QuickActionCards.jsx (WhatsApp: 919403890429)
        └── pages/
            ├── Home.js (redesigned)
            └── Pharmacy.js (image categories)
```

## Known Issues
- Face ID Camera fails on mobile (low priority, no feature depends on it)

## Last Updated
January 28, 2026
