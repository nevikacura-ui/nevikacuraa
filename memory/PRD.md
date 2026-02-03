# Nevika Cura - Healthcare Application PRD

## Original Problem Statement
Complete healthcare platform with three main services:
1. **DiaGyn** - Gynecology & Diabetes care clinic with appointment booking
2. **Mango Health Labs** (formerly Proton Diagnostics) - Lab tests & health checkups
3. **Orange Pharmacy** - Online pharmacy with medicine ordering

## User Personas
- Patients seeking lab tests and health checkups
- Patients booking gynecology/diabetes consultations
- Customers ordering medicines online
- Staff managing appointments and orders (NEW: Senior-friendly interface)

## Core Requirements
- Multi-service healthcare platform with unified navigation
- Lab test booking with home sample collection
- Doctor appointment scheduling
- Online pharmacy with prescription management
- Payment integration (COD + Cashfree online payment)
- **NEW: Unified Staff Portal for clinic appointment management**

---

## What's Been Implemented

### Feb 3, 2026 - DiaGyn Staff Portal Rebuild

#### New Staff Portal Features
- ✅ **Dark Green/Orange Mango Labs Theme** - Compact, senior-friendly UI
- ✅ **Unified Booking Portal** - Book for both Pushpa & Amnion clinics
- ✅ **Doctor Schedule-Based Slots**:
  - Dr. Vikas Jha (Pushpa): Mon-Sat, 9AM-1PM & 5PM-9PM
  - Dr. Neha Patel (Amnion): Mon-Sat, 10AM-2PM & 6PM-9PM
  - Sundays: No appointments
- ✅ **Slot Blocking** - Patient-booked slots unavailable for staff
- ✅ **Patient Database** - Mobile lookup for faster rebooking
- ✅ **Appointment Types**: Walk-In, Scheduled, Emergency
- ✅ **Patient Journey Tracking**: Booked → CheckedIn → WithDoctor → Completed
- ✅ **Fee Collection**: Fee codes (G1, D1, O1, etc.) + Scan fees
- ✅ **Collection Summary**: Daily/Weekly/Monthly totals
- ✅ **Haptic Feedback** on all buttons
- ✅ **Real-time Sync** - Auto-refresh every 8 seconds

#### Files Created/Modified
- `/app/backend/routes/diagyn_staff.py` - New backend API routes
- `/app/frontend/src/pages/DiaGynStaffPortal.js` - New compact UI
- Route: `/diagyn-staff`

### Earlier Updates (Dec 2025 - Feb 2026)
- ✅ Unified header with service tabs (Nevika Cura, DiaGyn, Mango, Orange)

#### Mango Health Labs (Lab Tests)
- ✅ Test selection with categorized carousels
- ✅ Horizontal scrolling test cards with pricing
- ✅ "View Details" modal with AI-generated descriptions
- ✅ "Imaging" tab for ECG/Sonography
- ✅ Compact promo banner with MANGO15 coupon code
- ✅ Trust badges (Certified Lab, Home Collection, etc.)
- ✅ Dark green theme with orange buttons
- ✅ Enlarged Mango logo on home page service card

#### Payment Integration
- ✅ Cashfree payment gateway integrated
- ✅ Backend routes at `/api/payments/`
- ✅ CashfreeCheckout component for online payments
- ✅ **Three-Tier Payment System (Feb 3, 2026):**
  - Mango Health Labs: Cash on Visit, QR/Card on Visit, Pay Online (5% OFF)
  - Orange Pharmacy: Cash on Delivery, QR/Card on Delivery, Pay Online (2% OFF)
- ✅ Smartphone icon import fixed in Pharmacy.js

#### UI/UX
- ✅ Professional carousel with solid bold colors
- ✅ Red heart icon for Nevika Cura tab (visible on all pages)
- ✅ Compact spacing on Mango home page
- ✅ White container for test selection readability
- ✅ **Back Navigation Buttons (Feb 3, 2026):**
  - DiaGyn: "Back to Doctor Selection" (Step 2), "Back to Clinic Selection" (Step 3)
  - Pharmacy: "Back to Cart" (Step 3)
- ✅ **"Formerly Proton Diagnostics" text** - Added to Mango Health Labs header

---

## Known Issues
1. ~~**"Browse All Tests" Button** - State resets on page reload~~ ✅ FIXED (URL-based state management)
2. ~~**File Naming** - Proton.js should be renamed to Mango.js~~ ✅ FIXED (renamed to Mango.js)

## Mocked APIs
- `send_whatsapp_message` - Stubbed
- `send_sms` - Stubbed

---

## Prioritized Backlog

### P0 - Critical
- [x] ~~Rename Proton.js → Mango.js~~ ✅ COMPLETED
- [x] ~~Three-Tier Payment System~~ ✅ COMPLETED for both Mango & Pharmacy
- [ ] Refactor Mango.js into smaller components (TestCard, CategoryCarousel, etc.) - File is very large

### P1 - High Priority
- [x] ~~Fix "Browse All Tests" button state persistence~~ ✅ COMPLETED
- [x] ~~Implement Wishlist & Save for Later~~ ✅ COMPLETED (Mango & Pharmacy)
- [x] ~~Fix Medicine Image Upload Portal~~ ✅ COMPLETED (real-time search, file upload)
- [ ] Verify "Recently Viewed" feature on Pharmacy

### P2 - Medium Priority
- [ ] WhatsApp Chatbot implementation
- [ ] Migrate test inventory from static file to MongoDB
- [ ] Manual Pharmacy Inventory update

### P3 - Low Priority
- [ ] Refactor backend routes (decompose server.py)
- [ ] Face ID camera fix for mobile

---

## Architecture

```
/app/
├── backend/
│   ├── server.py              # Main FastAPI app
│   ├── routes/
│   │   └── cashfree.py        # Cashfree payment routes
│   └── data/
│       ├── diagnostic_tests.py # Lab test catalog
│       └── medicine_inventory.py # Pharmacy inventory
└── frontend/
    ├── public/
    │   └── mango-logo.png     # Mango Health Labs logo
    └── src/
        ├── components/
        │   ├── ServiceHeader.jsx    # Tab navigation
        │   ├── CashfreeCheckout.jsx # Payment component
        │   └── ProtonAdBanner.jsx   # Mango ad banner
        └── pages/
            ├── Home.js            # Main landing page
            ├── Mango.js           # Mango Health Labs ✅ RENAMED
            ├── DiaGyn.js          # DiaGyn clinic
            └── Pharmacy.js        # Orange Pharmacy
```

## Key API Endpoints
- `GET /api/diagnostics/tests` - Get all lab tests
- `POST /api/diagnostics/booking` - Create lab booking
- `POST /api/payments/create-order` - Create Cashfree order
- `POST /api/payments/verify` - Verify payment status

## Test Credentials
- Staff: `staff_diagyn` / `diagyn123`
- Guest: Any test name and phone number
