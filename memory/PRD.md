# Nevika Cura — Product Requirements Document

## Original Problem Statement
Finalize the Nevika Cura Healthcare Platform for production. Build a robust, glitch-free, modular platform with highly polished premium UI for patient-facing elements. Features include unified booking, pharmacy, labs, CuraPay wallet, and multi-channel notifications.

## Architecture
```
/app
├── frontend/ (React + TailwindCSS + Shadcn/UI)
│   ├── src/pages/ (Home, DiaGyn, Pharmacy, Labs, MyOrders, PaymentSuccess, etc.)
│   ├── src/components/ (ServiceHeader [theme toggle], BottomNav, FamilyMemberPicker, etc.)
│   ├── src/context/ (AuthContext, CartContext, ThemeLanguageContext)
│   └── src/pages/diagyn/ (data.js - clinic/doctor config)
├── backend/ (FastAPI + MongoDB via Motor)
│   ├── routes/ (sms_otp, order_notifications, inventory [my-orders], cashfree, etc.)
│   ├── services/ (msg91_sms_otp, msg91_whatsapp, email_templates, etc.)
│   ├── utils/ (constants, auth_utils)
│   └── data/ (clinic_config)
├── railway.toml (Railway deployment config)
├── nixpacks.toml (Build phases for Railway)
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
- OrderSummary.jsx for downloadable provisional invoices
- MSG91 WhatsApp notifications for appointments/orders
- MSG91 SMS OTP via Flow API (self-generated, hashed, rate-limited)

### Session: Aug 23, 2026 — All Tasks Completed

#### Bug Fixes & Enhancements
1. **SPA Fallback Routing Fix** — Fixed wildcard `/{full_path:path}` intercepting /api/ routes. Returns JSON 404 for unmatched API paths, serves React index.html for non-API routes.
2. **Theme Toggle in Header** — Replaced CuraPay wallet icon with Sun/Moon toggle button. Uses ThemeLanguageContext.
3. **Order Tracking Wired to Home + My Orders** — Home page hero tracking card now fetches from patient-facing `/api/orders/my-orders` (was incorrectly using staff-only endpoints). Shows active pharmacy + lab orders. Draft/delivered orders filtered out.
4. **PaymentSuccess Enhanced** — Added "View My Orders" button alongside "Go Home" and "View Booking Pass" after Cashfree payment confirmation.
5. **Railway Deployment Ready** — `railway.toml`, `nixpacks.toml` (with emergentintegrations extra-index-url), static file mounting in server.py for single-service deployment.

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
- Iteration 385: 100% pass — SPA Fallback + Theme Toggle
- Iteration 386: 100% pass (11/11 backend, all frontend) — Order tracking, My Orders, PaymentSuccess wiring
