# Nevika Cura — Product Requirements Document

## Original Problem Statement
Finalize the Nevika Cura Healthcare Platform for production. Build a robust, glitch-free, modular platform with highly polished premium UI for patient-facing elements. Features include unified booking, pharmacy, labs, CuraPay wallet, and multi-channel notifications.

## Architecture
```
/app
├── frontend/ (React + TailwindCSS + Shadcn/UI)
│   ├── src/pages/ (Home, DiaGyn, Pharmacy, Labs, MyOrders, PaymentSuccess, etc.)
│   ├── src/components/ (ServiceHeader [theme toggle], BottomNav, IntroScreen [SMS OTP only], etc.)
│   ├── src/context/ (AuthContext, CartContext, ThemeLanguageContext)
│   └── src/pages/diagyn/ (data.js - Pushpa only, no Amnion)
├── backend/ (FastAPI + MongoDB via Motor)
│   ├── routes/ (sms_otp, order_notifications, inventory [my-orders], cashfree, etc.)
│   ├── services/ (msg91_sms_otp, msg91_whatsapp, email_templates, etc.)
│   ├── utils/ (constants, auth_utils)
│   └── data/ (clinic_config)
├── railway.toml (Railway deployment config — healthcheck /api/health)
├── nixpacks.toml (Build phases — emergentintegrations extra-index-url)
└── memory/ (PRD.md, test_credentials.md)
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
- Boarding pass booking confirmation (minimal, refined)
- Resend email templates synced with confirmation cards
- MSG91 WhatsApp notifications for appointments/orders
- MSG91 SMS OTP via Flow API (self-generated, hashed, rate-limited)

### Latest Session: Aug 23, 2026

1. **SPA Fallback Routing Fix** — Wildcard `/{full_path:path}` now skips `/api/` paths. JSON 404 for unmatched APIs, HTML for React routes.
2. **Theme Toggle in Header** — Sun/Moon button replaces wallet icon. Works in both light and dark mode.
3. **Order Tracking Wired** — Home hero card + My Orders page use `/api/orders/my-orders` (patient-facing). PaymentSuccess has "View My Orders" button.
4. **SMS OTP Only** — Removed Email + OTP, Email + Password login options. Only SMS OTP for patients. All "WhatsApp OTP" text → "SMS OTP".
5. **Railway Deploy Ready** — `railway.toml`, `nixpacks.toml`, static file mounting in server.py.
6. **Amnion Clinic Removed** — Only Pushpa Clinic in data.js (confirmed in earlier session).

## Auth Flow
- Patients: SMS OTP only (IntroScreen + AuthModal)
- Doctors: dr_vikas/test1234, dr_neha/test1234
- Staff: staff_diagyn/test1234, staff_mango/test1234, staff_orange/test1234

## Prioritized Backlog

### P1 (High)
- Push notifications for status updates
- Resume 1mg image scraping (needs ZenRows API key)

### P2 (Medium)
- Railway production deployment execution
- Custom domain setup (nevikacura.com)

## 3rd Party Integrations
- OpenAI GPT-4o (Emergent LLM Key)
- Cashfree (Payments)
- MSG91 WhatsApp (Notifications)
- MSG91 SMS OTP (Flow API)
- Resend (Email)
- ZenRows (Scraping - needs new key)

## Testing Status
- Iteration 385: SPA Fallback + Theme Toggle — 100% pass
- Iteration 386: Order tracking wiring — 100% pass (11/11 backend, all frontend)
- Iteration 387: SMS OTP text changes — tested
- Iteration 388: Email auth removal — 100% pass
