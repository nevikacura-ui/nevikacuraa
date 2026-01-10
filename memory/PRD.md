# Nevika Cura Healthcare Application - PRD

## Original Problem Statement
Build a modern healthcare application for "Nevika Cura" with three core services:
1. **DiaGyn Healthcare** - Appointment booking for doctors
2. **Proton Diagnostics** - Lab test booking
3. **Orange Pharmacy** - Medicine ordering

## Core Requirements

### Services & WhatsApp Numbers
| Service | WhatsApp Number | Purpose |
|---------|-----------------|---------|
| DiaGyn Healthcare | 7039020020 | Appointment notifications |
| Proton Diagnostics | 7039040040 | Test booking notifications |
| Orange Pharmacy | 7039030030 | Medicine order notifications |

### User Flow
- OTP-based login and registration
- **OTP-based verification** for all bookings/orders (MOCK MODE - ready for MSG91 integration)
- Payment options: Cash on Delivery/Visit & QR Pay/Card on Delivery/Visit
- All notifications sent to nevikacura@gmail.com via Resend API
- WhatsApp links generated via wa.me for all orders

---

## What's Been Implemented ✅

### Date: January 10, 2026 - Latest Update (Current Session)

#### Doctor Credentials Updated - NEW
- [x] **Usernames changed:** `doc_pushpa_01` → `doc_neha`, `doc_amnion_01` → `doc_vikas`
- [x] Both doctors now have unified `doctor` role (instead of clinic-specific roles)
- [x] Doctors can view BOTH clinics with toggle dropdown
- [x] Calendar-based date navigation with 7-day view
- [x] ✅ All 20 tests passed - credentials, clinic toggle, calendar, history modal

#### Day-End Cleanup Endpoints - NEW
- [x] `GET /api/admin/cleanup/stats` - View counts before cleanup
- [x] `DELETE /api/admin/cleanup/appointments/date/{date}` - Delete appointments for specific date
- [x] `DELETE /api/admin/cleanup/appointments/completed` - Delete completed appointments
- [x] `DELETE /api/admin/cleanup/pharmacy/completed` - Delete delivered pharmacy orders
- [x] `DELETE /api/admin/cleanup/diagnostic/completed` - Delete completed diagnostic orders
- [x] `DELETE /api/admin/cleanup/all?confirm=DELETEALL` - Clear ALL data for fresh start

#### Staff Update Endpoint - NEW
- [x] `PUT /api/admin/staff/{staff_id}` - Update staff username, name, role, clinic

#### Staff Credentials Email - SENT
- [x] `POST /api/admin/send-credentials-email?email=xxx` - Send all login credentials via email
- [x] ✅ Email sent to nevikacura@gmail.com with all staff credentials

#### Patient Profile Saving - NEW
- [x] `POST /api/patients/profile` - Save/update patient profile
- [x] `GET /api/patients/profile/{phone}` - Retrieve saved profile
- [x] `GET /api/patients/autocomplete/{phone}` - Autocomplete from saved profiles/history
- [x] Stores: name, email, address, DOB, gender, blood group, allergies, emergency contact
- [x] Falls back to appointment history if no saved profile exists

#### Patient History Modal - NEW FEATURE
- [x] **Doctors can view complete patient history** during consultations
- [x] `GET /api/staff/patient/history/{phone}` - Returns all appointments, diagnostic orders, pharmacy orders
- [x] Summary cards showing: Total Visits, Upcoming, Lab Tests, Pharmacy orders
- [x] Past appointments with date, time, doctor, clinic, status
- [x] Diagnostic and pharmacy order history
- [x] "History" button on each appointment card in doctor's view
- [x] Modal displays patient name, phone, and complete medical history

#### Backend Refactoring - STARTED
- [x] Created `/app/backend/models/` directory with Pydantic schemas
- [x] Created `/app/backend/models/schemas.py` - All data models extracted
- [x] Created `/app/backend/utils/__init__.py` - Common utility functions
- [x] Created `/app/backend/config.py` - Configuration constants, clinic data, settings
- [ ] Next: Gradually migrate server.py to use modular imports (non-breaking)

