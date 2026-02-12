# Nevika Cura - Product Requirements Document

## Architecture
- **Frontend**: React, Tailwind CSS
- **Backend**: Python, FastAPI
- **Database**: MongoDB
- **Integrations**: MSG91 (WhatsApp), Resend (Email)

## Staff Notification Numbers (UPDATED Feb 12, 2026)
| Clinic/Service | Phone Number |
|----------------|--------------|
| Pushpa Clinic | 8108500522 |
| Amnion Clinic | 8108500533 |
| Mango Health Labs | **7039040040** (Updated) |
| Ornave | 7039030030 |

## Notification Logic
- **Online appointments**: ✅ Send staff notification
- **Walk-in appointments**: ❌ No notification (staff already present)
- **Emergency appointments**: ❌ No notification (staff already present)

## What's Been Implemented

### Session: Feb 12, 2026 (Latest)
- ✅ Updated Mango Health Labs number from 7030040040 to **7039040040**
- ✅ Added skip logic for walk-in/emergency appointments (no staff notification)
- ✅ Staff notifications now only sent for ONLINE bookings
- ✅ Added staff WhatsApp notifications for new appointments
- ✅ Added staff WhatsApp notifications for Mango Labs orders
- ✅ Staff notifications use same template as patient confirmations
- ✅ Notifications include `[STAFF ALERT]` prefix for easy identification

### Previous Sessions
- ✅ Mango logo alignment fixes (Homepage + Mango page)
- ✅ Mock OTP fix - only shows when WhatsApp service fails
- ✅ Send Review Request button for completed appointments
- ✅ IST timezone utilities
- ✅ FaithCare WhatsApp reminders
- ✅ Google Review automation

## Key Files Modified
- `/app/backend/server.py` - Staff notification functions updated
- `/app/frontend/src/pages/Home.js` - Logo alignment
- `/app/frontend/src/pages/Mango.js` - Logo alignment
- `/app/frontend/src/pages/DiaGynStaffPortal.js` - Review button
- `/app/frontend/src/components/IntroScreen.jsx` - OTP fix

## Appointment Flow
1. Patient books appointment online
2. System creates appointment in `db.appointments`
3. Email sent to admin + patient (with QR code)
4. WhatsApp sent to patient (MSG91)
5. **NEW**: WhatsApp sent to staff (clinic-specific number)
6. Real-time slot update broadcast via WebSocket

## Known Issue
- PC-00058 not found in database - may have been booked on production environment
- Preview uses `test_database`, production may use different DB

## Test Credentials
- **DiaGyn Staff**: `staff_diagyn` / `test`
- **Mango Staff**: `staff_mango` / `test`
