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

### Session - January 19, 2026 (Part 2)

#### Completed Features
1. **Patient Portal Dashboard** ✅ (Verified Jan 19)
   - **OTP Login Flow:**
     - Mobile number input with +91 prefix
     - Mock OTP displayed on screen for testing
     - OTP verification returns JWT token
     - Token stored in localStorage for session persistence
   - **Dashboard Features:**
     - Patient info card with name, mobile, patient ID
     - Summary stats: Appointments, Prescriptions, Lab Tests, Bills counts
     - Tabbed interface for viewing history:
       - **Appointments Tab:** Shows appointment history with doctor, clinic, date, time, status badges
       - **Prescriptions Tab:** Shows pharmacy orders with items
       - **Lab Reports Tab:** Shows diagnostic orders with download button
       - **Bills Tab:** Shows billing history with paid/pending status
     - Quick Actions: Book Appointment, Order Medicines, Book Lab Test, Emergency
     - Logout functionality clears session
   - **Backend APIs:**
     - `POST /api/patients/portal/send-otp?mobile=xxx` - Send login OTP
     - `POST /api/patients/portal/verify-otp?mobile=xxx&otp=xxx` - Verify OTP, get token
     - `GET /api/patients/portal/me` - Get logged-in patient profile (requires token)
   - **Testing:** 16/16 backend tests passed, all frontend features verified

### Session - January 19, 2026 (Part 1)

#### Completed Features
1. **Staff Slot Blocking Feature (DiaGyn)** ✅
   - **New Backend APIs:**
     - `POST /api/appointments/block-slots` - Staff can block appointment slots
     - `POST /api/appointments/unblock-slots` - Staff can unblock previously blocked slots
     - `GET /api/appointments/blocked-slots` - Get list of blocked slots for doctor/clinic/date
   - **Access Control (Updated Jan 19):**
     - Only the **respective doctor** can block their own slots
     - **Super Admin** can block any doctor's slots
     - Clinic staff can NO LONGER block slots (removed)
   - **Frontend BlockSlotsDialog:**
     - "Block Slots" button in DiaGyn header (only visible to authorized users)
     - **"Block All Remaining"** quick action button to select all available slots
     - Dialog shows doctor, clinic, date context
     - Grid of available slots to select for blocking
     - "Currently Blocked" section showing blocked slots with unblock option
   - **Backend Change:** Added `doctor_name` field to JWT token for doctor role verification
   - **UI Change:** Removed full-screen push notification prompt (kept SmartNotificationBanner)
   - **Testing:** 9/9 backend tests passed, all frontend features verified

2. **Tablet View Mode & View Switcher** ✅
   - **ViewModeContext:** New context for managing view mode (Auto/Desktop/Tablet/Mobile)
   - **ViewModeSwitcher Component:**
     - Compact 3-icon toggle in header (Desktop | Tablet | Mobile)
     - Full settings version with descriptions in Settings dialog
   - **Settings Dialog:** Added gear icon button (logged-in users) with ViewModeSettings
   - **Pages Updated:**
     - **Home:** Services grid 3-cols, larger stats/actions, Settings dialog
     - **DiaGyn:** Doctor/Clinic cards with larger images, fonts, padding; ViewModeSwitcher in header
     - **StaffPortal:** Tab grid 5-cols on tablet with larger touch targets; ViewModeSwitcher in header
   - **Persistence:** View mode saved to localStorage

3. **Queue Status Fix** ✅
   - Cleared all test bookings from database
   - Updated default queue status to show "0 waiting" instead of fake test data