#### Doctor Multi-Clinic Portal - NEW FEATURE
- [x] **Doctors can now see appointments from ALL clinics they work at**
- [x] Added `DOCTOR_CLINICS` mapping in backend (server.py line 5713)
- [x] Staff login now returns `doctor_clinics` array with all clinics the doctor works at
- [x] `GET /api/staff/doctor/appointments` accepts optional `clinic` query parameter for filtering
- [x] Frontend clinic toggle dropdown - "All Clinics", "Pushpa Clinic", "Amnion Clinic"
- [x] Calendar-based navigation with appointment counts per day
- [x] Status summary showing Booked, In Clinic, Completed counts
- [x] Appointment cards show clinic name, status badges, and Complete button
- [x] **10/10 tests passed** - Full E2E verification

#### Slot Synchronization FIX - CRITICAL BUG RESOLVED
- [x] **Fixed: Patient bookings now block slots correctly** - The issue was that patient bookings (DiaGyn) created appointments with `status: "pending"`, but the slot blocking only checked for `["Booked", "In Clinic", "Completed"]`
- [x] Updated `GET /api/appointments/booked-slots` to include `"pending"` status in filter
- [x] Updated `POST /api/appointments` slot blocking check to include `"pending"` status
- [x] Updated `POST /api/staff/appointments/walk-in` slot blocking check to include `"pending"` status
- [x] **Tested and verified** - 9 core tests passed, slot sync working between DiaGyn and StaffPortal

#### WhatsApp Notification Enhancement
- [x] Added WhatsApp notification link to OTP-based registration (`/api/auth/register/otp`)
- [x] Consistent WhatsApp link generation across all registration methods

### Date: January 10, 2026 - Previous Updates

#### Slot Synchronization
- [x] **Patient + Staff booking sync** - Slots booked by patients (DiaGyn) are blocked for staff (StaffPortal) and vice versa
- [x] `GET /api/appointments/booked-slots` - Returns active bookings (status: pending, Booked, In Clinic, Completed)
- [x] StaffPortal fetches booked slots and filters available time slots
- [x] Shows slot count: "22 slots available, 6 booked"
- [x] Cross-booking prevention tested and verified

#### Timezone Fix
- [x] **Indian Standard Time (IST)** - All dates in StaffPortal now use IST (UTC+5:30)
- [x] Walk-in form, Emergency form, and Appointments tab all use correct Indian date

### Date: January 8, 2026

#### Medicine Inventory
- [x] **4,266 total medicines** in inventory
- [x] Company field REMOVED from all medicines
- [x] Medicine data shows only: name, form
- [x] Scrollable list with infinite scroll pagination
- [x] Total count badge displayed

#### OTP-based Authentication
- [x] `POST /api/auth/otp/send` - Send OTP for login/registration
- [x] `POST /api/auth/otp/verify` - Verify OTP and check if user exists
- [x] `POST /api/auth/login/otp` - Login after OTP verification
- [x] `POST /api/auth/register/otp` - Register new user after OTP verification
- [x] 6-digit OTP with 5-minute expiry
- [x] 3 verification attempts before lockout
- [x] 30-second resend cooldown

#### DiaGyn Healthcare
- [x] Appointment booking with date/time selection
- [x] **Slot blocking** - Booked slots cannot be double-booked
- [x] `GET /api/appointments/booked-slots` - Get booked slots for a doctor/date
- [x] OTP verification before booking
- [x] Email notification on booking to nevikacura@gmail.com
- [x] WhatsApp link generation

#### Proton Diagnostics
- [x] Test package selection (no prices shown)
- [x] Prescription upload support
- [x] OTP verification before booking
- [x] Email notification on booking
- [x] WhatsApp link generation

#### Orange Pharmacy
- [x] **4,266 medicines** with search autocomplete
- [x] Scrollable medicine list with pagination
- [x] Manual medicine entry
- [x] OTP verification before order
- [x] Email notification on order
- [x] WhatsApp link generation

#### User Dashboard (/profile)
- [x] View user profile (name, email, phone)
- [x] View appointment history
- [x] View diagnostic order history
- [x] View pharmacy order history
- [x] Order status display

