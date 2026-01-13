# Nevika Cura Healthcare Application - PRD

## Original Problem Statement
Build a modern healthcare application for "Nevika Cura" with core services:
1. **DiaGyn Healthcare** - Appointment booking for doctors
2. **Proton Diagnostics** - Lab test booking
3. **Orange Pharmacy** - Medicine ordering
4. **Evara** - Women's Wellness & Care Program
5. **Glydex** - Diabetes Care Portal

---

## Authentication System

### Email-First Auth Flow (Cost-Saving)
| Step | Method | Cost |
|------|--------|------|
| **Signup** | Email OTP (Resend) | FREE |
| **Login** | Password | FREE |
| **Password Reset** | SMS OTP (Twilio) | Paid |
| **Appointments** | SMS OTP for verification | Paid |

### Profile Customization
After registration, users can select interests:
- Evara (Women's Wellness)
- Glydex (Diabetes Care)
- DiaGyn Healthcare
- Proton Diagnostics
- Orange Pharmacy

### Endpoints
- `POST /api/auth/email-otp/send` - Send email OTP for signup
- `POST /api/auth/email-otp/verify` - Verify email OTP
- `POST /api/auth/login` - Password login
- `PUT /api/user/preferences` - Update user interests
- `GET /api/user/preferences` - Get user preferences

---

## Staff SMS Notification Numbers
| Service | Staff Numbers | Purpose |
|---------|---------------|---------|
| DiaGyn Healthcare | 8108500522, 8108500533 | New appointments |
| Proton Diagnostics | 7039040040 | New test bookings |
| Orange Pharmacy | 8108500511 | New medicine orders |
| Nevika/Evara/Glydex | 9833188288 | Signups & general |
| Email | nevikacura@gmail.com | Order updates, reports |

---

## Fee Codes
| Code | Label | Amount |
|------|-------|--------|
| G1 | General - First | ₹150 |
| G2 | General - Follow up | ₹100 |
| S1 | Speciality - First | ₹300 |
| S2 | Speciality - Follow up | ₹200 |
| D1 | Diabetes - First | ₹500 |
| D2 | Diabetes - Follow up | ₹400 |
| D3 | Diabetes - Follow up | ₹300 |
| O1 | OBGY - First | ₹500 |
| O2 | OBGY - Follow up | ₹400 |
| O3 | OBGY - Follow up | ₹300 |
| **N1** | No Fees | ₹0 |
| **E1** | Emergency | ₹600 |

---

## What's Been Implemented ✅

### January 13, 2026 - Session 2

**1. Indian Food Calorie Tracker** ✅
- 100+ Indian foods with calories, protein, carbs, fat, fiber
- Categories: Breakfast, Lunch/Dinner, Snacks, Beverages, Sweets, Diabetic-Friendly
- Search functionality and category browsing
- Daily food logging with totals
- Implemented in both **Glydex** and **Evara** modules
- API: `/api/calories/food-database`, `/api/calories/search`, `/api/calories/log`

**2. User Profile Customization** ✅
- Interest selection after registration
- Services: Evara, Glydex, DiaGyn, Proton, Pharmacy
- Stored in user profile for personalization

**3. Admin Analytics Dashboard** ✅
- Total Revenue, Appointments, Diagnostics, Pharmacy Orders
- Daily Revenue Trend chart
- Daily Appointments chart
- Appointments by Doctor breakdown
- Configurable time range (7/14/30 days)
- Tab layout: 2 rows x 4 columns for better aesthetics

**4. Stripe Payment Integration for Evara Subscriptions** ✅
- Subscription plans: Monthly (₹299), Quarterly (₹799), Yearly (₹2,999)
- Secure checkout via Stripe
- Automatic subscription activation after payment
- User subscription status tracking
- API: `/api/evara/subscription/plans`, `/api/evara/subscription/checkout`

### January 13, 2026 - Session 1

**1. Email OTP for Signup (FREE)** ✅
**2. Password Login** ✅
**3. Staff SMS Notifications** ✅
**4. Enhanced Admin Cancellation** ✅
**5. Evara Content (Pregnancy, Menopause, PMS, Community)** ✅
**6. Share Reports via WhatsApp** ✅
**7. QR Code for APK Download** ✅
**8. Capacitor Migration for Android App** ✅

---

## Test Credentials
- **Admin**: /admin, Password: `nevikacura2026`
- **Staff Doctor**: doc_neha / Nevika@2026D
- **Staff Clinic**: staff_pushpa / Nevika@2026C

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Capacitor
- **Backend**: FastAPI, Python, emergentintegrations
- **Database**: MongoDB
- **SMS**: Twilio (for appointments, password reset)
- **Email**: Resend (FREE for OTP, notifications)
- **AI Chat**: Claude (via emergentintegrations)
- **Payments**: Stripe (via emergentintegrations)
- **Mobile**: Capacitor for Android

---

## Test Results (Jan 13, 2026 - Session 2)
- ✅ Backend: 21/21 tests passed (iteration_19)
- ✅ Frontend: 8/8 tests passed
- ✅ Calorie Tracker API: WORKING
- ✅ User Preferences API: WORKING
- ✅ Admin Analytics API: WORKING
- ✅ Stripe Payment API: WORKING

---

## Upcoming Tasks (P1)
- [ ] Full Billing & Due Payments System
- [ ] Automated Follow-up Reminders
- [ ] Medicine refill reminders for Glydex

## Future/Backlog (P2-P3)
- [ ] Migrate hardcoded data (medicines, tests, food database) to MongoDB
- [ ] Refactor server.py (8000+ lines) into modular routes
- [ ] Refactor large frontend components (Evara.js, Glydex.js)
- [ ] Women's Health Community - user discussions/forums

---

## API Reference (New)

### Calorie Tracker
```
GET  /api/calories/food-database  - Get all Indian foods
GET  /api/calories/search?q=dosa  - Search foods
POST /api/calories/log            - Log food intake
GET  /api/calories/logs?date=     - Get daily logs
DELETE /api/calories/logs/{id}    - Delete log entry
GET  /api/calories/daily-summary  - Get daily nutrition summary
```

### Subscriptions
```
GET  /api/evara/subscription/plans        - Get subscription plans
POST /api/evara/subscription/checkout     - Create Stripe checkout
GET  /api/evara/subscription/status/{id}  - Check payment status
GET  /api/evara/subscription/user         - Get user subscription
POST /api/webhook/stripe                  - Stripe webhook handler
```

### Analytics
```
GET /api/admin/analytics?days=7  - Get analytics data
GET /api/admin/stats             - Get basic stats
```
