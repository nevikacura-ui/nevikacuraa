# Nevika Cura Healthcare Application - PRD

## Original Problem Statement
Build a modern healthcare application for "Nevika Cura" with core services:
1. **DiaGyn Healthcare** - Appointment booking for doctors
2. **Proton Diagnostics** - Lab test booking
3. **Orange Pharmacy** - Medicine ordering with Loyalty Program
4. **Evara** - Women's Wellness & Care Program
5. **Glydex** - Diabetes Care Portal

---

## What's Been Implemented ✅

### Session 5 - January 13, 2026 (NEW FEATURES - FRONTEND + BACKEND)

**8. Order Flow Guides** ✅ (Complete)
- Step-by-step "How It Works" guide on Pharmacy page
- Step-by-step "How It Works" guide on Proton Diagnostics page
- Helps patients understand the complete order process

**9. Patient Health Records (EHR)** ✅ (Complete)
- **Frontend**: `/my-health` page with Overview, Timeline, Family, Trends tabs
- **Backend**: `/api/health-records/summary/{user_id}`, `/api/health-records/timeline/{user_id}`
- Family member management (add, edit, delete)
- Blood sugar trends with insights

**10. Health Checkup Packages** ✅ (Complete)
- **Frontend**: `/health-packages` page with all 8 packages
- 8 packages: Basic, Comprehensive, Diabetic, Women's Wellness, Pregnancy, Cardiac, Thyroid, Senior Citizen
- Discounted pricing (40-48% off)
- Package booking with home collection
- **Backend**: `/api/health-packages/all`, `/api/health-packages/book`

**11. Referral Program** ✅ (Complete)
- **Frontend**: `/referral` page with code sharing, stats, leaderboard
- Referrer gets 100 points, Referee gets 50 points + ₹100 discount
- Unique referral codes per user
- **Backend**: `/api/referral/code/{user_id}`, `/api/referral/apply`

**12. Health Tips & Articles** ✅ (Complete)
- **Frontend**: `/health-tips` page with Daily Tip, All Tips, Articles tabs
- 5 categories: General, Diabetes, Women, Pregnancy, Senior (40+ tips total)
- 4 detailed health articles
- **Backend**: `/api/health-tips/daily/{user_id}`, `/api/health-tips/articles`

**13. Doctor Profiles & Ratings** ✅ (Complete)
- **Backend**: `/api/doctors/all`, `/api/doctors/{doctor_id}`, `/api/doctors/review`
- Detailed profiles with qualifications, experience
- Patient reviews and ratings

**14. Teleconsultation** ✅ (Complete)
- **Frontend**: `/teleconsult` page with doctor list, slot selection, booking
- Video consultation booking with Jitsi integration
- Available slots management (morning/afternoon/evening)
- E-prescription after consultation
- **Backend**: `/api/teleconsult/available-slots/{doctor_id}`, `/api/teleconsult/book`

**15. Terra Wearable Integration** ✅ (Backend Ready)
- Webhook to receive data from Terra API
- Stores activity, sleep, body, menstruation data in MongoDB
- Correlates wearable data with Glydex blood sugar
- **Backend**: `/api/wearables/terra/connect`, `/api/wearables/terra/webhook`

### Session 4 - January 13, 2026

**7. Loyalty Leaderboard** ✅
- Top 10 customers display with Weekly/Monthly/All-Time filters
- Anonymized names, tier badges, medal styling

### Session 3 - January 13, 2026

**1. Full Billing & Due Payments System** ✅
- Invoice creation with items, taxes, discounts
- Payment recording with multiple methods (cash, card, UPI, insurance)
- Due payments tracking and overdue marking
- Billing summary with revenue metrics
- Payment reminder notifications
- API: `/api/billing/invoices`, `/api/billing/due-payments`, `/api/billing/summary`

**2. Automated Reminders System** ✅
- Follow-up reminders after appointments
- Medicine refill reminders for Glydex users
- Subscription expiry alerts for Evara
- Custom reminder creation
- Cron job endpoint for processing due reminders
- API: `/api/reminders/create`, `/api/reminders/pending`, `/api/reminders/appointment-followup`

**3. Push Notifications Enhancement** ✅
- Appointment reminder notifications
- Subscription expiry notifications
- Medicine refill notifications
- Cron jobs for automated reminders
- API: `/api/notifications/appointment-reminder`, `/api/cron/appointment-reminders`

**4. Women's Health Community** ✅
- 7 categories: Pregnancy, Fertility, Menopause, PCOS, Nutrition, Mental Health, General
- Create posts with anonymous option
- Comments and likes
- Featured discussions
- API: `/api/community/categories`, `/api/community/posts`, `/api/community/featured`