#### Admin Dashboard (/admin) - ENHANCED
- [x] Password-protected admin login (default: `nevikacura2026`)
- [x] Dashboard stats: Medicines, Users, Appointments, Diagnostics, Pharmacy Orders
- [x] **Pharmacy Tab (Inventory Management):**
  - [x] Searchable medicine list with infinite scroll
  - [x] Add new medicine (name + form)
  - [x] Delete medicine from inventory
- [x] **Tests Tab (Proton Diagnostic Tests):**
  - [x] View all tests by category (Imaging, Pathology)
  - [x] Add new test (name, category, subcategory)
  - [x] Delete test from list
  - [x] Categories: Imaging (ECG, Sonography), Pathology (Blood, Urine, Stool)
- [x] **Tracking Tab (Order Status Management):** - NEW
  - [x] **Orange Pharmacy Orders:**
    - Status flow: Order Booked → Packing → Out for Delivery → Delivered
    - Visual progress indicator (dots)
    - Color-coded status badges
    - Update button with notes field
    - Email notification on status update
  - [x] **Proton Diagnostic Orders:**
    - Status flow: Test Booked → Sample Collected → In Process → Reports Generated
    - Visual progress indicator (dots)
    - Color-coded status badges
    - Update button with notes field
    - Email notification on status update
- [x] **Doctor Leave Tab (Appointment Cancellation):**
  - [x] View upcoming appointments
  - [x] Cancel by Session (specific time slot on a day)
  - [x] Cancel by Day (all appointments on a single day)
  - [x] Cancel by Range (all appointments in a date range)
  - [x] Email notification sent to admin for cancelled appointments
  - [x] Reason field for cancellation
- [x] **Orders Tab:**
  - [x] View recent appointments
  - [x] View recent diagnostic orders
  - [x] View recent pharmacy orders

#### Email Notifications
- [x] Configured with Resend API
- [x] **Custom sender domain:** `noreply@nevikacura.com`
- [x] Admin notifications sent to nevikacura@gmail.com
- [x] **Patient notifications** (when email provided):
  - Welcome email on registration
  - Appointment confirmation
  - Diagnostic test booking confirmation
  - Pharmacy order confirmation
  - Pharmacy order status updates
  - Diagnostic order status updates
  - Appointment cancellation notice
- [x] **Email field helper text** in all booking forms explaining what emails they'll receive

---

## Technical Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main API server
- MongoDB for data persistence
- Resend API for email notifications
- JWT authentication with OTP flow

### Frontend (React)
- `/app/frontend/src/pages/Home.js` - Landing page with OTP auth modal
- `/app/frontend/src/pages/DiaGyn.js` - Appointment booking
- `/app/frontend/src/pages/Proton.js` - Diagnostic test booking
- `/app/frontend/src/pages/Pharmacy.js` - Medicine ordering with scrollable list
- `/app/frontend/src/pages/Profile.js` - User dashboard with order history
- `/app/frontend/src/pages/Admin.js` - Admin dashboard with inventory management
- `/app/frontend/src/context/AuthContext.js` - Auth state management

### Key API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/otp/send` | POST | Send OTP for auth |
| `/api/auth/otp/verify` | POST | Verify auth OTP |
| `/api/auth/login/otp` | POST | Login with OTP |
| `/api/auth/register/otp` | POST | Register with OTP |
| `/api/admin/login` | POST | Admin login |
| `/api/admin/stats` | GET | Get dashboard stats |
| `/api/admin/orders/recent` | GET | Get recent orders |
| `/api/admin/pharmacy/orders` | GET | Get pharmacy orders for admin |
| `/api/admin/pharmacy/orders/{id}/status` | PUT | Update pharmacy order status |
| `/api/admin/diagnostic/orders` | GET | Get diagnostic orders for admin |
| `/api/admin/diagnostic/orders/{id}/status` | PUT | Update diagnostic order status |
| `/api/orders/pharmacy/{id}/track` | GET | Track pharmacy order (public) |
| `/api/orders/diagnostic/{id}/track` | GET | Track diagnostic order (public) |
| `/api/admin/diagnostic-tests` | GET | Get all diagnostic tests |
| `/api/admin/diagnostic-tests/add` | POST | Add new diagnostic test |
| `/api/admin/diagnostic-tests/{cat}/{sub}/{name}` | DELETE | Delete diagnostic test |
| `/api/diagnostic-tests` | GET | Get tests for frontend |
| `/api/admin/appointments` | GET | Get appointments with filters |
| `/api/admin/appointments/cancel` | POST | Cancel appointments (session/day/range) |
| `/api/admin/doctors` | GET | Get list of doctors |
| `/api/pharmacy/count` | GET | Total medicine count |
| `/api/pharmacy/all` | GET | Paginated medicine list |
| `/api/pharmacy/inventory/add` | POST | Add medicine |
| `/api/pharmacy/inventory/{name}` | DELETE | Delete medicine |
| `/api/appointments` | POST | Book appointment |
| `/api/appointments/booked-slots` | GET | Get booked slots |
| `/api/proton/orders` | POST | Book diagnostic test |

