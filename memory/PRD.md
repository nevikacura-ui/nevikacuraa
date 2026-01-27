# Nevika Cura - Product Requirements Document

## Original Problem Statement
Build a comprehensive healthcare application named "Nevika Cura" to enhance staff and patient experience with features for appointment booking, pharmacy orders, diagnostic tests, women's wellness (Evara), diabetes care (Glydex), kids health (Alyne), and staff management.

## Core Architecture
- **Frontend:** React with Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **SMS:** Twilio (for transactional confirmations only, NOT for auth/login)
- **Email:** Resend

## Doctors
- **Dr. Vikas Jha** - Diabetologist & Physician (Both Pushpa Clinic & Amnion Clinic)
- **Dr. Neha Patel** - OBGYN (Both Pushpa Clinic & Amnion Clinic)

## What's Been Implemented

### Session - January 27, 2026 (Part 11 - Current)

#### Completed Features
1. **Removed Extra HTML Loading Screen** ✅
   - Removed the splash screen from index.html that showed logo + pill icon
   - App now has exactly 2 screens:
     - Loading Screen (white): Logo + "Book. Order. Test. Care." tagline
     - Splash Screen (teal gradient): 3 icons with animation + Login button

2. **Enhancement Components Integrated into Patient Portal** ✅
   - Added Family Hub section (NEW badge)
   - Added Prescription Wallet section (NEW badge)  
   - Added Notification Preferences section (NEW badge)
   - Enhanced Loyalty Points with tier system

### Session - January 27, 2026 (Part 10)

#### Completed Features
1. **Splash Screen Redesign** ✅
2. **Doctor Multi-Clinic Appointment Access** ✅
3. **Clinic Color-Coding in Doctor Portal** ✅
4. **Staff Real-time Notifications** ✅
5. **Enhancement Feature Scaffolding** - 16 placeholder components created

## Enhancement Features Status

### Implemented Components (Frontend + Backend APIs):
- #2 Queue Position Tracker
- #3 Prescription Digital Wallet
- #4 Family Health Hub
- #11 Loyalty Points System
- #17 Health Content Hub
- #19 Symptom Checker
- #30 Emergency SOS
- #38 Dark Mode Toggle
- #49 Multi-channel Notification Preferences
- #48 Payment Links

### Remaining Features (47 total requested):
- #1, #5-10, #12-16, #18, #20-29, #31-37, #39, #42-44, #50, #52

## Key Files
- `/app/frontend/src/components/SplashScreen.jsx` - Teal splash screen
- `/app/frontend/src/components/LoadingScreen.jsx` - White loading screen with tagline
- `/app/frontend/src/components/enhancements/` - All enhancement components
- `/app/backend/routes/enhancements.py` - Backend APIs for enhancements
- `/app/frontend/src/pages/PatientPortal.js` - Patient dashboard with new sections

## Test Credentials
- **Staff:** user: `staff_pushpa`, pass: `Nevika@2026C`
- **Doctor:** user: `doc_vikas`, pass: `Nevika@2026C`
- **Doctor:** user: `doc_neha`, pass: `Nevika@2026C`
- **Patient:** Mobile: `9876543210` (OTP shown on screen)

## Upcoming Tasks
1. Implement full logic for remaining 38 enhancement features
2. Refactor StaffPortal.js (file too large)
3. HealthKit/Google Fit integration
4. Apple Sign-In

Last Updated: January 27, 2026