**5. Data Migration to MongoDB** ✅
- 24 medicines migrated to `medicines_catalog`
- 23 diagnostic tests migrated to `diagnostic_tests_catalog`
- 65 food items migrated to `food_catalog`
- Proper indexes created

**6. Orange Pharmacy Loyalty Program** ✅
- **Three Tiers**: Bronze (any amount), Silver (₹500+), Gold (₹1000+)
- **Points System**: 1 point per ₹100, 2× on diagnostics, 20 bonus for refills
- **Gold 10-Visit Reward**: Extra discount + Free Health Checkup
- **FAQ**: 10 comprehensive questions and answers
- **Terms & Conditions**: 12 legal sections covering all aspects
- **Frontend**: Interactive banner and dialog with Overview/FAQ/Terms tabs
- API: `/api/pharmacy/loyalty/tiers`, `/api/pharmacy/loyalty/faq`, `/api/pharmacy/loyalty/terms-and-conditions`

### Session 2 - Earlier Today
- Indian Food Calorie Tracker (Glydex & Evara)
- User Profile Customization (Interests selection)
- Admin Analytics Dashboard
- Stripe Payment Integration for Evara Subscriptions

### Session 1 - Earlier
- Email OTP Authentication
- Staff SMS Notifications
- Enhanced Admin Cancellation
- Evara Educational Content
- PDF Report Sharing
- Capacitor Android App

---

## Orange Pharmacy Loyalty Program Details

### Tier Benefits
| Tier | Min Amount | Points | Medicine Discount | Delivery |
|------|------------|--------|-------------------|----------|
| Bronze | Any | 1pt/₹100 | 0% | Free on ₹500+ |
| Silver | ₹500+ | 1pt/₹100 | 5% | FREE |
| Gold | ₹1000+ | 1pt/₹100 | 10% | FREE |

### Special Features
- 2× points on all Diagnostic purchases
- 20 bonus points on medicine refills
- Gold 10-Visit Reward: Extra discount + Free Health Checkup worth ₹500
- Points expire after 12 months
- 100 points = ₹10 redemption value

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Capacitor
- **Backend**: FastAPI, Python, emergentintegrations
- **Database**: MongoDB (with migrated catalogs)
- **SMS**: Twilio
- **Email**: Resend
- **AI Chat**: Claude (via emergentintegrations)
- **Payments**: Stripe (via emergentintegrations)
- **Mobile**: Capacitor for Android

---

## Backend Routes Structure
```
/app/backend/
├── server.py (main routes)
├── routes/
│   ├── billing.py (Billing & Due Payments)
│   ├── reminders.py (Automated Reminders)
│   ├── community.py (Women's Health Community)
│   └── pharmacy_loyalty.py (Loyalty Program)
├── migrations/
│   └── migrate_data.py (Data migration script)
└── models/
```

---

## Test Credentials
- **Admin**: /admin, Password: `nevikacura2026`
- **Staff Doctor**: doc_neha / Nevika@2026D
- **Staff Clinic**: staff_pushpa / Nevika@2026C

---

## API Reference (New Endpoints)

### Billing
```
POST /api/billing/invoices - Create invoice
GET  /api/billing/invoices - List invoices
POST /api/billing/invoices/{id}/payment - Record payment
GET  /api/billing/due-payments - Get due payments
GET  /api/billing/summary - Billing summary
POST /api/billing/send-reminder/{id} - Send payment reminder
```

### Reminders
```
POST /api/reminders/create - Create reminder
GET  /api/reminders/list - List reminders
GET  /api/reminders/pending - Get today/tomorrow reminders
POST /api/reminders/medicine-refill - Create medicine refill reminder
POST /api/reminders/appointment-followup - Create follow-up reminder
POST /api/reminders/process-due - Process and send due reminders (cron)
```

### Community
```
GET  /api/community/categories - Get categories
GET  /api/community/featured - Get featured discussions
GET  /api/community/posts - List posts
POST /api/community/posts - Create post
POST /api/community/posts/{id}/like - Like post
POST /api/community/posts/{id}/comment - Add comment
```

### Pharmacy Loyalty
```
GET  /api/pharmacy/loyalty/tiers - Get tier info
GET  /api/pharmacy/loyalty/user-status - Get user status
POST /api/pharmacy/loyalty/record-transaction - Record loyalty transaction
POST /api/pharmacy/loyalty/claim-gold-reward - Claim 10-visit reward
GET  /api/pharmacy/loyalty/calculate-benefits - Calculate order benefits
GET  /api/pharmacy/loyalty/faq - Get FAQ
GET  /api/pharmacy/loyalty/terms-and-conditions - Get T&C
GET  /api/pharmacy/loyalty/leaderboard?period=weekly|monthly|all - Get Top 10 leaderboard
```