---

## Access URLs

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page with services |
| DiaGyn | `/diagyn` | Appointment booking |
| Proton | `/proton` | Diagnostic test booking |
| Pharmacy | `/pharmacy` | Medicine ordering |
| Profile | `/profile` | User dashboard (requires login) |
| Admin | `/admin` | Admin dashboard (password: `nevikacura2026`) |

---

## Current Status

### Working Features ✅
1. Medicine inventory: 4,266 medicines (no company field)
2. OTP-based login and registration
3. DiaGyn appointment booking with slot blocking
4. Proton Diagnostics test booking
5. Orange Pharmacy medicine ordering
6. Email notifications via Resend
7. WhatsApp link generation for all services
8. User dashboard with order history
9. Admin dashboard with inventory management
10. **PWA (Progressive Web App)** - Mobile installable with offline support
11. **Push Notifications** - Web Push API with VAPID keys

### Push Notifications ✅ (Completed January 9, 2026)
- Web Push API with VAPID keys (no Firebase dependency)
- User subscription management from Profile → Settings
- Notifications for: Order confirmations, status updates, appointment confirmations
- Admin broadcast capability for announcements
- Service worker handles push events and notification clicks
- API endpoints: `/api/push/vapid-public-key`, `/api/push/subscribe`, `/api/push/test`

### PWA Features ✅ (Completed January 9, 2026)
- Web app manifest with app icons (72x72 to 512x512) - **Custom Nevika Cura logo**
- Service worker for offline caching
- Apple touch icon for iOS home screen
- Theme color integration (#14b8a6 teal)
- App shortcuts for DiaGyn, Proton, Pharmacy
- "Add to Home Screen" capability on mobile devices

### Mocked Features (Ready for Production Integration)
- OTP system returns mock OTP in response (integrate MSG91 for production)

---

## Future Enhancements (Backlog)

### P0 - High Priority
| Feature | How to Implement |
|---------|-----------------|
| **MSG91 OTP** | Call `integration_playbook_expert_v2` with "MSG91 SMS OTP". Get API key from msg91.com. Replace mock OTP calls in server.py |
| **Custom Domain Email** | Add nevikacura.com to Resend dashboard. Verify DNS. Update SENDER_EMAIL in .env |

### P1 - Medium Priority
| Feature | How to Implement |
|---------|-----------------|
| **WhatsApp API** | Use Twilio WhatsApp Business API or MSG91 WhatsApp. Requires WhatsApp Business verification |
| **Order Tracking** | Add `status` field updates. Create `/api/orders/{id}/status` endpoint. Add tracking UI |
| **Payment Gateway** | Call `integration_playbook_expert_v2` with "Razorpay" or "Stripe". Add payment flow before order confirmation |

### P2 - Lower Priority
| Feature | How to Implement |
|---------|-----------------|
| **Analytics Dashboard** | Add date range filters to admin. Create charts with recharts library |

---

## Credentials & Configuration

### Admin Access
- **URL:** `/admin`
- **Password:** `nevikacura2026`

### Environment Variables
- `RESEND_API_KEY` - Configured in backend/.env
- `SENDER_EMAIL` - **noreply@nevikacura.com** (custom domain)
- `MONGO_URL` - MongoDB connection
- `JWT_SECRET` - JWT token secret
- `ADMIN_PASSWORD` - Admin dashboard password (default: nevikacura2026)
- `REACT_APP_BACKEND_URL` - Frontend API base URL

### Notification Recipients
- Email: nevikacura@gmail.com
- WhatsApp: Generated wa.me links with pre-filled messages