4. **Patient Registration System** ✅
   - **Backend APIs (`/app/backend/routes/patients.py`):**
     - `POST /api/patients/register` - Register new patient (staff only)
     - `GET /api/patients/lookup?mobile=xxx` - Lookup by mobile (public)
     - `GET /api/patients/{id}` - Get patient details
     - `GET /api/patients/{id}/history` - Get full history
     - `GET /api/patients/{id}/appointments` - Appointment history
     - `GET /api/patients/{id}/prescriptions` - Prescriptions
     - `GET /api/patients/{id}/lab-reports` - Lab reports
     - `GET /api/patients/{id}/bills` - Billing history
     - `GET /api/patients/search/all` - Search patients (staff only)
     - `POST /api/patients/portal/send-otp` - Patient portal OTP
     - `POST /api/patients/portal/verify-otp` - Verify OTP & get token
   - **Auto-generated Patient ID:** Format `NC-YYYY-XXXXX` (e.g., NC-2026-00001)
   - **Frontend Components (`/app/frontend/src/components/PatientRegistration.jsx`):**
     - `PatientLookup` - Mobile lookup with found/not-found states
     - `PatientRegistrationForm` - Staff registration form
     - `PatientRegistrationDialog` - Modal for registration
     - `PatientHistory` - Display patient visit history
     - `PatientLookupOrRegister` - Combined component
   - **DiaGyn Integration:**
     - Patient lookup in Step 4 (Verify)
     - Auto-fill patient details when found
     - Registration dialog for new patients
     - Show visit history for returning patients
   - **StaffPortal Integration:**
     - **Walk-in Tab:** Patient lookup with teal styling, auto-fills form when found
     - **Emergency (SOS) Tab:** Patient lookup with red styling, auto-fills form when found
     - Registration dialog opens for new patients
     - Shows patient ID and visit history count
     - Manual entry fields hidden when patient found via lookup

### Session - January 18, 2026

#### Completed Features
1. **DiaGyn Page Redesign** ✅
   - Complete UI/UX overhaul with new "Serene Care" pastel theme
   - **Color Palette:** Primary #5FA8D3 (Soft Teal), Secondary #62B6CB (Sage), Accent #FFB4A2 (Coral)
   - **Doctor Cards:** Enhanced with highlighted qualifications & degrees in teal boxes
   - **Calendar:** New pastel gradient header, green availability dots, disabled past dates
   - **Time Slots:** Morning (yellow) and Evening (teal) color coding
   - **Step Progress:** New animated progress indicator with connecting lines
   - **Clinic Cards:** Clean design with images and addresses
   - **Mobile Responsive:** All components work well on mobile
   - All existing booking logic preserved (slot blocking, schedule validation, past-date prevention)
   - Bug Fixed: Weekly Schedule dialog now shows proper clinic names
   - 18/19 frontend tests passed (95% success rate)