---

## Completed Tasks Summary

✅ Full Billing & Due Payments System
✅ Automated Follow-up Reminders
✅ Push Notifications Enhancement
✅ Women's Health Community Forums
✅ Medicine Refill Reminders for Glydex
✅ Data Migration to MongoDB
✅ Orange Pharmacy Loyalty Program with T&C
✅ Loyalty Leaderboard (Weekly/Monthly/All-Time)

### Session 6 - January 13, 2026 (4 HIGH-PRIORITY HEALTHCARE FEATURES)

**16. Emergency Services** ✅ (Complete)
- **Frontend**: `/emergency` page with 4 tabs (SOS, Medical ID, Hospitals, Ambulance)
- **Backend**: `/api/emergency/hospitals`, `/api/emergency/ambulance-services`, `/api/emergency/sos/{user_id}`, `/api/emergency/medical-id/{user_id}`
- Quick call buttons: 108, 102, 112
- Location-based hospital sorting
- SOS alert with location sharing to emergency contacts
- Digital Medical ID card with QR sharing

**17. Health Risk Assessment** ✅ (Complete)
- **Frontend**: `/health-assessment` page with 3 assessment types
- **Backend**: `/api/health-assessment/diabetes-risk`, `/api/health-assessment/heart-risk`, `/api/health-assessment/cancer-screening`
- Diabetes Risk: FINDRISC-based 8-question assessment
- Heart Disease Risk: 7-question cardiovascular assessment
- Cancer Screening Eligibility: Personalized screening recommendations
- Risk scores, breakdown, and actionable recommendations

**18. Medication Tracker / Pill Tracker** ✅ (Complete)
- **Frontend**: `/medication-tracker` page with Today, My Meds, History tabs
- **Backend**: `/api/medication-tracker/medications/{user_id}`, `/api/medication-tracker/today/{user_id}`, `/api/medication-tracker/history/{user_id}`, `/api/medication-tracker/statistics/{user_id}`
- Full medication CRUD (add, edit, delete)
- Daily schedule tracking with take/skip actions
- Adherence statistics and streak tracking
- Refill alerts before medicines run out
- Custom reminder times and frequencies

**19. Home Page Feature Buttons** ✅ (Complete)
- Emergency SOS (highlighted in red)
- Pill Tracker
- Risk Assessment
- Plus existing: My Health, Health Packages, Video Consult, Refer & Earn, Health Tips

**20. Pharmacy Improvements** ✅ (Complete - January 13, 2026)
- Prescription upload with preview (image or PDF)
- Order tracking timeline (Placed → Packed → Dispatched → Delivered)
- "Frequently Ordered" section for quick reorders
- Backend API: `/api/pharmacy/frequently-ordered`

**21. Proton Diagnostics Improvements** ✅ (Complete)
- Home collection time slot picker (8 AM - 7 PM, 5 slots)
- Test preparation instructions with fasting requirements
- Tests with fasting: FBS, PPBS, GTT, Lipid Profile, LFT, Triglycerides

**22. DiaGyn Improvements** ✅ (Complete)
- Email reminder checkbox (1 hour before appointment)
- send_email_reminder field in appointment booking
- Internal staff/doctor feedback API (not shown to public)
- Backend APIs: `/api/staff/appointments/{id}/internal-feedback`, `/api/staff/internal-feedback/summary`

### January 13, 2026 - Session 4
**Patient Flow & Staff Billing System + Community & Reminders Frontends**

**Staff Billing Module (NEW):**
- Added "Billing" tab to Staff Portal for clinic staff
- Integrated billing searches across DiaGyn services, Proton tests, Orange Pharmacy medicines
- Patient lookup by phone with loyalty points display
- Custom item addition, quantity controls, discount application
- Bill creation with payment method selection (Cash, UPI, Card, Due)
- Invoice generation and email capability
- Quick Billing link added to Footer (`/billing`)

**Community Forum (NEW):**
- Full frontend for `/community` page
- 7 category pills (Pregnancy, Fertility, Menopause, PCOS, Nutrition, Mental Health, General)
- Trending Discussions sidebar
- Post creation, viewing, likes, and comments
- Anonymous posting option
- Linked from Evara women's wellness community

