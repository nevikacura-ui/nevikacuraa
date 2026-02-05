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

### Feb 4, 2026 - DiaGyn Staff Portal Rebuild COMPLETE

#### New Staff Portal Features
- ✅ **Teal/Lime Green Theme** - Compact, senior-friendly UI
- ✅ **Unified Booking Portal** - Book for both Pushpa & Amnion clinics (two clinic toggles)
- ✅ **15-Minute Slot Intervals**
- ✅ **IST-Based Session Logic**:
  - Morning Session: 11:00 AM - 2:00 PM IST
  - Evening Session: 6:00 PM - 10:00 PM IST
  - No Session: 2pm-6pm (only Emergency available)
- ✅ **Doctor Schedule-Based Slots**:
  - Dr. Vikas Jha: Pushpa (Mon/Wed/Fri 6pm-10pm), Amnion (Mon-Sat 11am-2pm + Tue/Thu/Sat 6pm-10pm)
  - Dr. Neha Patel: Pushpa (Mon-Sat 11am-2pm + Tue/Thu/Sat 6pm-10pm), Amnion (Mon/Wed/Fri 6pm-10pm)
  - Sundays: No appointments
- ✅ **Simplified Booking Flow**:
  - **Walk-in Tab**: Current session slots only (disabled when no session active)
  - **Emergency (24x7)**: Always available, no slot required
  - **Book Appointment Tab**: Future dates with step-by-step flow
- ✅ **Slot Blocking** - Patient-booked slots unavailable for staff
- ✅ **Patient Database** - Mobile lookup for faster rebooking
- ✅ **Appointment Types**: Walk-In, Scheduled, Emergency
- ✅ **Patient Journey Tracking**: Booked → CheckedIn → WithDoctor → Completed
- ✅ **Fee Collection**: Fee codes (NF, G1, G2, D1, D2, D3, O1, O2, O3, S1, S2) + Scan fees
- ✅ **Collection Summary**: Daily/Weekly/Monthly totals

#### Token Printing System (NEW - Feb 4, 2026)
- ✅ **Auto Token on Check-in**: Token number generated when staff clicks CHECK IN
- ✅ **Daily Sequential Numbering**: Tokens reset daily (continuous for whole day)
- ✅ **Bluetooth Thermal Printer**: Everycom EC58 support (58mm)
- ✅ **Token Receipt Format**:
  - Clinic name & address
  - TOKEN # (large font)
  - Booking ID
  - Appointment type (WALK-IN / EMERGENCY / SCHEDULED)
  - Patient name, slot time, date
  - Generation timestamp
  - "Thank you for choosing NEVIKA CURA" + QR code
- ✅ **Reprint Token**: Button on appointment cards
- ✅ **Print Bill**: Dark yellow button for completed appointments
  - Shows fees breakdown (code + scans)
  - Patient name & mobile
  - Total amount
  - "Thank you" footer

#### Role-Based Permissions (NEW - Feb 4, 2026)
- ✅ **Staff Portal**:
  - CAN: Check-in patients, move to "With Doctor"
  - CAN: Print Token (on check-in) and Print Bill (for completed)
  - CANNOT: Complete appointments, edit fees
- ✅ **Doctor Portal**:
  - CAN: Start consultation, Complete with fees/scans
  - CAN: Edit total amount before completing
  - CAN: Set follow-up date
  - CANNOT: Check-in patients
- ✅ **Haptic Feedback** on all buttons
- ✅ **Real-time Sync** - Auto-refresh every 8 seconds
- ✅ **Intro Screen Skip** - Staff pages bypass main app intro

#### New Doctor Portal Features
- ✅ **Doctor Portal** at `/doctor-portal`
- ✅ **Patient Queue View** - Waiting, In Consultation, Completed sections
- ✅ **Start Consultation** - Move patient from waiting to in-consult
- ✅ **Complete Consultation Modal**:
  - Fee Code Selection (NF, G1, G2, D1, D2, D3 for Dr. Vikas)
  - Sonography/Scan Selection (ES, NT, GS, FL, UP, UT)
  - Notes field
  - Total calculation with breakdown
- ✅ **Same Green/Orange Theme** as Staff Portal

#### Portal Credentials
| Portal | URL | Username | Password |
|--------|-----|----------|----------|
| Staff Portal | `/diagyn-staff` | `staff_diagyn` | `diagyn123` |
| Doctor Portal | `/doctor-portal` | `dr_vikas` | `vikas123` |
| Doctor Portal | `/doctor-portal` | `dr_neha` | `neha123` |
| Orange Pharmacy Staff | `/pharmacy-staff` | `staff_pharmacy` | `staff123` |
| Mango Labs Staff | `/mango-staff` | `staff_mango` | `staff123` |

#### Files Created/Modified
- `/app/backend/routes/diagyn_staff.py` - Backend API routes with schedule
- `/app/frontend/src/pages/DiaGynStaffPortal.js` - Staff portal UI
- `/app/frontend/src/pages/DoctorPortal.js` - Doctor portal UI

### Feb 5, 2026 - Enhanced Staff Portals COMPLETE
**Task:** Build comprehensive staff portals for Orange Pharmacy and Mango Health Labs
**Status:** COMPLETED (Feb 5, 2026)
**Changes:**