2. **Proton (Diagnostics) Page Redesign** ✅
   - New pastel teal (#5FA8D3) theme consistent with DiaGyn
   - **Tab Navigation:** Clean Pathology/Imaging tabs
   - **Category Cards:** Colorful icons for Pregnancy, Diabetes, Common Tests, Thyroid, Vitamins
   - **Step Progress:** Cart → Verify → Book flow indicator
   - **How to Book Guide:** 4-step visual guide at top
   - All diagnostic tests preserved (blood, sonography, ECG)

3. **Pharmacy (Orange) Page Redesign** ✅
   - **Distinct vibrant orange gradient** header (more unique identity)
   - **Medicine Icons:** Auto-added emoji icons based on form (💊 Tablet, 🧴 Syrup, 💉 Injection, etc.)
   - **All 4,266 medicines intact** with icons and "Add" labels
   - **Loyalty Program Banner:** Prominent orange gradient banner
   - **Step Progress:** Cart → Verify → Pay

4. **Glydex (Diabetes) Page Redesign** ✅
   - **Bright diabetic-oriented colors:** Vibrant teal-cyan-green gradient background
   - **Quick Action Cards:** Colorful gradient cards (teal, emerald, violet, amber, blue, rose)
   - **Dashboard Header:** Gradient header with white accents
   - All diabetes tracking features preserved

5. **Evara (Women's Wellness) Page Redesign** ✅
   - **Pink-Purple theme:** Fuchsia → Pink → Purple gradient header
   - **Quick Actions:** Colorful gradient cards (pink, purple, violet, rose, amber, blue)
   - **Welcome Banner:** Beautiful fuchsia-pink-purple gradient card
   - All women's wellness features preserved (period tracking, pregnancy calculator, etc.)

### Session - January 17, 2026

#### Completed Features
1. **Smart Medicine Reminders UI** ✅
   - New `/smart-reminders` page with full CRUD functionality
   - Today's Progress hero card with completion percentage
   - Stats cards: Active reminders, Adherence rate, Doses taken (7d), Low stock alerts
   - Three tabs: Today (schedule), Medicines (all reminders), History (14-day adherence chart)
   - Add Medicine dialog with frequency options and time slots
   - Import from Prescription feature
   - Take/Skip buttons for pending doses
   - Refill alerts for low stock medicines
   - Full backend API integration at `/api/medicine-reminders/*`
   - Navigation added from Home page Quick Actions
   - 15/15 backend tests passed

2. **Push Notifications for Medicine Reminders** ✅
   - Added push notification API endpoints:
     - `GET /api/push/vapid-public-key` - Returns VAPID public key
     - `POST /api/push/subscribe` - Save push subscription (with/without auth)
     - `POST /api/push/unsubscribe` - Remove subscription
     - `POST /api/push/test` - Send test notification (requires auth)
   - Cron endpoint `/api/medicine-reminders/cron/send-reminders` sends notifications
   - Fixed notification URL to point to `/smart-reminders`
   - Updated cron script with medicine reminder calls
   - 18/18 backend tests passed

3. **Aggressive Notification Prompts** ✅
   - **Full-screen prompt** on first app open with benefits list
   - **Action-triggered prompts** after booking appointments or adding medicine reminders
   - **Smart re-prompt banner** - re-prompts after 24h (1st skip), 3 days (2nd), 7 days (3rd)
   - Clear benefits: Medicine reminders, Appointment alerts, Order updates, Health tips
   - Privacy reassurance: "Unsubscribe anytime"
   - Stops prompting after 5 skips to respect user choice

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
   - Dedicated page `/senior-care` with PSVN Foundation branding
   - "Give Back" link in navigation (header + footer)
   - Initiatives: For Seniors / Old Age, For Animals
   - Donations removed - now self-sufficient

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

## Protected Data (DO NOT MODIFY)
- **Medicine Inventory:** 4266 medicines
- **Clinic Names:** Pushpa Clinic, Amnion Clinic
- **Doctor Names:** Dr. Vikas, Dr. Neha, etc.
- **Clinic Timings:** Mon-Sat, 11am-2pm & 6pm-10pm

## Key Endpoints
- `POST /api/appointments/block-slots` - Staff block appointment slots
- `POST /api/appointments/unblock-slots` - Staff unblock appointment slots
- `GET /api/appointments/blocked-slots` - Get blocked slots for doctor/clinic/date
- `GET /api/push/vapid-public-key` - Get VAPID public key for push subscriptions
- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/test` - Send test push notification (requires auth)
- `POST /api/medicine-reminders/cron/send-reminders?secret=nevika_cron_2026` - Cron to send reminders
- `GET /api/medicine-reminders/my-reminders` - Get user's medicine reminders with stats
- `GET /api/medicine-reminders/today` - Today's medicine schedule
- `POST /api/medicine-reminders/create` - Create new reminder
- `POST /api/medicine-reminders/log` - Log medicine taken/skipped
- `DELETE /api/medicine-reminders/{id}` - Delete reminder
- `POST /api/medicine-reminders/from-prescription/{id}` - Import from prescription
- `GET /api/biometric-attendance/report/{clinic}` - Daily attendance report
- `GET /api/medication-tracker/today/{user_id}` - Today's medication schedule
- `GET /api/queue/public/{clinic}` - Live queue status
- `GET /api/analytics/overview` - Admin analytics
- `POST /api/patients/portal/send-otp?mobile=xxx` - Patient portal OTP login
- `POST /api/patients/portal/verify-otp?mobile=xxx&otp=xxx` - Verify OTP, get patient token
- `GET /api/patients/portal/me` - Get logged-in patient profile
- `GET /api/patients/{id}/history` - Get full patient history

## Pending User Verification
1. **Push Notification Prompt** - Test on mobile device after PWA install
2. **Face ID Camera** - Mobile device testing needed
3. **App Icon Centering** - Confirm on home screen

## Upcoming Tasks (P1-P2)
1. Cashfree Payment Gateway Integration
2. Refactor StaffPortal.js (4000+ lines)
3. Refactor Home.js (~2000 lines)
4. Apple Sign-In

## Future/Backlog
- Migrate hardcoded data to MongoDB
- Login History page

## Test Credentials
- **Staff:** `staff_pushpa` / `Nevika@2026C`
- **Doctor:** `doc_neha` / `Nevika@2026C`
- **Test User:** `testmed@test.com` / `test123`
- **Mock OTP:** `721358`

## Test Reports
- `/app/test_reports/iteration_47.json` - Staff Slot Blocking (9/9 tests passed - 100% success)
- `/app/test_reports/iteration_45.json` - DiaGyn Redesign (18/19 tests passed - 95% success)
- `/app/test_reports/iteration_44.json` - Push notifications & cron (18/18 tests passed)
- `/app/test_reports/iteration_43.json` - Smart Medicine Reminders (15/15 tests passed)
