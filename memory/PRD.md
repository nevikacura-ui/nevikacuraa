# Nevika Cura - Product Requirements Document

## Original Problem Statement
Build a comprehensive healthcare application named "Nevika Cura" to enhance staff and patient experience with features for appointment booking, pharmacy orders, diagnostic tests, women's wellness (Evara), diabetes care (Glydex), kids health (Alyne), and staff management.

## Core Architecture
- **Frontend:** React with Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **SMS:** Twilio
- **Email:** Resend

## What's Been Implemented

### Session - January 16, 2026

#### Completed Features
1. **Homepage Service Cards Fix** ✅
   - Fixed Evara, Glydex, Alyne logos to fill entire card with uniform colors
   - Used `object-cover` for fillLogo items to eliminate dual-color issue

2. **Homepage Enhancement Features (1-3)** ✅
   - **Health Tip of the Day**: 12 rotating daily health tips with categories, dismissible banner
   - **Service Spotlight Carousel**: 4 featured services auto-rotating every 5 seconds with navigation
   - **Personalized Greeting Banner**: Time-based greeting for logged-in users with quick appointment access

3. **Homepage Enhancement Features (4-8)** ✅
   - **Quick Health Stats Widget**: Last checkup, prescriptions, appointments for logged-in users
   - **Smart Search Bar with Voice Input**: Voice search + auto-suggestions with type tags
   - **Testimonials Carousel**: 4 patient reviews with ratings, auto-rotating every 6 seconds
   - **Health Streak/Gamification**: Daily activity tracking with streak counter and fire emoji
   - **Live Queue Status Preview**: Real-time clinic wait times with color-coded status

### Session - January 15, 2026

#### Completed Features
1. **App Icon & Splash Screen** ✅
   - Custom app icon using user-provided colorful healthcare logo
   - Splash screen with "Nevika Cura" text and 4 bouncing colorful dots
   - All PWA icon sizes (72x72 to 512x512) generated

2. **Senior Care Charity Module** ✅
   - Dedicated page `/senior-care` with PSVN Charitable Trust branding
   - "Give Back" link in navigation (header + footer)
   - 5 program initiatives: DiaGyn, Orange Pharmacy, Proton, Evara, Glydex
   - Donation tiers: ₹300, ₹500, ₹800, ₹2000
   - UPI payment: `pinelabs.stq4087704@pineaxis`
   - Bank details: State Bank of Mauritius, A/C: 20229833188288, IFSC: STCB0000065

3. **Staff Attendance Data Saving** ✅ (Bug Fix)
   - Fixed API endpoint from `/daily-report` to `/report/{clinic}`
   - Added new `/monthly-report` endpoint
   - Updated StaffDashboard.jsx and BiometricAttendance.jsx
   - Verified with 18/18 backend tests passing

4. **Medication Tracker** ✅
   - Full CRUD operations for medications
   - Today's schedule with adherence tracking
   - Refill alerts for low stock
   - Statistics and history tracking

#### Previously Completed (This Session)
- Automated Sonography Reminders (cron job)
- Real-Time Queue System (`/queue` public page)
- Patient Health Dashboard (`/health-dashboard`)
- Clinic Analytics Dashboard (Admin tab)
- UI fixes (addresses, timings, footer cleanup)

## Protected Data (DO NOT MODIFY)
- **Medicine Inventory:** 4266 medicines
- **Clinic Names:** Pushpa Clinic, Amnion Clinic
- **Doctor Names:** Dr. Vikas, Dr. Neha, etc.
- **Clinic Timings:** Mon-Sat, 11am-2pm & 6pm-10pm

## Key Endpoints
- `GET /api/biometric-attendance/report/{clinic}` - Daily attendance report
- `GET /api/biometric-attendance/monthly-report` - Monthly attendance summary
- `POST /api/biometric-attendance/mark-attendance` - Check-in/check-out
- `GET /api/medication-tracker/today/{user_id}` - Today's medication schedule
- `POST /api/medication-tracker/medications/{user_id}` - Add medication
- `POST /api/medication-tracker/log/{user_id}` - Log medication taken/skipped
- `GET /api/queue/public/{clinic}` - Live queue status
- `GET /api/analytics/overview` - Admin analytics

## Pending User Verification
1. **Face ID Camera** - Mobile device testing needed
2. **Staff Attendance UI** - Confirm data is now displaying correctly

## Upcoming Tasks (P1-P2)
1. Cashfree Payment Gateway Integration
2. Refactor StaffPortal.js (4000+ lines)
3. Apple Sign-In

## Future/Backlog
- Migrate hardcoded data to MongoDB
- Login History page
- Checkout round-up donations

## Test Credentials
- **Staff:** `staff_pushpa` / `Nevika@2026C`
- **Doctor:** `doc_neha` / `Nevika@2026C`
- **Mock OTP:** `721358`

## Test Reports
- `/app/test_reports/iteration_42.json` - Latest (18/18 tests passed)
