# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-module healthcare application with:
- FaithCare (Religious services with WhatsApp reminders)
- DiaGyn (Clinic management with Google Reviews)
- Mango Health Labs (Diagnostics with home collection)
- Orange Pharmacy (Medicine delivery)

## What's Been Implemented

### Session: Feb 12, 2026 (Latest)

#### Staff Notification System
- ✅ Updated Mango Health Labs number to `7039040040`
- ✅ Staff notifications only sent for ONLINE appointments
- ✅ Walk-in/Emergency appointments skip notification (staff already present)

#### Payment System Overhaul
- ✅ **3 Payment Options** (Pharmacy & Mango):
  - Cash on Delivery/Collection
  - Pay Online Now (Cashfree)
  - Pay Later (Payment Link)
  
- ✅ **Payment Link API** (`/api/payments/cashfree/create-payment-link`):
  - Creates Cashfree order
  - Sends link via WhatsApp/Email
  - Tracks status: PENDING → LINK_SENT → PAID

- ✅ **Staff Portal Updates**:
  - "Send Payment Link" button for Pay Later orders
  - Payment method badge (Cash/Pay Later/Online)
  - Payment status indicator

#### UI Updates
- ✅ Mango Health Labs logo centered on hero section
- ✅ Removed QR/Card at home option

### Previous Sessions
- Google Review automation for DiaGyn
- Manual Review button for staff
- Staff WhatsApp notifications for new bookings
- Logo alignment fixes
- ESLint warning fixes

## Staff Notification Numbers
| Clinic/Service | Phone Number |
|----------------|--------------|
| Pushpa Clinic | 918108500522 |
| Amnion Clinic | 918108500533 |
| Mango Health Labs | 917039040040 |
| Ornave | 917039030030 |

## Notification Logic
- **Online appointments**: ✅ Send staff notification
- **Walk-in appointments**: ❌ No notification
- **Emergency appointments**: ❌ No notification

## Test Credentials
- **DiaGyn Staff**: `staff_diagyn` / `test`
- **Mango Staff**: `staff_mango` / `test`

## Pending Tasks

### P0 (Critical)
- Mock OTP → Email fallback (WhatsApp fails → use email OTP)

### P1 (High)
- IST timezone standardization across all backend
- Verify Cashfree payment in production

### P2 (Medium)
- Thermal printer format documentation
- Profile page cleanup

### P3 (Low)
- Comprehensive testing run
- Code refactoring (server.py breakdown)

## Key API Endpoints

### Payment
- `POST /api/payments/cashfree/create-order` - Create Cashfree order
- `POST /api/payments/cashfree/create-payment-link` - Create & send payment link
- `GET /api/payments/cashfree/payment-link-status/{order_id}` - Check link status

### Appointments
- `POST /api/appointments` - Book online appointment
- `POST /api/diagyn/appointments/walk-in` - Walk-in appointment

### Staff
- `GET /api/pharmacy/orders` - Get pharmacy orders
- `GET /api/mango/bookings` - Get lab bookings

## Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── cashfree.py (Payment gateway)
│   │   ├── staff.py (Staff portal APIs)
│   │   └── ...
│   ├── services/
│   │   ├── email.py (Resend email)
│   │   ├── whatsapp_service.py (MSG91)
│   │   └── ...
│   └── server.py (Main routes)
└── frontend/
    └── src/
        ├── pages/
        │   ├── Pharmacy.js
        │   ├── Mango.js
        │   ├── OrangePharmacyStaffPortal.js
        │   └── MangoLabsStaffPortal.js
        └── components/
            └── CashfreeCheckout.jsx
```

## 3rd Party Integrations
- **MSG91** - WhatsApp templates
- **Resend** - Email notifications
- **Cashfree** - Payment gateway (Production)
