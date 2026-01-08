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
- 2-step ordering process for Proton & Pharmacy
- Payment options: Cash on Delivery/Visit & QR Pay/Card on Delivery/Visit

---

## What's Been Implemented ✅

### Date: January 8, 2026

#### Orange Pharmacy
- [x] Manual medicine entry with name + quantity
- [x] **1199 medicines** in inventory (updated from complete stock files)
- [x] Search by name/company, filter by form (Tablet, Syrup, Capsule, etc.)
- [x] Shopping cart with quantity controls
- [x] 2-step checkout flow:
  - Step 1: Add medicines to cart
  - Step 2: Enter details (Name, Mobile, Address) + Payment method
- [x] Payment options: Cash on Delivery, QR Pay/Card on Delivery
- [x] WhatsApp order to 7039030030
- [x] Prescription upload (optional)

#### Proton Diagnostics
- [x] **Imaging Section**:
  - ECG
  - Sonography (5 types): Early Scan, NT Scan, Growth Scan, USG Pelvis, Follicular Monitoring
- [x] **Pathology Section**:
  - Blood Tests (100+ comprehensive tests)
  - Urine Tests (22 tests)
  - Sputum Tests (7 tests)
- [x] **Health Packages with Prices** (from rate list):
  - Diabetes Screening Package - ₹600
  - Diabetes Basic Package - ₹1200
  - Diabetes Advance Package - ₹2500
  - Proton Basic Package - ₹999
  - Proton Total Package - ₹2999
  - Proton Xclusive Package - ₹4999
  - Home Visit (0-5 km) - ₹100
  - Home Visit (5-10 km) - ₹150
  - Home Visit (10-15 km) - ₹200
- [x] Custom test manual entry
- [x] 2-step booking flow
- [x] WhatsApp booking to 7039040040

#### DiaGyn Healthcare
- [x] Doctor scheduling for Dr. Vikas Jha & Dr. Neha Patel
- [x] Complex availability calendar
- [x] Appointment booking with patient details
- [x] WhatsApp notification to 7039020020

#### Email Notifications
- [x] Resend integration for order confirmations to nevikacura@gmail.com
- [x] Sender name: "Nevika Cura"

#### General
- [x] Modern UI with consistent design
- [x] Responsive layout
- [x] Home page with service logos
- [x] Nevika Cura branding with registered address

---

## Technical Architecture

### Backend (FastAPI)
- `/api/pharmacy/inventory` - Get medicine inventory (1199 medicines) with search/filter
- `/api/pharmacy/forms` - Get unique medicine forms
- `/api/pharmacy` - Create pharmacy order
- `/api/diagnostics` - Create diagnostic booking
- `/api/appointments` - Create appointment
- `/health` - Health check for deployment

### Frontend (React)
- `/` - Home page with 3 service cards
- `/diagyn` - DiaGyn appointment booking
- `/proton` - Proton Diagnostics test booking
- `/pharmacy` - Orange Pharmacy medicine ordering

### Key Files
- `/app/backend/server.py` - All API endpoints + medicine inventory
- `/app/frontend/src/pages/Pharmacy.js` - Pharmacy 2-step flow
- `/app/frontend/src/pages/Proton.js` - Diagnostics 2-step flow + packages with prices
- `/app/frontend/src/pages/DiaGyn.js` - Appointment booking

---

## Backlog / Future Tasks

### P0 (High Priority)
- [ ] None currently

### P1 (Medium Priority)
- [ ] Fix server-side WhatsApp notification (currently uses webbrowser.open which won't work in production)
- [ ] Complete user account & order history feature
- [ ] Investigate 405 errors in deployment logs

### P2 (Low Priority)
- [ ] Guest/optional login flow improvement
- [ ] Admin dashboard for order management
- [ ] Order tracking/status updates

### P3 (Backlog)
- [ ] Full end-to-end booking test (verify booked slots are disabled)

---

## Known Limitations
1. WhatsApp messages require user to tap "Send" (not fully automated)
2. No online payment processing (only COD/QR at delivery)
3. Server-side WhatsApp notification for user sign-up uses webbrowser.open (production-incompatible)

---

## Changelog

### January 8, 2026
- **Orange Pharmacy**: Replaced entire inventory with 1199 unique medicines from:
  - 660853239-product-list-23062023.xlsx
  - SI_S_266909_08012026.pdf
  - Current_Stock_Products_With_Value_Product-wise_02_01_2026_08_01_2026
  - Stock_Summary_Report_07-01-2026.pdf
- **Proton Diagnostics**: Updated health packages with prices from proton_diagnostics_rate_list.pdf
- Added Home Visit service options with distance-based pricing

### January 6, 2026
- Initial implementation of all three services
- 346+ medicines in pharmacy inventory
- Comprehensive diagnostic tests
- Appointment booking system
