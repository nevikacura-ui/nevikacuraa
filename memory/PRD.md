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

### Date: January 6, 2026

#### Orange Pharmacy
- [x] Manual medicine entry with name + quantity
- [x] Browse 346+ medicines from inventory
- [x] Search by name/company, filter by form (Tablet, Syrup, etc.)
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
  - Sonography (6 types): Early Scan, NT Scan, Growth Scan, USG Pelvis, Doppler Scan, Follicular Monitoring
- [x] **Pathology Section**:
  - Blood Tests (100+ comprehensive tests)
  - Urine Tests (22 tests)
  - Sputum Tests (7 tests)
  - Stool Tests (10 tests)
- [x] Custom test manual entry
- [x] X-ray REMOVED as per user request
- [x] 2-step booking flow:
  - Step 1: Select tests
  - Step 2: Enter details (Name, Mobile, Address) + Payment method
- [x] Payment options: Cash on Visit, QR Pay/Card on Visit
- [x] WhatsApp booking to 7039040040
- [x] Preferred date selection

#### DiaGyn Healthcare
- [x] Doctor scheduling for Dr. Vikas Jha & Dr. Neha Patel
- [x] Complex availability calendar
- [x] Appointment booking with patient details
- [x] WhatsApp notification to 7039020020

#### General
- [x] Modern UI with consistent design
- [x] Responsive layout
- [x] Home page with service logos (no text names)
- [x] Nevika Cura branding with registered address

---

## Technical Architecture

### Backend (FastAPI)
- `/api/pharmacy/inventory` - Get medicine inventory with search/filter
- `/api/pharmacy/forms` - Get unique medicine forms
- `/api/pharmacy` - Create pharmacy order
- `/api/diagnostics` - Create diagnostic booking
- `/api/appointments` - Create appointment

### Frontend (React)
- `/` - Home page with 3 service cards
- `/diagyn` - DiaGyn appointment booking
- `/proton` - Proton Diagnostics test booking
- `/pharmacy` - Orange Pharmacy medicine ordering

### Key Files
- `/app/backend/server.py` - All API endpoints
- `/app/frontend/src/pages/Pharmacy.js` - Pharmacy 2-step flow
- `/app/frontend/src/pages/Proton.js` - Diagnostics 2-step flow
- `/app/frontend/src/pages/DiaGyn.js` - Appointment booking

---

## Backlog / Future Tasks

### P0 (High Priority)
- [ ] None currently

### P1 (Medium Priority)
- [ ] Guest/optional login flow implementation
- [ ] Order history for logged-in users

### P2 (Low Priority)
- [ ] Email notifications (explicitly not required by user)
- [ ] Admin dashboard for order management
- [ ] Order tracking/status updates

### Skipped by User
- [x] Razorpay integration - User chose COD/QR payment options instead
- [x] Google Drive integration - User decided to skip
- [x] Automated WhatsApp (Twilio) - User chose current setup (WhatsApp links)

---

## Known Limitations
1. WhatsApp messages require user to tap "Send" (not fully automated)
2. No online payment processing (only COD/QR at delivery)
3. No Google Drive backup of orders
