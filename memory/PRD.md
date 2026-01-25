# Nevika Cura - Product Requirements Document

## Original Problem Statement
Build a comprehensive healthcare application named "Nevika Cura" to enhance staff and patient experience with features for appointment booking, pharmacy orders, diagnostic tests, women's wellness (Evara), diabetes care (Glydex), kids health (Alyne), and staff management.

## Core Architecture
- **Frontend:** React with Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **SMS:** Twilio (for transactional confirmations only, NOT for auth/login)
- **Email:** Resend
- **Payments:** Stripe (via emergentintegrations library)

## What's Been Implemented

### Session - January 25, 2026 (Part 3 - Current)

#### Completed Features
1. **Payment Email Receipts** ✅
   - Added `send_payment_receipt()` function in `payments.py`
   - Professional HTML email template with payment details
   - Triggered automatically after successful Stripe webhook
   - Uses Resend API for email delivery

2. **Payment SMS Confirmations** ✅
   - Added `send_payment_sms_confirmation()` function in `payments.py`
   - Uses Twilio for SMS delivery
   - Triggered automatically after successful payment

3. **StaffPortal.js Refactoring** ✅
   - Created `/app/frontend/src/components/staff/WalkInTab.jsx` - Walk-in booking component
   - Created `/app/frontend/src/components/staff/EmergencyTab.jsx` - Emergency booking component
   - Created `/app/frontend/src/components/staff/BillingTab.jsx` - Fee collection/billing component
   - Created `/app/frontend/src/components/staff/PatientsTab.jsx` - Patient management component
   - Imports added to StaffPortal.js for gradual migration
   - Original file remains functional (4,736 lines)

4. **Twilio SMS Confirmations (Already Implemented)** ✅
   - Appointment confirmations (online, walk-in, emergency)
   - Pharmacy order confirmations and status updates
   - Lab test booking confirmations and status updates
   - Payment confirmation SMS (new)

5. **Payment History Dashboard** ✅
   - New page at `/payment/history` for patients to view payment history
   - Phone number verification flow
   - Stats cards: Total Spent, Transactions, Paid, Pending
   - Filterable by payment type and status
   - Receipt view modal with download option
   - Backend endpoint: `GET /api/patients/by-phone/{phone}` added
   - Linked from Patient Portal menu

### Session - January 25, 2026 (Part 2)

#### Completed Features
1. **Stripe Payment Integration** ✅
   - Full payment integration for appointments, pharmacy orders, and lab tests
   - Backend API endpoints:
     - `POST /api/payments/create-checkout` - Creates Stripe checkout session
     - `GET /api/payments/status/{session_id}` - Gets payment status
     - `POST /api/payments/webhook/stripe` - Handles Stripe webhooks
     - `GET /api/payments/fee-codes` - Returns all consultation & scan fees
     - `GET /api/payments/transactions` - Payment history with filters
   - Frontend components:
     - `FeeSelector` - Categorized fee selection UI
     - `PaymentCheckout` - Payment summary and checkout initiation
     - `PaymentSuccess` / `PaymentCancel` - Result pages at `/payment/success` and `/payment/cancel`
   - DiaGyn booking flow updated to 6 steps: Doctor → Clinic → Schedule → Verify → Fee & Pay → Confirm
   - Fee codes defined: 12 consultation fees + 6 scan fees
   - Integration uses Stripe test keys from environment

### Session - January 25, 2026 (Part 1)

#### Completed Features
1. **Bottom Navigation - Option 2 Style** ✅
   - Gray inactive icons (bg-slate-100) with colorful active icon
   - Theme-appropriate colors per page:
     - Home: Teal (bg-teal-500)
     - Pharmacy: Orange (bg-orange-500)
     - Lab Tests: Blue (bg-blue-500)
     - Profile: Slate (bg-slate-600)
   - Central "Book" button always prominent (rose/pink gradient)
   - Book modal with Doctor Appointment and Sonography options
   - Scroll-aware behavior: hides while scrolling, reappears when stopped

2. **Reusable BottomNav Component** ✅
   - New `/app/frontend/src/components/BottomNav.jsx`
   - Added to DiaGyn.js, Pharmacy.js, and Proton.js pages
   - Auto-detects active tab based on URL pathname
   - Includes booking modal for appointments

3. **HTML Loading Splash - Disappearing Icons** ✅
   - Replaced bouncing colored dots with cycling icons
   - Icons: Pharmacy (pill), Book (calendar), Lab Tests (test tube)
   - Larger 64x64 size with 16px border radius
   - 3-second cycle animation (icon-cycle keyframe)
   - Reduced gap between logo and icons (20px)

4. **React SplashScreen Improvements** ✅
   - Oval-shaped white container for Nevika Cura logo
   - Full screen coverage (position: fixed, 100vw, 100dvh)
   - Body scroll lock when splash is visible
   - z-index: 99999 to hide bottom navigation
   - Disappearing icons animation (Appointments, Pharmacy, Lab Tests)

