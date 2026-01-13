# Nevika Cura Healthcare Application - PRD

## Original Problem Statement
Build a modern healthcare application for "Nevika Cura" with core services:
1. **DiaGyn Healthcare** - Appointment booking for doctors
2. **Proton Diagnostics** - Lab test booking
3. **Orange Pharmacy** - Medicine ordering
4. **Evara** - Women's Wellness & Care Program
5. **Glydex** - Diabetes Care Portal

---

## Authentication System (Updated Jan 13, 2026)

### New Cost-Saving Auth Flow
| Step | Method | Cost |
|------|--------|------|
| **Signup** | Email OTP (Resend) | FREE |
| **Login** | Password | FREE |
| **Password Reset** | SMS OTP (Twilio) | Paid |
| **Appointments** | SMS OTP for verification | Paid |

### Endpoints
- `POST /api/auth/email-otp/send` - Send email OTP for signup
- `POST /api/auth/email-otp/verify` - Verify email OTP
- `POST /api/auth/login` - Password login
- `POST /api/auth/forgot-password/send-otp` - SMS OTP for password reset
- `POST /api/auth/forgot-password/reset` - Reset password with OTP

---

## Staff SMS Notification Numbers
| Service | Staff Numbers | Purpose |
|---------|---------------|---------|
| DiaGyn Healthcare | 8108500522, 8108500533 | New appointments (Pushpa + Amnion) |
| Proton Diagnostics | 7039040040 | New test bookings |
| Orange Pharmacy | 8108500511 | New medicine orders |
| Nevika/Evara/Glydex | 9833188288 | Signups & general |
| Email | nevikacura@gmail.com | Order updates, reports |

### Notification Rules
- **New Orders**: SMS to staff + Email to customer
- **Order Updates**: Email only (no SMS)
- **Evara/Glydex**: No SMS - Email OTP or password only

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

### January 13, 2026 - Authentication Overhaul

**1. Email OTP for Signup (FREE)**
- Auth modal now shows EMAIL input first
- OTP sent via Resend API (free 10,000/month)
- No SMS cost for user registration

**2. Password Login**
- Users login with email/password after registration
- No OTP needed for regular login

**3. SMS Only for:**
- Password reset (forgot password flow)
- Appointment verification by patients

**4. No WhatsApp Redirects**
- All orders (DiaGyn, Proton, Pharmacy) use SMS notifications
- No WhatsApp redirect in frontend
- SMS sent to both customer AND staff

**5. Enhanced Admin Cancellation**
- Single Slot, Bulk Session (11-2 / 6-10)
- Whole Day, Date Range
- Session Range (DateA/SessionA to DateB/SessionB)

**6. Evara Content**
- Pregnancy Education (3 trimesters)
- Menopause Guide (stages, symptoms, tips)
- Women Health Community (tips, guides, Q&A)
- Period Tracker with cycle phase tips

**7. Share Reports via WhatsApp**
- Glydex: Blood sugar logs (FBS, PPBS, HbA1c)
- Evara: Period tracking report

---

## Test Credentials
- **Admin**: /admin, Password: `nevikacura2026`
- **Staff Doctor**: doc_neha / Nevika@2026D
- **Staff Clinic**: staff_pushpa / Nevika@2026C

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **SMS**: Twilio (for appointments, password reset)
- **Email**: Resend (FREE for OTP, notifications)
- **AI Chat**: Claude (via emergentintegrations)
- **PWA/Mobile**: Capacitor for Android

---

## Test Results (Jan 13, 2026)
- ✅ Backend: 19/19 tests passed
- ✅ Frontend: 12/12 tests passed
- ✅ Email OTP signup: WORKING
- ✅ Password login: WORKING
- ✅ No WhatsApp redirects: VERIFIED
- ✅ Staff SMS notifications: CONFIGURED

---

## Upcoming Tasks (P1)
- [ ] Analytics Dashboard for revenue/appointment trends
- [ ] Payment Gateway Integration (Razorpay/Stripe)
- [ ] Automated Follow-up Reminders

## Future/Backlog (P2-P3)
- [ ] Migrate hardcoded data (medicines, tests) to MongoDB
- [ ] Refactor server.py (6000+ lines)
- [ ] Full Billing & Due Payments System
