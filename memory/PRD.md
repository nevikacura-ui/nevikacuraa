# Nevika Cura Healthcare Platform - PRD

## Original Problem Statement
Multi-portal healthcare platform with several specialized portals including DiaGyn, Mango Health Labs, Orange Pharmacy, FaithCare, INNERSCORE, and Reneu.

## Latest Updates (February 11, 2026)

### Completed This Session:
1. **WhatsApp OTP Mandatory in Mango Labs** - OTP verification is now required when booking lab tests
2. **Mango Labs Logo Updated** - New purple/white professional banner logo applied to:
   - Home page card (`Home.js` line 391)
   - Mango Labs header (`Mango.js` line 1157)
3. **Cashfree Payment Verified** - Payment gateway working at `/api/payments/cashfree/create-order`
4. **Booking Limits Removed** - All booking restrictions removed (`server.py` lines 3484-3487):
   - `can_book_appointment: True`
   - `can_book_diagnostic: True`
   - `can_book_pharmacy: True`
   - `can_book_teleconsult: True`

### FaithCare Portal Expansion:
- Added religions: Hindu, Jain, Muslim (Sunni, Ismaili, Shia), Christian
- Added communities for each religion
- Added festivals: Jain (Paryushana, Mahavir Jayanti, etc.), Christian (Lent, Easter, Christmas, etc.)
- Added 2026 festival dates for all religions
- Added health rules for Jain and Christian fasting periods

## Architecture
```
/app
├── backend
│   ├── routes/
│   │   ├── cashfree.py     # Cashfree payment integration
│   │   └── lifealign.py    # FaithCare portal routes
│   ├── models/
│   │   └── lifealign.py    # FaithCare data models
│   └── server.py           # Main FastAPI server
├── frontend
│   └── src/
│       ├── pages/
│       │   ├── Mango.js        # Lab test booking (OTP mandatory)
│       │   ├── Home.js         # Main dashboard
│       │   ├── FaithCare.jsx   # Cultural health portal
│       │   └── InnerScore.jsx  # Health analytics
│       └── components/
│           └── IntroScreen.jsx  # Guest OTP flow
```

## Key API Endpoints
- `POST /api/payments/cashfree/create-order` - Create payment order
- `GET /api/booking-limits/status` - Check booking restrictions (all True now)
- `POST /api/otp/whatsapp/send` - Send OTP via WhatsApp
- `POST /api/otp/whatsapp/verify` - Verify WhatsApp OTP
- `POST /api/lifealign/init` - Initialize FaithCare data
- `GET /api/lifealign/religions` - Get available religions

## Test Credentials
- **Guest Login**: Any 10-digit phone number
- **Test OTP**: Displayed in toast notification (development mode)
- **FaithCare**: FC2026001 / faith@care001

## Backlog / Future Tasks
1. Real-time timezone detection for FaithCare festivals
2. Expand FaithCare to more religions (Sikh, Buddhist, etc.)
3. Automatic yearly calendar updates via cron job
4. Enhanced payment tracking and notifications
