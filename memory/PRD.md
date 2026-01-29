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
  3. **Serena** - Mental Wellness & Meditation (tree person logo) - *NEW*
  4. Aanya - Newborn Care
  5. Alyne Kids - Child Care
  6. **Corvia** - Heart, Hypertension & Cholesterol (lime green heart logo) - *NEW*
  7. **Reneu** - Preventive Health (leaf person logo) - *NEW*
  8. **Thrive360** - Fitness & Physical Wellness (runner logo) - *NEW*
  9. **Senova** - Senior Care (people with shield logo) - *NEW*
  10. Reports - Blood Charts
  11. Health Log - Weight & Logs
  12. PSVN Foundation (HandHeart icon)
- ✅ **Portal Page Renaming Complete:**
  - FitLife → Thrive360 (fitness portal with custom runner logo)
  - ThriveMind → Serena (mental wellness with tree/person logo)
  - Cardyra → Corvia (heart/hypertension with heart logo)
  - Nivara → Senova (senior care with people/shield logo)
  - Vireya → Reneu (preventive health with leaf/person logo)
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
- ~~Email-only signup flow~~ ✅ DONE (Evara)
- ~~Subscription system (Glydex/Evara)~~ ✅ DONE
- Complete MSG91 Facebook verification (user action required)

### P1 (High Priority)
- Extend email-only signup to Glydex and other portals
- Connect frontend enhancement components to backend APIs (~30 features)
- Test Staff Portal QR Scanner end-to-end
- Test doctor consultation completion flow end-to-end
- Get remaining 9 MSG91 templates approved by Meta

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
January 29, 2026

## Recent Updates (January 29, 2026)

### Email-Only Signup Flow ✅
- **Evara page** now uses email OTP verification instead of SMS
- 3-step signup: Email → OTP Verification → Complete Profile
- Phone number is now optional
- Email OTP endpoints: `/api/auth/email-otp/send`, `/api/auth/email-otp/verify`
- AuthContext updated with `sendEmailOtp`, `verifyEmailOtp`, `loginWithEmailOtp`, `registerWithEmailOtp`

### Subscription System (Glydex/Evara) ✅
- Backend routes: `/app/backend/routes/subscriptions.py`
- 400 coupon codes generated (200 Glydex + 200 Evara)
- Coupon PDF sent to `nevikacura@gmail.com` via Resend
- `SubscriptionGate` component protects premium content
- Admin panel has subscription management UI

### Pharmacy Pills Filtering ✅
- Health concern pills now properly filter medicines
- Categories: Diabetes, Heart Care, Pain Relief, Digestive, Skin Care, Cold & Cough, Vitamins, Eye Care, Bone & Joint

### Header Stutter Fix ✅
- Applied `will-change-transform` CSS optimization to PortalScrollBar

### MSG91 WhatsApp Status
- Only 1/10 templates approved by Meta (diagyn_appointment_confirm)
- Other templates pending Meta approval
- Twilio SMS now used only for OTP verification

### Coupon Security & Validity (January 29, 2026) ✅
- **Glydex**: Validity changed from 365 → **180 days (6 months)**
- **Evara**: Validity changed from 365 → **270 days (9 months)**
- **Security**: Coupons now bind to device_id + email on first validation
- Prevents coupon sharing across different devices/accounts

### Login with Email ✅
- Added "Login with Email" button to both Evara and Glydex
- Existing users can now login via email OTP without password

### Glydex Email-Only Signup ✅
- Extended email OTP signup to Glydex page
- Same 3-step flow as Evara: Email → OTP → Complete Profile

### Clinic Locations UI Redesign ✅
- Modern card design with gradient headers
- Service tags (Consultations, Sonography, Lab Tests)
- Colorful icon boxes for address, phone, hours
- Gradient "Get Directions" buttons with hover effects

---

## Code Architecture (Portal Pages)
```
/app/frontend/src/
├── components/
│   └── PortalScrollBar.jsx  # 12 portals with custom logos
├── pages/
│   ├── Serena.js           # Mental wellness (formerly ThriveMind)
│   ├── Corvia.js           # Heart/BP care (formerly Cardyra)
│   ├── Reneu.js            # Preventive health (formerly Vireya)
│   ├── Thrive360New.js     # Fitness (formerly FitLife)
│   ├── Senova.js           # Senior care (formerly Nivara)
│   └── PSVNFoundation.js   # Foundation page
└── App.js                   # Updated routes
```

---

## Latest Updates (January 29, 2026 - Session 2)

### Membership Plans System ✅
**Complete membership and family plan system with checkout flow**

**Individual Plans (3 tiers):**
- **Basic Membership**: ₹999/month, ₹2499/quarter, ₹7999/year
  - 5% pharmacy discount, 10% lab discount, access to 1 portal
