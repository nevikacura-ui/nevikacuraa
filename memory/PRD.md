# Nevika Cura — Product Requirements Document

## Original Problem Statement
Finalize the Nevika Cura Healthcare Platform for production. Build a robust, glitch-free, modular platform with highly polished premium UI for patient-facing elements. Features include unified booking, pharmacy, labs, CuraPay wallet, and multi-channel notifications.

## Architecture
```
/app
├── frontend/ (React + TailwindCSS + Shadcn/UI)
│   ├── src/pages/ (Home, DiaGyn, Pharmacy, Labs, Queue, etc.)
│   ├── src/components/ (BookingConfirmation, BottomNav, ServiceHeader, etc.)
│   ├── src/context/ (AuthContext, CartContext, ThemeLanguageContext)
│   └── src/pages/diagyn/ (data.js - clinic/doctor config)
├── backend/ (FastAPI + MongoDB via Motor)
│   ├── routes/ (sms_otp, booking_email, pharmacy_browse, etc.)
│   ├── services/ (msg91_sms_otp, email_templates, whatsapp_otp, etc.)
│   ├── utils/ (constants, auth_utils)
│   └── data/ (clinic_config)
└── memory/ (PRD.md, REPLICATION_PROMPT.md, test_credentials.md)
```

## What's Been Implemented

### Core Platform (Completed)
- Unified booking code system (DGO/DGC/MGO/ORO/DGW)
- Cashfree payments integration
- CuraPay digital wallet with rewards
- Queue management system
- Doctor/Staff portals (DiaGyn)
- Voice booking via WhatsApp chatbot

### Phase: Pharmacy & Labs (Completed)
- 740 rich medicines from 1mg with priority sorting
- 185 health products with images from Nutshell
- Mango Labs pricing from PDF extraction (335 tests)
- Pharmacy cart, checkout, order tracking

### Phase: Premium UI & Notifications (Completed)
- Boarding pass booking confirmation (dark theme)
- Resend email templates synced with dark confirmation cards
- OrderSummary.jsx for downloadable provisional invoices
- MSG91 WhatsApp notifications for appointments/orders

### Session: Aug 23, 2026 — Tasks Completed
1. **MSG91 SMS OTP (Flow API)** ✅
   - Rewrote from v5/otp to v5/flow endpoint
   - Self-generated OTP with SHA-256 hash in MongoDB
   - Rate limiting: 30s cooldown, 5/hour, 10/day per number
   - 5 max attempts per OTP with countdown
   - Audit logging in otp_audit collection
   - Files: services/msg91_sms_otp.py, routes/sms_otp.py

2. **Light Theme UI (Default)** ✅
   - ThemeLanguageContext defaults to light mode (isDarkMode: false)
   - IntroScreen, OnboardingTour updated to light backgrounds
   - BottomNav supports both light and dark themes
   - Comprehensive CSS overrides in App.css for light mode
   - All text contrast verified

3. **Club Pushpa & Amnion Clinics** ✅
   - Amnion Clinic completely removed from patient-facing UI
   - All doctor schedules merged into Pushpa Clinic
   - Updated: diagyn/data.js, clinic_config.py, constants.py, staffUtils.js
   - Updated: DoctorPortal, StaffPortal, QueuePage, Footer, voice_booking
   - Backend: doctor_profiles.py, msg91_whatsapp.py updated

4. **Remove Bottom Nav from Home Page** ✅
   - Added '/' and '/home' to HIDDEN_NAV_PATHS in BottomNav.jsx
   - Home page clean without bottom navigation

5. **Home Page Minimal Redesign** ✅
   - Removed clutter, added hero tracking card
   - Hero card shows active appointments, pharmacy orders, lab orders
   - Toggle: Home | My Portal | CuraOne added to home page
   - Quick Services: Consult, Pharmacy, Labs, Book
   - Quick Links: My Orders, Prescriptions, CuraPay, Profile

6. **Bottom Nav Simplified** ✅
   - Removed My Portal and CuraOne tabs from bottom nav
   - Kept: Home + My Cura + Book FAB
   - My Portal and CuraOne accessible via home page toggle

7. **Boarding Pass UI Refined** ✅
   - Removed Patient↔Doctor route labels
   - Replaced with centered logo for cleaner look
   - Removed routeLeftLabel/routeRightLabel from theme configs

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- Auto-send Order Summary via WhatsApp/MSG91 on order confirm
- Prescription refill reminders
- Family members management in patient portal

### P2 (Medium)
- Push notifications for status updates
- Resume 1mg image scraping (needs ZenRows API key)

### P3 (Future)
- Railway deployment (guide saved at /app/COMPLETE_RAILWAY_DEPLOYMENT_GUIDE.md)
- Custom domain setup (nevikacura.com)

## 3rd Party Integrations
- OpenAI GPT-4o (Emergent LLM Key)
- Cashfree (Payments - User API Key)
- MSG91 WhatsApp (Notifications - User API Key)
- MSG91 SMS OTP (Flow API - User API Key)
- Resend (Email - User API Key)
- ZenRows (Scraping - needs new key)

## Key Credentials
- MSG91 SMS: Auth Key `553382AT5mLk6q06a621a82P1`, Sender `NEVIKA`, Template `6a67114083eac80188062975`
- See /app/memory/test_credentials.md for test accounts

## Testing Status
- Testing agent iteration 383: 13/13 tests passed (100%)
- All features verified in both light and dark modes
- SMS OTP Flow API verified (send, verify, resend, rate limiting)