5. **Code Refactoring - Home.js** ✅
   - Reduced from 2793 lines to 1570 lines (~44% reduction)
   - Extracted static data to `/app/frontend/src/data/homeData.js`:
     - healthTips, spotlightServices, testimonials
     - whyChooseUs, featuredDoctors, certifications
     - howItWorksSteps, clinicLocations
   - Extracted AuthModal to `/app/frontend/src/components/AuthModal.jsx`
   - Added iconMap for data-driven icon rendering
   - All features preserved and working

6. **MongoDB Data Migration** ✅
   - Created `/app/backend/routes/config.py` - Config API routes
   - Created `/app/backend/data/clinic_config.py` - Seed data
   - New MongoDB Collections:
     - `clinics` - Clinic information (2 records)
     - `doctors` - Doctor profiles with schedules (2 records)
     - `fee_codes` - Consultation & scan fees (18 records)
     - `services` - App services (6 records)
     - `certifications` - Clinic certifications (5 records)
     - `testimonials` - Patient testimonials (4 records)
     - `health_tips` - Health tips (12 records)
   - API Endpoints:
     - `GET /api/config/clinics` - Get all clinics
     - `GET /api/config/doctors` - Get all doctors
     - `GET /api/config/doctor-schedules/{name}` - Get doctor schedules
     - `GET /api/config/fees` - Get all fee codes
     - `GET /api/config/services` - Get all services
     - `GET /api/config/testimonials` - Get testimonials
     - `GET /api/config/health-tips` - Get health tips
     - `GET /api/config/health-tip/today` - Get today's health tip
     - `POST /api/config/seed` - Seed initial data
   - Frontend updated with API fetch functions (fallback to static data)

7. **Admin Panel UI** ✅
   - Created `/app/frontend/src/pages/AdminPanel.js`
   - Route: `/admin-panel` (accessible via Staff Portal for super_admin users)
   - Features:
     - 7 Tabs: Clinics, Doctors, Fees, Services, Reviews, Tips, Certifications
     - Full CRUD operations (Create, Read, Update, Delete)
     - Admin-only API endpoints with JWT verification
     - Edit modal for each data type
     - Responsive design with grid layouts
   - Admin API Endpoints (require admin/super_admin JWT):
     - `POST/PUT/DELETE /api/config/admin/clinics`
     - `POST/PUT/DELETE /api/config/admin/doctors`
     - `POST/PUT/DELETE /api/config/admin/fees`
     - `POST/PUT/DELETE /api/config/admin/services`
     - `POST/PUT/DELETE /api/config/admin/testimonials`
     - `POST/PUT/DELETE /api/config/admin/health-tips`
     - `POST/PUT/DELETE /api/config/admin/certifications`
   - Created super_admin user: username: `super_admin`, password: `superadmin`

#### Testing Results
- `/app/test_reports/iteration_50.json` - 100% frontend success rate
- All bottom navigation features verified
- Splash screen coverage verified
- Navigation flow between pages verified

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

### Payment Endpoints (NEW - Stripe Integration)
- `POST /api/payments/create-checkout` - Create Stripe checkout session
- `GET /api/payments/status/{session_id}` - Get payment status
- `POST /api/payments/webhook/stripe` - Stripe webhook handler
- `GET /api/payments/fee-codes` - Get all consultation & scan fees
- `GET /api/payments/transactions` - Get payment history with filters

### Appointment Endpoints
- `POST /api/appointments/block-slots` - Staff block appointment slots
- `POST /api/appointments/unblock-slots` - Staff unblock appointment slots
- `GET /api/appointments/blocked-slots` - Get blocked slots for doctor/clinic/date

### Push Notification Endpoints
- `GET /api/push/vapid-public-key` - Get VAPID public key for push subscriptions
- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/test` - Send test push notification (requires auth)

### Medicine Reminder Endpoints
- `POST /api/medicine-reminders/cron/send-reminders?secret=nevika_cron_2026` - Cron to send reminders
- `GET /api/medicine-reminders/my-reminders` - Get user's medicine reminders with stats
- `GET /api/medicine-reminders/today` - Today's medicine schedule
- `POST /api/medicine-reminders/create` - Create new reminder
- `POST /api/medicine-reminders/log` - Log medicine taken/skipped
- `DELETE /api/medicine-reminders/{id}` - Delete reminder
- `POST /api/medicine-reminders/from-prescription/{id}` - Import from prescription

### Other Endpoints
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
2. **Face ID Camera** - Mobile device testing needed (recurring issue)

## Session January 19, 2026 - Bug Fixes
1. **Weekly Schedule Dialog** - Fixed [object Object] display, now shows proper clinic names with session times
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
- `/app/test_reports/iteration_51.json` - Refactoring Regression Test (100% success)
- `/app/test_reports/iteration_50.json` - Bottom Nav & Splash Screen (100% frontend success)
- `/app/test_reports/iteration_49.json` - Patient Portal Dashboard (16/16 tests passed - 100% success)
- `/app/test_reports/iteration_47.json` - Staff Slot Blocking (9/9 tests passed - 100% success)
- `/app/test_reports/iteration_45.json` - DiaGyn Redesign (18/19 tests passed - 95% success)
- `/app/test_reports/iteration_44.json` - Push notifications & cron (18/18 tests passed)
- `/app/test_reports/iteration_43.json` - Smart Medicine Reminders (15/15 tests passed)
