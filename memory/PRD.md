# Nevika Cura - Product Requirements Document

## Original Problem Statement
Build a comprehensive healthcare application named "Nevika Cura" that enhances staff and patient experience with features for appointment booking, pharmacy ordering, lab tests, and more.

## User Personas
1. **Patients** - Book appointments, order medicines, view lab results
2. **Staff** - Manage appointments, handle walk-ins, process orders, check-in patients
3. **Doctors** - View schedules, consult patients, complete consultations with fees

## Core Requirements

### Portals
1. **Orange Pharmacy** - Medicine ordering with 4,266+ medicines catalog
2. **Proton Diagnostics** - Lab tests and diagnostic packages
3. **DiaGyn** - Doctor consultations (Amnion & Pushpa Clinics)
4. **Evara** - Women's wellness services
5. **Glydex** - Diabetes care
6. **Alyne** - Kids health
7. **Thrive360** - Mind & body wellness

### Booking ID System
| Prefix | Service Type |
|--------|--------------|
| AC-XXXXX | Amnion Clinic appointments |
| PC-XXXXX | Pushpa Clinic appointments |
| OP-XXXXX | Orange Pharmacy orders |
| PD-XXXXX | Proton Diagnostics lab tests |

## What's Been Implemented

### January 28, 2026 - UI/UX Enhancements (Blinkit/Zepto Style)
- ✅ **Portal Scroll Bar - 12 Portals:**
  1. Evara - Women's Health
  2. Glydex - Diabetes Care
  3. Thrive Mind - Mental Wellness (replaced Thrive360)
  4. Aanya - Newborn Care
  5. Alyne Kids - Child Care
  6. Cardyra - Heart & BP Care
  7. Vireya - Preventive Health
  8. FitLife - Physical Health
  9. Nivara - Senior Care
  10. Reports - Blood Charts
  11. Health Log - Weight & Logs
  12. PSVN Foundation
- ✅ **Consultation Banners** - Added to Pharmacy & Proton pages for confused users
- ✅ **Page Transitions** - Smooth fade-in animations using framer-motion
- ✅ **Sand Background** (#F5F5F4) - Applied across Home, Pharmacy, Proton, Profile pages
- ✅ **Secondary Services Grid** - Evara, Glydex, Alyne, Thrive360 cards on Home page

### January 28, 2026 - WhatsApp Triggers Implementation
- ✅ **1-Hour Reminder** - Added MSG91 WhatsApp to cron job for appointment reminders
- ✅ **Post-Consultation Thank You** - Added WhatsApp notification when doctor completes appointment
- ⏳ **MSG91 Templates** - Created but pending Meta approval (IN REVIEW status)

### January 28, 2026 - UI/UX Improvements
- ✅ **Pharmacy Categories** - Separated image and text for cleaner look (circular images with labels below)
- ✅ **Staff Portal Booking ID** - Added booking ID badge next to patient name in appointment cards
- ✅ **Trust Badges** - Added 4 trust badges on Home page (Accredited Labs, Doctor Curated, Home Collection, Fast Reports)
- ✅ **Micro-animations** - Added shimmer, stagger, hover-lift, and pulse-ring animations
- ✅ **Personalized Dashboard** - Added cards for logged-in users (Upcoming, Medicines, Health Streak, My Health)
- ✅ **Dark Mode Support** - Added CSS variables for dark mode

### January 28, 2026 - SMS Testing & Staff Portal
- ✅ Created `/api/test/send-sms` endpoint for direct SMS testing
- ✅ Sent test SMS with brand-specific templates (DiaGyn, Proton, Orange)
- ✅ Fixed Staff Portal JavaScript error (`staffToken is not defined`)
- ✅ Verified QR Scanner backend endpoint works
- ✅ Reset staff passwords and sent credentials email to nevikacura@gmail.com

### January 28, 2026 - QR Codes in Emails
- ✅ Lab Test confirmation emails now include QR code of booking ID
- ✅ Pharmacy order confirmation emails now include QR code of booking ID
- ✅ All QR codes display prominently with booking ID text below

### Earlier - Booking ID & QR System
- ✅ Booking ID generation with clinic-specific prefixes
- ✅ QR code generation for appointment confirmation emails
- ✅ Staff Portal QR Scanner UI component
- ✅ Backend endpoint `/api/staff/appointments/by-booking-id/{id}`

### Earlier - SMS Optimization
- ✅ Shortened all SMS templates (~50-80 chars)
- ✅ Brand-specific sender names
- ✅ Disabled all SMS to staff (email only)

### Earlier - Enhancement APIs (~30 mocked)
- AI Triage Assistant, Symptom Checker
- Teleconsultation booking
- Community Forums, Wearable Integration
- Staff Performance Analytics
- And more in `enhancements_v2.py` and `enhancements_v3.py`

## Tech Stack
- **Frontend:** React with Tailwind CSS, Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Notifications:** Resend (email), Twilio (SMS), MSG91 (WhatsApp - pending)
- **Payments:** Stripe
- **QR Code:** qrcode (backend), html5-qrcode (frontend)

## Staff Portal Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Doctor (OBGY) | doc_neha | drneha123 | Amnion Clinic |
| Doctor (Diabetes) | doc_vikas | drvikas123 | Pushpa Clinic |
| Clinic Staff | staff_pushpa | staff123 | Pushpa Clinic |
| Clinic Staff | staff_amnion | staff123 | Amnion Clinic |
| Pharmacy Staff | staff_pharmacy | pharmacy123 | Orange Pharmacy |
| Lab Staff | staff_proton | proton123 | Proton Diagnostics |
| Super Admin | super_admin | admin123 | All Access |

**Staff Portal URL:** /staff

## Verified Functionality
- ✅ **Patient Details** visible in Staff and Doctor portal
- ✅ **Staff Check-in** button working
- ✅ **Doctor Consultation Completion** with fee selection
- ✅ **Doctor Schedules** showing on both clinics
- ✅ **Pharmacy Category Filtering** working
- ✅ **QR Scanner** backend endpoint working

## Prioritized Backlog

### P0 (Critical)
- ~~Booking ID in Staff Portal~~ ✅ DONE
- ~~Pharmacy category UI improvement~~ ✅ DONE
- Complete MSG91 Facebook verification (user action)

### P1 (High Priority)
- Connect frontend enhancement components to backend APIs (~30 features)
- Test Staff Portal QR Scanner end-to-end
- Test doctor consultation completion flow end-to-end

### P2 (Medium Priority)
- Implement real AI/ML for triage and predictions
- Real wearable device SDK integration
- Production OCR for lab reports

### P3 (Future)
- Video teleconsultation
- Apple Watch App
- AR Clinic Navigation

## Known Issues
- MSG91 WhatsApp integration blocked (user needs to resolve Facebook 2FA)
- Enhancement APIs return mock data (by design for now)
- Face ID Camera fails on mobile (low priority)

## Last Updated
January 28, 2026
