# Nevika Cura — Product Requirements Document

## Original Problem Statement
Finalize the Nevika Cura Healthcare Platform for production. Build a robust, glitch-free, modular platform with polished premium UI for patient-facing elements. Features include unified booking, pharmacy, labs, CuraPay wallet, and multi-channel notifications.

## Architecture
```
/app
├── frontend/ (React + TailwindCSS + Shadcn/UI)
│   ├── src/pages/ (Home, DiaGyn, Pharmacy, Labs, MyOrders, PaymentSuccess)
│   ├── src/components/ (ServiceHeader [theme toggle], OrderTimeline, IntroScreen [SMS OTP only])
│   ├── src/context/ (AuthContext, CartContext, ThemeLanguageContext)
│   └── src/pages/diagyn/ (data.js - Pushpa only)
├── backend/ (FastAPI + MongoDB via Motor)
│   ├── routes/ (sms_otp, order_notifications, inventory [my-orders], cashfree)
│   ├── services/ (msg91_sms_otp, msg91_whatsapp, email_templates)
│   └── utils/ (constants, auth_utils)
├── railway.toml (Railway deploy — healthcheck /api/health)
├── nixpacks.toml (Build phases — emergentintegrations extra-index-url)
└── memory/ (PRD.md, test_credentials.md)
```

## What's Been Implemented (Latest Session — Aug 23, 2026)

1. **SPA Fallback Routing Fix** — Wildcard skips `/api/` paths. JSON 404 for unmatched APIs.
2. **Theme Toggle in Header** — Sun/Moon replaces wallet icon. Both light/dark modes.
3. **Order Tracking Wired** — Home hero card + My Orders use `/api/orders/my-orders`.
4. **SMS OTP Only** — Removed Email + OTP, Email + Password. All "WhatsApp OTP" → "SMS OTP".
5. **Railway Deploy Ready** — `railway.toml`, `nixpacks.toml`, static file serving.
6. **Order Timeline** — Step-by-step progress on each order card (Pharmacy: Placed→Confirmed→Processing→Shipped→Delivered; Labs: Booked→Confirmed→Collected→Processing→Report).
7. **BottomNav Removed** — Returns null, clean UI across all pages.
8. **MyOrders Theme-Aware** — Full dark/light mode support with proper contrast.

## Auth Flow
- Patients: SMS OTP only
- Doctors: dr_vikas/test1234, dr_neha/test1234
- Staff: staff_diagyn/test1234, staff_mango/test1234, staff_orange/test1234

## Prioritized Backlog
### P1 (High)
- Push notifications for status updates
- Resume 1mg image scraping (needs ZenRows API key)
- Claymorphism styling for light mode cards

### P2 (Medium)
- Railway production deployment execution
- Custom domain setup (nevikacura.com)

## 3rd Party Integrations
- OpenAI GPT-4o (Emergent LLM Key)
- Cashfree (Payments), MSG91 WhatsApp, MSG91 SMS OTP, Resend (Email)

## Testing Status
- Iteration 389: 100% pass — Order Timeline, BottomNav removal, MyOrders theme, backend health
