# Nevika Cura — Product Requirements Document

## Original Problem Statement
Build a production-ready healthcare super-app (Nevika Cura) with:
- DiaGyn Healthcare (Consult): Doctor booking with SMS OTP auth
- Orange Pharmacy: Medicine ordering with 1300+ inventory
- Mango Health Labs: Lab test booking
- CuraPay Wallet, CuraBonus rewards, Family management
- Staff & Doctor portals with appointment management
- WhatsApp notifications via MSG91
- Cashfree payment integration

## Core Architecture
- Frontend: React + Tailwind + Shadcn/UI
- Backend: FastAPI + MongoDB (Motor async)
- Auth: SMS OTP via MSG91
- Payments: Cashfree (pending user API key)
- Notifications: MSG91 WhatsApp templates
- AI: OpenAI GPT-4o via Emergent LLM Key

## What's Been Implemented

### Completed Features
- Full SMS OTP authentication flow
- DiaGyn booking with calendar, slot selection, patient info
- Doctor/Staff portals (forced light mode)
- Appointment cancellation with WhatsApp notifications (user + staff)
- Slot time on staff appointment cards
- Patient name input bug fix
- Orange Pharmacy inventory: 1165 medicines imported (559 XLSX + 606 CSV, 17.5% discount, inj/consultation filtered)
- Auto-categorized into 19 categories (Tablets & Capsules, Skin Care, etc.)

### Light Mode UI Fixes (Aug 2026)
- Added `.dark-page` CSS system: dark-background pages preserve white text in light mode
- DiaGyn ad banner + logo: hidden in light mode, visible in dark mode
- Pharmacy ad banner: hidden in light mode, visible in dark mode
- FooterBadge: theme-aware text contrast
- Footer: `dark-page` class for proper text visibility
- Applied `dark-page` to 25+ pages: CartPage, Pharmacy, Mango, Profile, AboutUs, CuraBonus, CuraXCoins, FamilyWallet, FamilyMembers, MyFavorites, Nutricare, PatientProfile, SavedAddresses, TrackOrder, PaymentMethods, MedicineScanner, EmergencyHealthCard, ExpressRxTracker, HealthTimeline, MyAppointmentsPage, PaymentHistoryDashboard, PostVisitPipeline, HandoffNotes, PatientLogin, PharmacyCheckout, MangoCheckout, CuraWallet
- Background override CSS exempts `.dark-page` containers from light-mode bg changes

### Railway Deployment Readiness Fixes (Aug 26, 2026)
- FIXED BLOCKER: dead/orphaned code after `run_medicine_reminder_scheduler`'s while-loop was hard-deleting `appointments`/`pharmacy_orders`/`diagnostic_orders` on task cancellation (server restarts). Only prevented by a `NameError` bug (never actually fired in this env, but would have on any code fix). Removed entirely.
- Rewrote `run_automated_cleanup()` (24h scheduler) to properly soft-delete via `is_archived` flag (`update_many`) instead of copy-then-delete. No data is ever hard-deleted now.
- Fixed duplicate `CORS_ORIGINS` key in `backend/.env` (second entry was silently overriding `*`). Verified via curl: `access-control-allow-origin: *`.
- Fixed missing `services.push.set_db(db)` call in `startup_db_client()` — push notifications (medicine/smart reminders) were silently failing with "Database not initialized". Confirmed fixed via logs.
- Removed hardcoded preview URLs/secrets from `backend/scheduler.py` (no more URL fallback) and `backend/cron_reminders.sh` (now requires `API_URL`, `CRON_SECRET`, `MEDICINE_CRON_SECRET`, `ADMIN_TOKEN` as env vars, errors if missing). Neither script is wired into supervisor (manual/cron use only).
- Final deployment_agent scan: **PASS** (no blockers). Remaining non-blocking item: Resend sender domain `nevikacura.com` is not verified on resend.com/domains — admin report emails fail until verified (external, not code).
- `/app/COMPLETE_RAILWAY_DEPLOYMENT_GUIDE.md` remains the step-by-step guide. Per Emergent support: no direct Railway integration exists — user must use "Save to Github" to export code, then configure MongoDB Atlas + env vars + custom domain DNS entirely on Railway's side.

## P2 Backlog (User Priority Order)
1. Claymorphism styling for light mode cards — verification still pending (blocked on prior ask_human, not yet re-approved)
2. Domain setup (nevikacura.com) + Railway deployment — code is deployment-ready; remaining steps are user-side (GitHub export, Railway/MongoDB Atlas setup, DNS, Resend domain verification)
3. Push notifications for status updates

## 3rd Party Integrations
- OpenAI GPT-4o (Emergent LLM Key)
- Cashfree Payments (pending user API key)
- MSG91 WhatsApp Notifications (user API key configured)
- MSG91 SMS Flow API (user API key configured)

## Technical Notes
- Theme toggle: Moon icon = light mode, Sun icon = dark mode
- `dark-page` class on root container opts page out of light-mode text overrides
- CSS specificity: `.App .dark-page .text-white` (0-3-1) beats `.App .text-white` (0-2-1)
- Database: `medicines` collection (1165 docs) + `pharmacy_inventory` (1165 docs mirrored)
