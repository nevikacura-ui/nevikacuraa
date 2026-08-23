# Nevika Cura — Product Requirements Document

## Original Problem Statement
Finalize the Nevika Cura Healthcare Platform for production. Build a robust, glitch-free, modular platform with highly polished premium UI for patient-facing elements. Features include unified booking, pharmacy, labs, CuraPay wallet, and multi-channel notifications.

## Architecture
```
/app
├── frontend/ (React + TailwindCSS + Shadcn/UI)
│   ├── src/pages/ (Home, DiaGyn, Pharmacy, Labs, Queue, etc.)
│   ├── src/components/ (ServiceHeader [theme toggle], BottomNav, FamilyMemberPicker, etc.)
│   ├── src/context/ (AuthContext, CartContext, ThemeLanguageContext)
│   └── src/pages/diagyn/ (data.js - clinic/doctor config)
├── backend/ (FastAPI + MongoDB via Motor)
│   ├── routes/ (sms_otp, order_notifications, pharmacy_browse, medicine_reminders, health_records, etc.)
│   ├── services/ (msg91_sms_otp, msg91_whatsapp, email_templates, etc.)
│   ├── utils/ (constants, auth_utils)
│   └── data/ (clinic_config)
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

#### Batch 1: UI & Config
1. **MSG91 SMS OTP (Flow API)** — v5/flow endpoint, SHA-256 hashed OTP in MongoDB, rate limiting, audit logging
2. **Light Theme UI (Default)** — IntroScreen, OnboardingTour, Home, BottomNav all light-themed
3. **Clubbed Pushpa & Amnion Clinics** — Amnion hidden everywhere (15+ files updated)
4. **Remove Bottom Nav from Home** — Home page clean without bottom nav
5. **Home Page Minimal Redesign** — Hero tracking card, toggle for My Portal/CuraOne
6. **Bottom Nav Simplified** — Only Home + My Cura + Book FAB
7. **Boarding Pass Refined** — Removed Doctor-PC labels, centered logo

#### Batch 2: Features
8. **Order Notifications (WhatsApp)** — Auto-send WhatsApp on pharmacy/lab status changes
9. **Family Members Management** — Max 5 per patient, CRUD via /api/health-records/family/{phone}
10. **Refill Reminders (WhatsApp)** — When medicine stock <=5, WhatsApp alert sent automatically

#### Bug Fixes & Enhancements (Aug 23, 2026 — Latest)
11. **SPA Fallback Routing Fix** — Fixed wildcard `/{full_path:path}` intercepting /api/ routes. Now returns JSON 404 for unmatched API paths, serves React index.html for non-API routes only.
12. **Theme Toggle in Header** — Replaced CuraPay wallet icon with Sun/Moon theme toggle button. Uses ThemeLanguageContext. Toggles between light and dark mode across the entire app.

## Prioritized Backlog

### P1 (High)
- Push notifications for status updates
- Resume 1mg image scraping (needs ZenRows API key)

### P2 (Medium)
- Railway deployment (guide at /app/COMPLETE_RAILWAY_DEPLOYMENT_GUIDE.md)
- Custom domain setup (nevikacura.com)

## 3rd Party Integrations
- OpenAI GPT-4o (Emergent LLM Key)
- Cashfree (Payments)
- MSG91 WhatsApp (Notifications)
- MSG91 SMS OTP (Flow API)
- Resend (Email)
- ZenRows (Scraping - needs new key)

## Testing Status
- Iteration 383: 13/13 tests passed (UI + API)
- Iteration 384: 21/21 tests passed (Order Notifications + Family Members + Refill Reminders)
- Iteration 385: 100% pass — SPA Fallback API Guard (7/7 backend) + Theme Toggle (all UI verified)
