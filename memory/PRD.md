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
- Optional login with guest mode
- **OTP-based verification** for all bookings/orders (MOCK MODE - ready for MSG91 integration)
- Payment options: Cash on Delivery/Visit & QR Pay/Card on Delivery/Visit

---

## What's Been Implemented ✅

### Date: January 8, 2026 - OTP Integration Update

#### OTP Verification System (Mock Mode)
- [x] **Backend API Endpoints:**
  - `POST /api/otp/send` - Generate and "send" OTP (mock mode shows OTP in response)
  - `POST /api/otp/verify` - Verify OTP with 3-attempt limit
  - `POST /api/otp/resend` - Resend OTP
- [x] 6-digit OTP generation
- [x] 5-minute OTP expiry
- [x] 3 verification attempts before lockout
- [x] 30-second resend cooldown
- [x] Service-specific OTP (diagyn, proton, pharmacy)

#### Orange Pharmacy
- [x] **2715 medicines loaded** from Excel product list (brand names with strength and form)
- [x] **Medicine search autocomplete** - Shows suggestions as user types (8 results max)
- [x] `POST /api/pharmacy/inventory/add` - Add single medicine
- [x] `DELETE /api/pharmacy/inventory/{name}` - Remove medicine
- [x] `GET /api/pharmacy/autocomplete` - Autocomplete suggestions
- [x] Manual medicine entry with quantity
- [x] **3-step checkout flow:**
  - Step 1: Add medicines to cart + Enter name/phone
  - Step 2: OTP Verification (mock mode shows OTP on screen)
  - Step 3: Enter delivery address + Payment method
- [x] WhatsApp order shows "(Verified)" next to phone number

#### Proton Diagnostics
- [x] **3-step booking flow:**
  - Step 1: Select tests (Imaging/Pathology/Packages) + Enter name/phone
  - Step 2: OTP Verification
  - Step 3: Select date + Address (for home visit) + Payment method
- [x] Health packages with prices from rate list
- [x] WhatsApp booking shows "(Verified)" next to phone number

#### DiaGyn Healthcare
- [x] **5-step booking flow:**
  - Step 1: Select Doctor
  - Step 2: Select Clinic
  - Step 3: Select Date & Time + Enter name/phone
  - Step 4: OTP Verification
  - Step 5: Confirm booking
- [x] Doctor scheduling with availability calendar
- [x] Booked slots disabled
- [x] WhatsApp notification shows "(Verified)" next to phone number

---

## Technical Architecture

### Backend (FastAPI)
```
/api/otp/send          - Send OTP (mock mode)
/api/otp/verify        - Verify OTP
/api/otp/resend        - Resend OTP
/api/pharmacy/inventory     - Get medicine inventory (with limit)
/api/pharmacy/autocomplete  - Autocomplete for medicine search
/api/pharmacy/inventory/add - Add medicine to inventory
/api/pharmacy/forms         - Get unique medicine forms
/api/pharmacy               - Create pharmacy order
/api/diagnostics            - Create diagnostic booking
/api/appointments           - Create appointment
/api/appointments/booked-slots - Get booked slots
/health                     - Health check
```

### Frontend (React)
- `/` - Home page with 3 service cards
- `/diagyn` - DiaGyn appointment booking (5 steps with OTP)
- `/proton` - Proton Diagnostics test booking (3 steps with OTP)
- `/pharmacy` - Orange Pharmacy medicine ordering (3 steps with OTP)

### Key Files
- `/app/backend/server.py` - All API endpoints + OTP logic
- `/app/frontend/src/pages/Pharmacy.js` - Pharmacy with OTP + autocomplete
- `/app/frontend/src/pages/Proton.js` - Diagnostics with OTP
- `/app/frontend/src/pages/DiaGyn.js` - Appointments with OTP

---

## OTP Integration Status

### Current: Mock Mode ✅
- OTP is displayed on screen for testing
- No actual SMS sent
- Ready for immediate testing

### Future: MSG91 Integration (Pending)
To enable real SMS OTP:
1. Create MSG91 account at https://msg91.com
2. Get Authkey from dashboard
3. Complete DLT registration (required for India)
4. Update backend to use MSG91 API
5. Remove `mock_otp` from response

---

## Backlog / Future Tasks

### P0 (High Priority)
- [x] ~~Add medicines to Orange Pharmacy inventory~~ **DONE - 2715 medicines loaded**

### P1 (Medium Priority)
- [ ] Integrate MSG91 for real SMS OTP (when user provides API key)
- [ ] Complete user account & order history feature
- [ ] Fix server-side WhatsApp sign-up notification

### P2 (Low Priority)
- [ ] Guest/optional login flow improvement
- [ ] Admin dashboard for order management
- [ ] Investigate 405 errors in deployment logs

### P3 (Backlog)
- [ ] Full end-to-end booking test (verify booked slots are disabled)
- [ ] Order tracking/status updates

---

## Known Limitations
1. **Mock OTP Mode** - OTP is shown on screen, not sent via SMS (ready for MSG91 integration)
2. WhatsApp messages require user to tap "Send" (not fully automated)
3. No online payment processing (only COD/QR at delivery)
4. Pharmacy inventory is empty - user needs to add medicines

---

## Changelog

### January 8, 2026 - OTP Integration
- **Added OTP verification** to all three services (DiaGyn, Proton, Orange Pharmacy)
- **Mock OTP mode** implemented for testing (shows OTP on screen)
- **Medicine search autocomplete** added to Orange Pharmacy
- **Cleared pharmacy inventory** - ready for user to populate
- **Updated booking flows** to include OTP step
- **Added API endpoints** for OTP send/verify/resend
- WhatsApp messages now show "(Verified)" for phone numbers

### January 8, 2026 - Earlier
- **Orange Pharmacy**: Replaced entire inventory with 1199 unique medicines
- **Proton Diagnostics**: Updated health packages with prices from rate list
- Added Home Visit service options with distance-based pricing

### January 6, 2026
- Initial implementation of all three services
- Email notifications via Resend
- Basic user auth forms
