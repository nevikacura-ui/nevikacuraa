# Nevika Cura Healthcare Application - PRD

## Original Problem Statement
Build a modern healthcare application for "Nevika Cura" with core services:
1. **DiaGyn Healthcare** - Appointment booking for doctors
2. **Proton Diagnostics** - Lab test booking
3. **Orange Pharmacy** - Medicine ordering with Loyalty Program
4. **Evara** - Women's Wellness & Care Program
5. **Glydex** - Diabetes Care Portal

---

## What's Been Implemented ✅

### Session 3 - January 13, 2026 (Final)

**1. Full Billing & Due Payments System** ✅
- Invoice creation with items, taxes, discounts
- Payment recording with multiple methods (cash, card, UPI, insurance)
- Due payments tracking and overdue marking
- Billing summary with revenue metrics
- Payment reminder notifications
- API: `/api/billing/invoices`, `/api/billing/due-payments`, `/api/billing/summary`

**2. Automated Reminders System** ✅
- Follow-up reminders after appointments
- Medicine refill reminders for Glydex users
- Subscription expiry alerts for Evara
- Custom reminder creation
- Cron job endpoint for processing due reminders
- API: `/api/reminders/create`, `/api/reminders/pending`, `/api/reminders/appointment-followup`

**3. Push Notifications Enhancement** ✅
- Appointment reminder notifications
- Subscription expiry notifications
- Medicine refill notifications
- Cron jobs for automated reminders
- API: `/api/notifications/appointment-reminder`, `/api/cron/appointment-reminders`

**4. Women's Health Community** ✅
- 7 categories: Pregnancy, Fertility, Menopause, PCOS, Nutrition, Mental Health, General
- Create posts with anonymous option
- Comments and likes
- Featured discussions
- API: `/api/community/categories`, `/api/community/posts`, `/api/community/featured`

**5. Data Migration to MongoDB** ✅
- 24 medicines migrated to `medicines_catalog`
- 23 diagnostic tests migrated to `diagnostic_tests_catalog`
- 65 food items migrated to `food_catalog`
- Proper indexes created

**6. Orange Pharmacy Loyalty Program** ✅ (NEW)
- **Three Tiers**: Bronze (any amount), Silver (₹500+), Gold (₹1000+)
- **Points System**: 1 point per ₹100, 2× on diagnostics, 20 bonus for refills
- **Gold 10-Visit Reward**: Extra discount + Free Health Checkup
- **FAQ**: 10 comprehensive questions and answers
- **Terms & Conditions**: 12 legal sections covering all aspects
- **Frontend**: Interactive banner and dialog with Overview/FAQ/Terms tabs
- API: `/api/pharmacy/loyalty/tiers`, `/api/pharmacy/loyalty/faq`, `/api/pharmacy/loyalty/terms-and-conditions`

### Session 2 - Earlier Today
- Indian Food Calorie Tracker (Glydex & Evara)
- User Profile Customization (Interests selection)
- Admin Analytics Dashboard
- Stripe Payment Integration for Evara Subscriptions

### Session 1 - Earlier
- Email OTP Authentication
- Staff SMS Notifications
- Enhanced Admin Cancellation
- Evara Educational Content
- PDF Report Sharing
- Capacitor Android App

---

## Orange Pharmacy Loyalty Program Details

### Tier Benefits
| Tier | Min Amount | Points | Medicine Discount | Delivery |
|------|------------|--------|-------------------|----------|
| Bronze | Any | 1pt/₹100 | 0% | Free on ₹500+ |
| Silver | ₹500+ | 1pt/₹100 | 5% | FREE |
| Gold | ₹1000+ | 1pt/₹100 | 10% | FREE |

### Special Features
- 2× points on all Diagnostic purchases
- 20 bonus points on medicine refills
- Gold 10-Visit Reward: Extra discount + Free Health Checkup worth ₹500
- Points expire after 12 months
- 100 points = ₹10 redemption value

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Capacitor
- **Backend**: FastAPI, Python, emergentintegrations
- **Database**: MongoDB (with migrated catalogs)
- **SMS**: Twilio
- **Email**: Resend
- **AI Chat**: Claude (via emergentintegrations)
- **Payments**: Stripe (via emergentintegrations)
- **Mobile**: Capacitor for Android

---

## Backend Routes Structure
```
/app/backend/
├── server.py (main routes)
├── routes/
│   ├── billing.py (Billing & Due Payments)
│   ├── reminders.py (Automated Reminders)
│   ├── community.py (Women's Health Community)
│   └── pharmacy_loyalty.py (Loyalty Program)
├── migrations/
│   └── migrate_data.py (Data migration script)
└── models/
```

---

## Test Credentials
- **Admin**: /admin, Password: `nevikacura2026`
- **Staff Doctor**: doc_neha / Nevika@2026D
- **Staff Clinic**: staff_pushpa / Nevika@2026C

---

## API Reference (New Endpoints)

### Billing
```
POST /api/billing/invoices - Create invoice
GET  /api/billing/invoices - List invoices
POST /api/billing/invoices/{id}/payment - Record payment
GET  /api/billing/due-payments - Get due payments
GET  /api/billing/summary - Billing summary
POST /api/billing/send-reminder/{id} - Send payment reminder
```

### Reminders
```
POST /api/reminders/create - Create reminder
GET  /api/reminders/list - List reminders
GET  /api/reminders/pending - Get today/tomorrow reminders
POST /api/reminders/medicine-refill - Create medicine refill reminder
POST /api/reminders/appointment-followup - Create follow-up reminder
POST /api/reminders/process-due - Process and send due reminders (cron)
```

### Community
```
GET  /api/community/categories - Get categories
GET  /api/community/featured - Get featured discussions
GET  /api/community/posts - List posts
POST /api/community/posts - Create post
POST /api/community/posts/{id}/like - Like post
POST /api/community/posts/{id}/comment - Add comment
```

### Pharmacy Loyalty
```
GET  /api/pharmacy/loyalty/tiers - Get tier info
GET  /api/pharmacy/loyalty/user-status - Get user status
POST /api/pharmacy/loyalty/record-transaction - Record loyalty transaction
POST /api/pharmacy/loyalty/claim-gold-reward - Claim 10-visit reward
GET  /api/pharmacy/loyalty/calculate-benefits - Calculate order benefits
GET  /api/pharmacy/loyalty/faq - Get FAQ
GET  /api/pharmacy/loyalty/terms-and-conditions - Get T&C
```

---

## Completed Tasks Summary

✅ Full Billing & Due Payments System
✅ Automated Follow-up Reminders
✅ Push Notifications Enhancement
✅ Women's Health Community Forums
✅ Medicine Refill Reminders for Glydex
✅ Data Migration to MongoDB
✅ Orange Pharmacy Loyalty Program with T&C

---

## Remaining/Future Tasks

🔵 **P2:** Refactor server.py (~8200 lines) into modular routes
🔵 **P2:** Refactor large frontend components (Evara.js, Glydex.js)
🔵 **P3:** Real-time chat for Community forums
🔵 **P3:** Payment gateway for billing invoices

---

## Project Health
- **Backend**: All routes loading correctly
- **Frontend**: Building successfully
- **Database**: MongoDB with migrated data
- **All Features**: WORKING ✅
