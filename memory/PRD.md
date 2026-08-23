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

## P2 Backlog (User Priority Order)
1. Claymorphism styling for light mode cards
2. Domain setup (nevikacura.com)
3. Railway production deployment
4. Push notifications for status updates

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
