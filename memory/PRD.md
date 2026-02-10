# Nevika Cura Healthcare Platform - PRD

## Original Problem Statement
A comprehensive healthcare application for Nevika Cura Healthcare Group with patient and staff management capabilities. The user requested a complete overhaul of the patient login/signup system to use Email/WhatsApp OTP flows, followed by engagement and UI improvements.

## Latest Request (Resolved)
**Issue:** Unified staff login page incorrectly redirects all users to doctor portal regardless of their actual role.
**Solution:** Split the unified login into 3 separate portal login pages (Staff, Doctor, Admin) as requested by the user.

---

## What's Been Implemented

### Authentication System
- **Patient Authentication (OTP-based):**
  - Email OTP login/signup via Resend API
  - WhatsApp OTP login/signup via MSG91
  - Password-based login for returning users
  - Located: `/app/frontend/src/pages/PatientLogin.jsx`, `/app/backend/routes/patient_auth.py`

- **Staff Authentication (Separate Portals) - NEW:**
  - **Staff Portal Login** (`/staff-portal-login`) - Teal themed, for DiaGyn clinic staff
  - **Doctor Portal Login** (`/doctor-login`) - Blue themed, for physicians
  - **Admin Portal Login** (`/admin-login`) - Purple themed, for administrators
  - **Portal Selector** (`/staff`) - Shows all portal options for easy navigation
  - Located: `/app/frontend/src/pages/StaffPortalLogin.jsx`, `/app/frontend/src/pages/DoctorPortalLogin.jsx`, `/app/frontend/src/pages/AdminPortalLogin.jsx`

### Homepage & Navigation
- Admin Portal link added to homepage footer (purple/violet styling)
- Staff Portal and Doctor Portal links added to Patient Login page
- Portal selector page with quick links to Pharmacy Staff and Lab Staff portals

### Other Features Implemented
- Mango Labs Package Builder modal
- Prescription OCR using Gemini Vision
- Splash screen image update
- Gamification widget (UI only)
- Personalized Actions (UI only)
- "Usually Bought Together" (UI placeholder)
- Wait Time Estimates (UI placeholder)

### New Portals Added (Feb 2026)
- **Reneu** - Inside Out Wellness with 5 sub-sections (Core, Skin, Hair, Women, Men)
- **InnerScore** - AI-powered Health Intelligence Portal with BioAge, Risk, Sleep, Metabolic, Inflammation engines
- **LifeAlign** - Cultural & Community Health Sync Engine:
  - Multi-religion support (Hindu, Muslim + expandable)
  - Community sub-groups (Ismaili, Sunni, Shia, Brahmin, Gujarati, etc.)
  - India/Abroad toggle with timezone detection
  - Dynamic festival calendars (Ramadan, Navratri, Mahashivratri, Eid, Diwali, etc.)
  - Health logic rules engine for risk alerts during fasting periods
  - Health Readiness Score based on chronic conditions
  - Lab test recommendations and medication timing adjustments
  - Scalable database schema for future religions/communities

---

## Current Routes

### Patient Routes
- `/` - Homepage
- `/login` - Patient Login/Signup (OTP-based)
- `/profile` - Patient Profile

### Staff Routes
- `/staff` - Portal Selector (shows all options)
- `/staff-portal-login` - Staff Login (→ /diagyn-staff)
- `/doctor-login` - Doctor Login (→ /doctor-portal)
- `/admin-login` - Admin Login (→ /admin)
- `/diagyn-staff` - DiaGyn Staff Portal
- `/doctor-portal` - Doctor Portal
- `/admin` - Admin Panel
- `/orange-staff` - Pharmacy Staff Portal
- `/mango-staff` - Lab Staff Portal

---

## Pending/Backlog Tasks (P1)

### Backend Implementation Required
1. **Orange Pharmacy Subscriptions** - Backend flow for chronic medicine subscriptions
2. **"Usually Bought Together"** - Recommendation engine for products
3. **DiaGyn Wait Time Estimates** - Real-time queue estimation
4. **Gamification Engine** - Health streaks, badges, referral tracking
5. **Complete OCR-to-Cart Flow** - Add extracted medicines from prescription directly to cart

### Other Pending
6. Move through DiaGyn staff portal functionality testing
7. Full integration testing of patient auth system

---

## Tech Stack
- **Frontend:** React, React Router, Axios, Tailwind CSS, Shadcn UI
- **Backend:** Python (FastAPI)
- **Database:** MongoDB
- **Authentication:** JWT (separate tokens for staff/patients)
- **AI Integration:** Google Gemini Vision (prescription OCR)
- **OTP Services:** Resend (Email), MSG91 (WhatsApp)

---

## Key Files Reference

### Authentication
- `/app/frontend/src/pages/PatientLogin.jsx`
- `/app/frontend/src/pages/StaffPortalLogin.jsx`
- `/app/frontend/src/pages/DoctorPortalLogin.jsx`
- `/app/frontend/src/pages/AdminPortalLogin.jsx`
- `/app/frontend/src/pages/UnifiedStaffLogin.js` (Portal Selector)
- `/app/backend/routes/patient_auth.py`
- `/app/backend/routes/staff.py`

### Context
- `/app/frontend/src/context/AuthContext.jsx`

### Navigation
- `/app/frontend/src/App.js`
- `/app/frontend/src/components/Footer.jsx`

---

## Date: February 10, 2026

### Latest Updates:
1. **Shadow removed** from portal scroll bar - Clean flat background
2. **Guest login now OTP-based** - Requires WhatsApp number + OTP verification before accessing app
3. **Reneu Portal Redesigned** - "Inside Out Wellness" with 5 sub-sections
4. **INNERSCORE - Health Intelligence Portal** - Premium AI-driven health scoring system with new cyan logo
   - Added to scrollable portal header (replaced Reports/Health Log icons)
   - Added to homepage service cards grid (5x2 layout, below Senova & Reneu)
   - Logo: Cyan/turquoise "Inner Score" branding
   - Dark navy background (#0f172a)

### Last Updated: INNERSCORE Health Intelligence Portal complete
