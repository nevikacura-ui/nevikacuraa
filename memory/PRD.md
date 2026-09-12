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
- Database: `medicines` collection (1246 docs) + `pharmacy_inventory` (1246 docs mirrored) — replaced Sep 2026

## Session Update (Sep 2026)
- Replaced Orange Pharmacy inventory using `Stock_Summary_Report_24-08-2026.pdf` (1316 raw rows).
  Applied: exclude 32 items (injectables/IV/consultation/delivery charges), collapse 14 pack-size-variant
  groups to 1 item each (largest pack price kept), merge 8 typo/near-duplicate pairs. Final: 1246 items
  across 28 categories. Script: `/app/backend/scripts/import_orange_pdf_inventory.py`. PDF stored at
  `/app/backend/data/imports/orange_pharmacy_stock_24-08-2026.pdf`.
- Premium text-only card variant added in `MedicineCard.jsx` (activates when `!image_url`): cream card,
  name, price, "Price shown is after 15-20% discount" label, no images/icons. Fixed a cropping bug where
  the ADD button (absolute positioned) overlapped the discount note text — moved to normal flex flow.
- Removed "Orange Select" (curated 1584-item legacy dataset) tab + promo section from `/pharmacy` page
  per user request — only the new 1246-item import shows now.
- Fixed bug: doctor blocking a leave day/session (Doctor Portal) didn't stop `/api/doctors/next-available`
  from suggesting slots on that blocked day (never checked `doctor_schedules.blocked_dates`). Added shared
  `get_doctor_schedule_by_name()` helper in `appointment_routes.py`, new public
  `GET /api/doctors/blocked-dates?doctor=<name>` endpoint, wired into `DoctorDetailModal.jsx` to grey out
  blocked calendar days for patients.
- Note: `pharmacy_browse.py` has a 5-min in-memory cache; restart backend after bulk inventory changes.

## Session Update (Sep 8, 2026)
- Added "Leave" badge on the reschedule date-picker (`MyAppointmentsPage.jsx` → `RescheduleModal`):
  fetches `GET /api/doctors/blocked-dates?doctor=<name>` on open; fully-blocked dates get a red
  "Leave" badge + are disabled/strikethrough; partial-day blocked sessions show a red notice banner
  and grey out the affected time slots. Verified end-to-end via screenshot with seeded test data
  (full-day leave + partial morning-session leave), then cleaned up test data.

## Session Update (Sep 12, 2026) - ROOT CAUSE FIX for recurring "blocked slots still bookable" bug
- Root cause found: DoctorDetailModal.jsx (the MAIN patient booking flow on /diagyn) only greyed out
  full-day `blocked_dates` on the calendar, but never filtered `blocked_sessions` (partial-day leave,
  e.g. 11:00-14:00) out of the displayed time-slot list. Backend rejection existed, but patients could
  still SEE and tap a session-blocked slot, only getting an error at submit. Fixed `fetchSlots()` in
  DoctorDetailModal.jsx to fetch blocked_sessions and exclude any slot inside a blocked window.
  Verified via screenshot + testing_agent (iteration_401, PASS): blocked evening slots correctly
  disappear from the slot list; unaffected slots still show.
- Deleted `frontend/src/pages/Teleconsultation.js` - confirmed orphaned/unrouted dead file (not used
  by App.js; real teleconsult flow goes through DoctorDetailModal's Video Consultation toggle, which
  already inherits the blocked_sessions fix).
- Note for user: if this recurs again, check whether a NEW alternate booking UI component was added
  that duplicates slot-generation logic without importing the blocked_sessions filter.

## Session Update (Sep 12, 2026, cont'd) - Booking Audit Log + Staff Blocking + Order Push Alerts
- New `backend/routes/diagyn_staff/schedule.py`: staff (any role) can block/unblock full-day leave or
  partial time windows for any doctor via new /api/diagyn-staff/schedule/* endpoints. Conflict-detection
  flow: if existing appointments fall in the range, returns a conflict payload; force_override cancels
  those appointments + sends WhatsApp cancellation notice, then applies the block.
- `assert_slot_not_blocked()` (appointment_routes.py) now logs every rejected booking attempt to
  `db.blocked_slot_attempts` (doctor, date, time, block_type, reason, source, patient info, timestamp).
  Wired into all booking endpoints with a per-endpoint `source` tag (standard_booking, guest_booking,
  reschedule, follow_up, chatbot, walk_in, voice_command, teleconsultation).
- New Staff Portal "Schedule" tab (`frontend/src/pages/diagyn/StaffScheduleView.jsx`) with two sub-tabs:
  Block Dates/Slots (form + list + conflict warning UI) and Audit Log (rejected attempts feed). Visible
  to all DiaGyn staff.
- Order Status push notifications: extracted `send_fcm_notification()` as a reusable helper in
  `routes/fcm.py`; wired into pharmacy/diagnostic order status update endpoints (`payment_links.py`) -
  fires only when the order has a real (non-guest-synthetic) `patient_email`, per user's explicit choice
  to support logged-in patients only. Fixed `PushNotificationManager.jsx` (on /settings) to actually pass
  `user.email` into `usePushNotifications()` - previously it registered FCM tokens with `user_email: null`,
  so push could never be targeted to a specific patient.
- Tested via testing_agent (iteration_402, 17/17 backend pytest passed) + manual screenshots. Fixed 2
  issues found: (1) walk-in booking 500 on duplicate slot -> now clean 409, (2) StaffScheduleView FAB
  button visually overlapping the blocked-session unblock (X) button on mobile -> added bottom padding.

## Pending/Backlog
- Push notifications for status updates (P2 backlog).
- Light Mode: DISABLED APP-WIDE (Sep 2026) per user request — styling wasn't fixed, user asked to stop spending credits on it. `ThemeLanguageContext.jsx` now hardcodes `isDarkMode=true`, toggle button removed from `ServiceHeader.jsx`. Do NOT re-introduce light mode toggle unless explicitly asked.
