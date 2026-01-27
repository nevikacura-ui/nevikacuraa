# Nevika Cura - Product Requirements Document

## Original Problem Statement
Build a comprehensive healthcare application named "Nevika Cura" to enhance staff and patient experience with features for appointment booking, pharmacy orders, diagnostic tests, women's wellness (Evara), diabetes care (Glydex), kids health (Alyne), and staff management.

## Core Architecture
- **Frontend:** React with Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **SMS:** Twilio (for transactional confirmations only)
- **Email:** Resend

## Doctors
- **Dr. Vikas Jha** - Diabetologist & Physician (Both Pushpa Clinic & Amnion Clinic)
- **Dr. Neha Patel** - OBGYN (Both Pushpa Clinic & Amnion Clinic)

---

## What's Been Implemented

### Session - January 27, 2026 (Current Session)

#### Loading/Splash Screen Flow ✅
- **Removed extra HTML splash screen** from index.html
- App now has exactly 2 screens:
  1. **Loading Screen** (white): Logo + "Book. Order. Test. Care." tagline (words fade in sequentially)
  2. **Splash Screen** (teal gradient): 3 icons with fading animation + Login button

#### Enhancement Features - Phase 1 Complete ✅
Built 13 enhancement features with full UI and backend APIs:

| # | Feature | Status | Component |
|---|---------|--------|-----------|
| 1 | Smart Appointment Reminders | ✅ | SmartReminders.jsx |
| 2 | Queue Position Tracker | ✅ | QueueTracker.jsx |
| 3 | Prescription Digital Wallet | ✅ | PrescriptionWallet.jsx |
| 4 | Family Health Hub | ✅ | FamilyHub.jsx |
| 5 | Health Score Gamification | ✅ | HealthScoreGamification.jsx |
| 6 | Voice Prescription (Doctors) | ✅ | VoicePrescription.jsx |
| 11 | Loyalty Points System | ✅ | LoyaltyPoints.jsx |
| 17 | Health Content Hub | ✅ | HealthContentHub.jsx |
| 19 | Symptom Checker | ✅ | SymptomChecker.jsx |
| 20 | Medication Interaction Checker | ✅ | MedicationInteractionChecker.jsx |
| 30 | Emergency SOS | ✅ | EmergencySOS.jsx |
| 38 | Dark Mode Toggle | ✅ | DarkMode.jsx |
| 49 | Multi-channel Notifications | ✅ | NotificationPreferences.jsx |

#### New Pages & Routes
- `/features` - Enhancement Features showcase page

#### Backend APIs Added
- `GET /api/patient/health-score` - Get health score and gamification data
- `POST /api/patient/health-score/checkin` - Daily health check-in
- `GET /api/patient/reminders` - Get patient reminders
- `POST /api/patient/reminders` - Add new reminder
- `POST /api/patient/emergency/sos` - Trigger emergency SOS
- `POST /api/patient/medications/check-interactions` - Check drug interactions
- `GET /api/patient/health-content` - Get health articles

#### Bug Fixes
- Fixed PyMongo Database truth value testing (`if db:` → `if db is not None:`)
- Fixed MongoDB ObjectId serialization in add_family_member response

#### Testing
- **21/21 backend API tests passed** (100%)
- **All frontend features verified** (100%)

---

## Enhancement Features - Remaining (34 features)

### Phase 2 - AI & Smart Features
- #7 Smart Schedule Optimizer
- #8 Predictive Health Insights
- #9 AI-Powered Appointment Suggestions
- #10 Automated Health Reports

### Phase 3 - Communication & Engagement
- #12-16 Communication features
- #18 Health Goals & Challenges
- #21-29 Advanced features

### Phase 4 - Administrative
- #31-37 Staff & Admin tools
- #39, #42-44, #48, #50, #52 Additional features

---

## Key Files

### Enhancement Components
- `/app/frontend/src/components/enhancements/` - All 13 components
- `/app/frontend/src/components/enhancements/index.js` - Exports all components

### Key Pages
- `/app/frontend/src/pages/EnhancementFeatures.jsx` - Features showcase
- `/app/frontend/src/pages/PatientPortal.js` - Updated with NEW badges

### Backend
- `/app/backend/routes/enhancements.py` - All enhancement APIs

### Splash/Loading
- `/app/frontend/src/components/LoadingScreen.jsx` - White loading with tagline
- `/app/frontend/src/components/SplashScreen.jsx` - Teal splash with icons

---

## Test Credentials
- **Patient:** Mobile: `9876543210` (OTP shown on screen)
- **Staff:** user: `staff_pushpa`, pass: `Nevika@2026C`
- **Doctor:** user: `doc_vikas`, pass: `Nevika@2026C`

---

## Mocked APIs
The following APIs return sample/mock data when DB data is unavailable:
- `/api/patient/health-score` - Mock health score data
- `/api/patient/reminders` - Sample reminders
- `/api/patient/health-content` - Hardcoded articles
- `/api/patient/loyalty` - Mock loyalty points

---

## Upcoming Tasks
1. Implement remaining 34 enhancement features
2. Integrate real Health Content CMS
3. Add medication database API for interaction checker
4. Refactor StaffPortal.js

---

Last Updated: January 27, 2026
