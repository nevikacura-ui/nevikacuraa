# Nevika Cura Healthcare Application - PRD

## Original Problem Statement
Build a modern healthcare application for "Nevika Cura" with core services:
1. **DiaGyn Healthcare** - Appointment booking for doctors
2. **Proton Diagnostics** - Lab test booking
3. **Orange Pharmacy** - Medicine ordering
4. **Evara** - Women's Wellness & Care Program
5. **Glydex** - Diabetes Care Portal

## Core Requirements

### Services & Staff SMS Numbers
| Service | Staff Numbers | Purpose |
|---------|---------------|---------|
| DiaGyn Healthcare | 8108500522, 8108500533 | Appointment notifications (Pushpa + Amnion) |
| Proton Diagnostics | 7039040040 | Test booking notifications |
| Orange Pharmacy | 8108500511 | Medicine order notifications |
| Nevika/Evara/Glydex | 9833188288 | Signup & general notifications |

### User Flow
- OTP-based login and registration (Real SMS via Twilio)
- **Email/Password login** for international patients
- SMS notifications to patients AND staff (no WhatsApp redirects)
- Payment options: Cash on Delivery/Visit & QR Pay/Card on Delivery/Visit
- Email notifications via Resend API

---

## What's Been Implemented ✅

### Date: January 13, 2026 - Latest Session

#### New Features - COMPLETED ✅
- [x] **New Fee Codes**:
  - N1 - No Fees (₹0)
  - E1 - Emergency (₹600)
  
- [x] **SMS Staff Notifications**:
  - Sends SMS to respective department staff on new orders/appointments
  - DiaGyn: 8108500522, 8108500533 (Pushpa + Amnion)
  - Proton: 7039040040
  - Orange: 8108500511
  - Nevika/Evara/Glydex: 9833188288

- [x] **Removed WhatsApp Redirects**:
  - DiaGyn appointments: SMS confirmation only
  - Proton test bookings: SMS confirmation only
  - Pharmacy orders: SMS confirmation only

- [x] **Enhanced Admin Appointment Cancellation**:
  - Single Slot cancellation
  - Bulk Session (11AM-2PM or 6PM-10PM)
  - Whole Day cancellation
  - Date Range cancellation
  - Session Range (DateA/SessionA to DateB/SessionB)

- [x] **Evara Content Pages**:
  - Pregnancy Education (3 trimesters, tests, warning signs)
  - Menopause Guide (stages, symptoms, tips, FAQs)
  - Women Health Community (Tips, Guides, Q&A in 4 categories)
  - Period Tracker Tips (cycle phase tips & nutrition)

- [x] **Share Reports via WhatsApp**:
  - Glydex: Share blood sugar logs (FBS, PPBS, HbA1c)
  - Evara: Share period tracking report

- [x] **International Patient Support**:
  - Email/password login option
  - Registration without Indian phone number

- [x] **UI Fixes**:
  - QR code in footer for APK download
  - Evara logo sizing fixed

### Previous Session Features (Jan 11-12, 2026)
- [x] Doctor/Staff Appointment Flow with fee codes
- [x] Daily Collection Summary for clinic staff
- [x] Glydex diabetes profile & reminders
- [x] TWA/PWA configuration with assetlinks.json
- [x] Capacitor Android project for standalone app

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **SMS**: Twilio
- **Email**: Resend
- **AI Chat**: Claude (via emergentintegrations)
- **PWA/Mobile**: Capacitor for Android

---

## Key API Endpoints

### Authentication
- POST /api/auth/otp/send - Send OTP for login
- POST /api/auth/login - Email/password login (international)
- POST /api/auth/register - User registration

### Orders (SMS-based, no WhatsApp)
- POST /api/appointments - Book appointment (sends SMS to patient & DiaGyn staff)
- POST /api/diagnostics - Book test (sends SMS to patient & Proton staff)
- POST /api/pharmacy - Place order (sends SMS to patient & Orange staff)

### Admin
- POST /api/admin/appointments/cancel - Cancel appointments (session/day/range/session_range)

### Share Reports
- GET /api/glydex/share-report - Generate blood sugar report for WhatsApp
- GET /api/evara/share-period-report - Generate period report for WhatsApp

---

## Test Credentials
- **Admin**: /admin, Password: `nevikacura2026`
- **Staff Doctor**: doc_neha / Nevika@2026D
- **Staff Clinic**: staff_pushpa / Nevika@2026C

---

## Upcoming Tasks (P1)
- [ ] Analytics Dashboard for revenue/appointment trends
- [ ] Payment Gateway Integration (Razorpay/Stripe)
- [ ] Automated Follow-up Reminders

## Future/Backlog (P2-P3)
- [ ] Migrate hardcoded data (medicines, tests) to MongoDB
- [ ] Refactor server.py (6000+ lines)
- [ ] Refactor large frontend components
- [ ] Full Billing & Due Payments System
