# Nevika Cura Healthcare Platform - PRD

## Original Problem Statement
Multi-portal healthcare platform with several specialized portals including DiaGyn, Mango Health Labs, Orange Pharmacy, FaithCare, INNERSCORE, and Reneu.

## Latest Updates (February 11, 2026)

### Completed This Session:

#### UI/Theme Updates:
1. **Mango Health Labs Branding** - Complete orange/green theme overhaul:
   - New Mango logo (orange circle with green leaves)
   - Orange gradient header in portal (`from-[#F97316] to-[#C2410C]`)
   - Tagline: "Aam logon ki, Khaas Lab."
   - Updated staff portal login and header

2. **FaithCare Card** - Added to home page carousel beside InnerScore

#### Mango Labs Staff Portal - New Features:
1. **New Entry Tab** - Staff can create test bookings:
   - Patient name and phone fields
   - Manual barcode entry (auto-generates if empty)
   - Priority selection: Normal, Urgent, Critical
   - Test search and multi-select
   - Real-time cost calculation

2. **Cost Calculator Tab** - Estimate costs for customers:
   - Search tests by name, code, or barcode
   - Add multiple tests to calculate total
   - Copy estimate to clipboard for sharing
   - Shows individual test prices and total

3. **Test Booking Flow**:
   - Status: `Booked → Sample Collected → In Lab → Report Generated → Completed`
   - Report upload mandatory before "Report Generated"
   - Barcode tracking for each test entry

### Previous Session Completed:
- WhatsApp OTP mandatory in Mango Labs
- Cashfree payment integration verified
- Booking limits removed
- FaithCare expanded with Hindu, Jain, Muslim (Sunni/Ismaili), Christian religions

## Architecture
```
/app
├── backend
│   ├── routes/
│   │   ├── cashfree.py        # Payment integration
│   │   ├── lifealign.py       # FaithCare portal
│   │   └── admin.py           # Staff management
│   └── server.py              # Main FastAPI server
├── frontend
│   └── src/
│       ├── pages/
│       │   ├── Mango.js              # Lab test booking (OTP mandatory)
│       │   ├── MangoLabsStaffPortal.js # Staff portal with new features
│       │   ├── Home.js               # Updated with FaithCare card
│       │   ├── FaithCare.jsx         # Cultural health portal
│       │   └── InnerScore.jsx        # Health analytics
│       └── components/
│           └── IntroScreen.jsx       # Guest OTP flow
```

## Staff Portal Features

### Mango Labs Staff Portal (`/mango-staff`)
**Login:** `staff_mango` / `test`

**Tabs:**
1. **Bookings** - View and manage all test bookings
2. **New Entry** - Create new test booking with:
   - Patient info (name, phone)
   - Manual barcode entry
   - Priority (Normal/Urgent/Critical)
   - Test multi-select with search
3. **Calculator** - Cost estimator:
   - Search tests by name/code
   - Add to list, calculate total
   - Copy estimate for sharing
4. **Test Rates** - View/edit test catalog

## Key API Endpoints
- `POST /api/mango/bookings` - Create new test booking
- `PUT /api/mango/bookings/{id}/status` - Update booking status
- `POST /api/mango/bookings/{id}/upload-report` - Upload report file
- `GET /api/mango/tests` - Get test catalog
- `POST /api/staff/login` - Staff authentication

## Test Credentials
- **Staff Portal**: `staff_mango` / `test`
- **Guest Login**: Any 10-digit phone + OTP from toast
- **FaithCare**: FC2026001 / faith@care001

## Backlog / Future Tasks
1. Real-time timezone detection for FaithCare festivals
2. Expand FaithCare to more religions (Sikh, Buddhist)
3. Automatic yearly calendar updates
4. Enhanced barcode scanning integration
5. Staff performance analytics dashboard