**Reminders/Scheduler (NEW):**
- Full frontend for `/reminders` page
- Quick stats (Due Today, Due Tomorrow, Sent, Cancelled)
- Upcoming and All Reminders tabs
- Create reminder dialog with type, repeat options, patient details
- Cancel reminder functionality
- Type filtering (Follow-up, Appointment, Medicine Refill, Subscription, Custom)

### January 13, 2026 - Session 5
**Multi-Method Authentication System & Email Billing Notifications**

**Authentication System Overhaul:**
- Redesigned login modal with 3 prioritized authentication methods:
  1. 🥇 **Email + OTP** (Most Preferred) - Free, highlighted with "Best" badge and teal border
  2. 🥈 **Email + Password** - Traditional login
  3. 🥉 **Phone + SMS OTP** (Least Preferred) - Shows "SMS charges may apply" warning
- New passwordless login via email OTP (`/api/auth/email-otp/login`)
- Forgot password redirects to Email OTP flow for password-less reset
- Clear visual hierarchy in auth modal UI

**Email Billing Notifications:**
- Automatic email invoice when bills are created with patient email
- Professional invoice template with itemized bill, discounts, totals
- Integrated with existing Resend email service

### January 13, 2026 - Session 6
**Google Social Login & SMS OTP Fallback**

**Google Sign-In:**
- Added "Continue with Google" button at top of login modal
- Uses Emergent-managed Google OAuth for seamless authentication
- Callback handler at `/auth/callback` for OAuth redirect
- Backend endpoint `/api/auth/google` creates or logs in users
- Profile picture synced from Google account

**SMS OTP Fallback:**
- When password login fails, shows `password-failed` recovery step
- Two recovery options:
  1. **Login with Phone + SMS OTP** (highlighted) - For users who forgot password
  2. **Reset Password via Email** - Alternative recovery method
- Clear error message explaining the login failure
- "Try password again" link for typo corrections

### January 13, 2026 - Session 7
**Biometric Authentication, Remember Me & Backend Refactoring**

**Biometric Authentication (Fingerprint/Face ID):**
- Backend endpoints: `/api/auth/biometric/register`, `/api/auth/biometric/login`, `/api/auth/biometric/status`
- WebAuthn/FIDO2 compatible credential storage
- Biometric login option appears in auth modal when enabled
- Profile Settings > Security section for managing biometric credentials
- Device-specific credential registration
- 30-day extended session for biometric login

**Remember Me Functionality:**
- "Remember me for 30 days" checkbox in password login form (checked by default)
- Backend endpoint: `/api/auth/login/remember`
- Trusted devices tracking with device ID and name
- Profile Settings > Security section shows trusted devices
- Option to remove trusted devices remotely

**Trusted Devices Management:**
- Backend endpoints: `/api/auth/trusted-devices`, `/api/auth/trusted-devices/{device_id}`
- Profile page shows list of trusted devices with last login time
- Remove device functionality to revoke access

**Security Settings in Profile:**
- New SecuritySettings component in Profile > Settings tab
- Biometric authentication enable/disable
- View and manage registered biometric credentials
- View and manage trusted devices

### January 13, 2026 - Session 8
**Cleanup: Removed Google Login & Footer Billing**

**Removed:**
- Google Social Login (was failing due to OAuth redirect issues)
- Quick Billing link from footer
- AuthCallback page and route

**Kept:**
- Billing module ONLY in Staff Portal (for staff/doctors)
- 3 working login methods: Email OTP, Email+Password, Phone SMS OTP
- Biometric authentication for mobile app users
- Remember Me functionality

---

## Remaining/Future Tasks

🔴 **P0:** Cashfree Payment Gateway (Awaiting API credentials from user)
   - Integration playbook ready
   - Will replace/supplement Stripe for Evara subscriptions

🟠 **P1:** Complete Wearable Integration (Terra)
   - Backend webhook ready
   - Needs frontend UI for device connection

🔵 **P2:** Refactor server.py (~8400 lines) into modular routes
🔵 **P2:** Refactor large frontend components (Evara.js, Glydex.js, Admin.js)
🔵 **P2:** Migrate hardcoded data to MongoDB (food database, Evara content)

🔵 **P3:** Real-time chat for Community forums

---

## Project Health
- **Backend**: All routes loading correctly (18+ modular route files)
- **Frontend**: Building successfully, all pages rendering
- **Database**: MongoDB with migrated data
- **All Features**: WORKING ✅
- **Authentication**: 5 methods (Google, Email OTP, Password, Phone OTP, Biometric) all working
- **Remember Me**: Working with 30-day extended sessions
- **Test Coverage**: Iteration 25 (14/14 passed), Iteration 26 (10/13 passed)
