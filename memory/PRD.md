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

### January 28, 2026 - Loading Screen & UI Updates
- ✅ Created new Loading Screen with "Book. Order. Test. Care." sequential word animation
- ✅ Words fade in with colors: Book (teal), Order (orange), Test (violet), Care (pink)
- ✅ Loading screen duration: ~1.1 seconds before transitioning to splash
- ✅ Removed Trust Badges section from Home page (as requested)
- ✅ Flow: Loading Screen → Splash Screen → Home Page

### January 28, 2026 - Enhancement Features Backend (30+ APIs)

#### Enhancement V2 APIs (`/api/enhancements/*`)
- ✅ **AI Triage Assistant** - Symptom analysis with urgency classification
- ✅ **Symptom Checker** - Condition probability analysis
- ✅ **Teleconsultation** - Video consultation booking & management
- ✅ **Community Forums** - Patient discussion posts & comments
- ✅ **Wearable Integration** - Sync data from Apple Watch, Fitbit, Google Fit
- ✅ **Insurance Integration** - Claims submission & tracking
- ✅ **Broadcast Messages** - Mass notifications to patients/staff
- ✅ **Virtual Health Coach** - AI wellness guidance & goals
- ✅ **Two-Way Chat** - Patient-doctor messaging
- ✅ **Staff Performance Analytics** - Performance metrics
- ✅ **Patient Check-in Kiosk** - Self-service check-in
- ✅ **Room & Resource Booking** - Conference/procedure room scheduling
- ✅ **Smart Inventory Alerts** - Low stock notifications
- ✅ **Split Payment** - Multi-method payment processing
- ✅ **Voice Prescription** - Speech-to-prescription
- ✅ **Data Export** - Patient health data export

#### Enhancement V3 APIs (`/api/admin/*`)
- ✅ **Audit Trail Dashboard** - Activity logging & tracking
- ✅ **Revenue Forecasting** - ML-based revenue predictions
- ✅ **Health Outcome Tracking** - Patient improvement metrics
- ✅ **Staff Shift Management** - Schedule & swap requests
- ✅ **Digital Signage** - Lobby display content management
- ✅ **Lab Report Auto-Import** - OCR-based report parsing
- ✅ **Consent Management** - Patient consent recording
- ✅ **Billing Reconciliation** - Payment tracking & reminders
- ✅ **Predictive Health Alerts** - AI-generated risk alerts
- ✅ **Patient Context Card** - Complete patient summary

### January 28, 2026 - MSG91 Integration
- ✅ MSG91 Auth Key configured
- ✅ MSG91 WhatsApp routes loaded
- ⏳ Pending: User completing Facebook/Meta verification

### January 27, 2026 - UI Redesign
- ✅ Home page redesigned with Trust Badges
- ✅ Pharmacy categories with image-based cards
- ✅ Quick Shop pills filtering verified working
- ✅ Medicine count: 4,266 records

## API Endpoints Summary

### Enhancement V2 Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/enhancements/ai-triage` | POST | Yes | AI symptom triage |
| `/api/enhancements/symptom-checker/analyze` | POST | Yes | Symptom analysis |
| `/api/enhancements/teleconsultation/book` | POST | Yes | Book video consult |
| `/api/enhancements/teleconsultation/sessions` | GET | Yes | List sessions |
| `/api/enhancements/community/posts` | GET | No | List forum posts |
| `/api/enhancements/community/posts` | POST | Yes | Create post |
| `/api/enhancements/wearables/sync` | POST | Yes | Sync device data |
| `/api/enhancements/wearables/insights` | GET | Yes | Health insights |
| `/api/enhancements/insurance/claims` | POST | Yes | Submit claim |
| `/api/enhancements/broadcast/send` | POST | Yes | Send broadcast |
| `/api/enhancements/health-coach/advice` | GET | Yes | Get coaching |
| `/api/enhancements/chat/start` | POST | Yes | Start chat |
| `/api/enhancements/rooms/availability` | GET | No | Room availability |
| `/api/enhancements/inventory/alerts` | GET | Yes | Stock alerts |
| `/api/enhancements/payments/split` | POST | Yes | Split payment |

### Enhancement V3 Endpoints (Admin)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/audit-trail` | GET | Yes | Activity logs |
| `/api/admin/analytics/revenue-forecast` | GET | Yes | Revenue predictions |
| `/api/admin/analytics/health-outcomes` | GET | Yes | Patient outcomes |
| `/api/admin/analytics/predictive-alerts` | GET | Yes | Risk alerts |
| `/api/admin/shifts/schedule` | GET | Yes | Staff schedules |
| `/api/admin/signage/content` | GET | No | Display content |
| `/api/admin/billing/reconciliation` | GET | Yes | Payment tracking |
| `/api/admin/consent/{phone}` | GET | Yes | Patient consents |
| `/api/admin/patient-context/{phone}` | GET | Yes | Patient summary |

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
│   │   ├── enhancements.py (13 patient APIs)
│   │   ├── enhancements_v2.py (16 new APIs - AI, Teleconsult, Community, etc.)
│   │   ├── enhancements_v3.py (14 admin APIs - Analytics, Audit, Shifts, etc.)
│   │   ├── msg91_whatsapp.py (WhatsApp via MSG91)
│   │   └── ... (other routes)
│   └── services/
│       └── msg91_whatsapp.py
└── frontend/
    └── src/
        └── components/
            └── enhancements/ (46 UI components)
```

## Testing Results
- **Backend Tests:** 24/24 passed (100%)
- **Test Report:** `/app/test_reports/iteration_64.json`

## Prioritized Backlog

### P0 (Critical)
- Complete MSG91 Facebook verification (user action)
- Test WhatsApp notifications end-to-end

### P1 (High Priority)
- Connect frontend enhancement components to new backend APIs
- Implement real AI/ML for triage and predictions

### P2 (Medium Priority)
- Real wearable device SDK integration
- Production OCR for lab reports
- Speech-to-text for voice prescriptions

### P3 (Future)
- Apple Watch App
- AR Clinic Navigation
- Multi-language Voice Assistant

## Known Issues
- Face ID Camera fails on mobile (low priority)
- Enhancement APIs return mock data when DB is empty (by design for demo)

## Last Updated
January 28, 2026