- **Standard Membership** (Popular): ₹1999/month, ₹4999/quarter, ₹14999/year
  - 10% pharmacy discount, 15% lab discount, access to 4 portals, priority booking
- **Premium Membership** (Best Value): ₹3499/month, ₹8999/quarter, ₹29999/year
  - 20% pharmacy discount, 30% lab discount, all portals, home doctor visits

**Family Plans (4 options for up to 4 members):**
- Family Diagnostic Plan: ₹3999/quarter
- Family Diagnostic + Pharmacy: ₹6499/quarter
- Complete Family Care: ₹12999/quarter
- Family Portal Access: ₹4999/quarter

**Files:**
- `/app/frontend/src/pages/MembershipPlans.js` - Main membership page
- `/app/backend/routes/subscriptions.py` - Updated with membership endpoints

### How to Install Page ✅
**Step-by-step PWA installation guide at `/install`**

- **Android (Chrome)** tab: 5 steps with tips
- **iPhone (Safari)** tab: 5 steps with tips
- Benefits section: Faster Loading, Secure, Works Offline, Notifications
- FAQ section
- WhatsApp support button

**File:** `/app/frontend/src/pages/HowToInstall.js`

### Homepage Quick Actions Update ✅
- Replaced "Full Body Package" with **"Membership Plans"** button
- Crown icon with amber/orange gradient
- Navigates to `/membership-plans`

**File:** `/app/frontend/src/components/home/QuickActionCards.jsx`

### Report Trends Chart Component ✅
**Reusable component for visualizing lab report trends**

- Parameter selection pills
- Mini bar chart visualization
- Status indicators (Normal, Borderline, High/Low)
- Insights and history table
- Time range selector (3mo, 6mo, 1yr, All)

**File:** `/app/frontend/src/components/ReportTrendsChart.jsx`

### Appointment Waitlist Component ✅
**Join waitlist when slots unavailable**

- Preferred date selection (next 7 days)
- Notification method (SMS, WhatsApp, Both)
- Position tracking
- Leave waitlist option

**Files:**
- `/app/frontend/src/components/AppointmentWaitlist.jsx`
- Backend endpoints in `/app/backend/server.py`

### Backend API Additions
```
GET  /api/subscriptions/membership-plans
GET  /api/subscriptions/membership-plans/{plan_id}
POST /api/subscriptions/membership/purchase
GET  /api/appointments/waitlist/status
POST /api/appointments/waitlist/join
POST /api/appointments/waitlist/leave
GET  /api/diagnostics/trends/{patient_id}
```

---

## Promotional Video Storyboard ✅
**5-in-1 video script provided for Nevika Cura promotional video:**
1. How to Install from Chrome (Add to Home Screen)
2. Book Doctor Appointment (DiaGyn flow)
3. Order Medicines (Orange Pharmacy flow)
4. Book Lab Tests (Proton Diagnostics flow)
5. Explore Health Portals (Evara, Glydex, Corvia, Reneu, Thrive360, Senova, Serena)

---

## Testing Status
- **Test Report:** `/app/test_reports/iteration_68.json`
- **Backend Tests:** 12/12 passed (100%)
- **Frontend Tests:** All passed (100%)
- **Components tested:** MembershipPlans, HowToInstall, QuickActionCards, Checkout Modal

---

## Upcoming Tasks (P0)
1. Build UI for Report Trends on Proton/Health Dashboard pages
2. Integrate AppointmentWaitlist into DiaGyn booking flow
3. Build Home Sample Collection UI for Proton
4. Build Pharmacy Features UI (refill reminders, monthly box)
5. Test prescription upload email to nevikacura@gmail.com

## Known Issues
- MSG91 WhatsApp templates pending Meta approval
- Stripe API key is test key (payment will fail in test environment)

## Last Updated
January 29, 2026 - 22:30

---

## Updates (January 30, 2026)

### Header Cleanup ✅
- Removed Language Selector toggle from header
- Removed Dark Mode toggle from header
- Removed View Mode Switcher from header
- Header now shows only: Logo + Hamburger menu (clean design)

### Video Instructions Email Sent ✅
- Comprehensive 2-minute video storyboard sent to nevikacura@gmail.com
- Covers: App installation (Android/iOS), Doctor booking, Medicine ordering, Lab tests, Portal exploration
- For Gemini Veo video generation
- Email ID: bee6689f-7e44-426e-84ea-cee4ecb6853f

### Components Ready for Integration
- **ReportTrendsChart.jsx** - Ready at `/app/frontend/src/components/`
- **AppointmentWaitlist.jsx** - Ready at `/app/frontend/src/components/`
- Integration pending for Health Dashboard, DiaGyn, Proton pages