#### Orange Pharmacy Staff Portal (`/pharmacy-staff`)
- ✅ **Login** - Username: `staff_pharmacy`, Password: `staff123`
- ✅ **Dashboard** - Stats cards (Today, Pending, Delivery, Done)
- ✅ **Orders View** - Order list with status workflow
- ✅ **Order Status Workflow**: Booked → Pharmacist Call → Packing → Out for Delivery → Completed
- ✅ **Invoice Upload** - Required before dispatching orders
- ✅ **Send Invoice** - WhatsApp (MSG91) + Email (Resend) to customer
- ✅ **Inventory View** - Medicine list with Add/Edit
- ✅ **Add Medicine Form**:
  - Medicine name, generic name, manufacturer, category, unit
  - Pricing: MRP, Discount %, auto-calculated Sale Price
  - Stock quantity, description
- ✅ **Image Upload Modal** (3 options):
  - Upload from device (file picker)
  - Paste image URL
  - Search images (Google/Pixabay search)

#### Mango Health Labs Staff Portal (`/mango-staff`)
- ✅ **Login** - Username: `staff_mango`, Password: `staff123`
- ✅ **Dashboard** - Stats cards (Today, Pending, Processing, Ready)
- ✅ **Bookings View** - Lab test booking list with status workflow
- ✅ **Booking Status Workflow**: Test Booked → Sample Collected → In Process → Report Generated → Completed
- ✅ **Report Upload** - Required before marking "Report Generated"
- ✅ **Send Report** - WhatsApp + Email to patient
- ✅ **Test Catalog View** - Test list with Add/Edit
- ✅ **Add Test Form**:
  - Test name, code, category, description
  - Pricing: Price, Home Collection Price
  - Sample type, turnaround time, fasting required
  - Preparation instructions

**Files Created/Modified:**
- `/app/backend/routes/orange_pharmacy.py` - Pharmacy API routes (medicines, orders, image search)
- `/app/backend/routes/mango_labs.py` - Lab API routes (tests, bookings, reports)
- `/app/frontend/src/pages/OrangePharmacyStaffPortal.js` - Complete pharmacy staff UI
- `/app/frontend/src/pages/MangoLabsStaffPortal.js` - Complete lab staff UI
- `/app/frontend/src/App.js` - Fixed intro screen bypass for staff routes

**Testing:** 12/12 backend tests passed, 100% frontend tests passed

### Feb 5, 2026 - UI Fixes & Icon Updates
**Task:** Fix splash crash, remove WhatsApp+OTP, replace images with icons
**Status:** COMPLETED (Feb 5, 2026)
**Changes:**
- ✅ **Splash screen** - Verified working in browser (may be mobile-specific issue)
- ✅ **Removed "WhatsApp + OTP Coming Soon"** from LoginPage.jsx login options
- ✅ **Health Concern section** - Replaced stock images with minimalist gradient icons
- ✅ **Family Care section** - Replaced stock images with emoji icons (👶 Kids, 🧘 Adult, 👴 Elderly)
- ✅ **Medical Devices** - Kept actual product images as requested
**Files Modified:**
- `/app/frontend/src/pages/LoginPage.jsx` (removed WhatsApp OTP option)
- `/app/frontend/src/pages/Pharmacy.js` (replaced images with icons)

### Feb 4, 2026 - Patient Auth System Overhaul COMPLETE
**Task:** Simplify guest login + implement Email+Password for returning users
**Status:** COMPLETED (Feb 4, 2026)
**Changes:**
- ✅ **Guest button → Skip button** - No phone number required, instant access
- ✅ **New Auth Flow:** Email → Check if user exists with password
  - **New users:** Email → OTP → Set Password → Account created
  - **Returning users:** Email → Password login (with OTP fallback option)
- ✅ **Backend Endpoints Added:**
  - `POST /api/auth/patient/check-email` - Check if email exists + has password
  - `POST /api/auth/patient/set-password` - Set password after OTP verification
  - `POST /api/auth/patient/login` - Email + Password login
- ✅ **Email OTP verify** returns `has_password` flag
- ✅ **Cashfree Payment Integration** - Verified working in production mode
**Files Modified:** 
- `/app/frontend/src/components/IntroScreen.jsx` (Auth UI flow)
- `/app/backend/server.py` (New patient auth endpoints)
**Testing:** All 17 backend tests passed, all UI tests passed

### Feb 4, 2026 - Medical Devices Product Images Update
**Last working item**:
-   **Task:** Update Medical Devices section on Orange Pharmacy page with user-provided product images
-   **Status:** COMPLETED (Feb 4, 2026)
-   **Changes:**
    - Replaced generic stock images with actual product images for:
      - Digital Thermometer (Beurer FT09)
      - Glucometer Kit (Dr. Morepen GlucoOne BG03)
      - Pulse Oximeter (BPL Smart Oxy)
      - Nebulizer (actual product image)
    - Blood Pressure Monitor uses an icon (no specific image provided)
    - Images display with `object-contain` and padding for better presentation
-   **File Modified:** `/app/frontend/src/pages/Pharmacy.js` (lines 1600-1640)

### Feb 4, 2026 - UI Simplification COMPLETE
**Earlier item**:
-   **Task:** Simplified the splash screen - removed animated "Book.Order.Test.Care" text and fixed heart icon overlap. Updated carousel taglines.
-   **Status:** COMPLETED (Feb 4, 2026)

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
