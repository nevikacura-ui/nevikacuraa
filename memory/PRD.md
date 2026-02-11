# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-module healthcare application with modules including:
- **FaithCare** (Ramadan services with WhatsApp reminders)
- **Mango Health Labs** (diagnostics)
- **DiaGyn** (clinic management)

## Core Requirements
1. Logo management for Mango Health Labs and FaithCare
2. WhatsApp reminder system for FaithCare (Sehri, Iftar, important dates)
3. Google Review automation for DiaGyn clinics
4. IST timezone standardization for all communications

## Architecture
- **Frontend**: React, Tailwind CSS
- **Backend**: Python, FastAPI
- **Database**: MongoDB + JSON files for static data
- **Integrations**: MSG91 (WhatsApp), Resend (Email)

## Key Files
- `/app/frontend/src/pages/Home.js` - Homepage with service cards
- `/app/frontend/src/pages/Mango.js` - Mango Health Labs page
- `/app/frontend/src/pages/FaithCare.jsx` - FaithCare module
- `/app/frontend/src/pages/DiaGynStaffPortal.js` - DiaGyn Staff Portal
- `/app/frontend/src/utils/thermalPrinter.js` - Thermal printer utilities
- `/app/backend/routes/lifealign.py` - FaithCare APIs
- `/app/backend/routes/diagyn_staff.py` - DiaGyn APIs
- `/app/backend/utils/timezone_utils.py` - Centralized IST timezone utilities

## What's Been Implemented

### Session: Feb 11, 2026
- ✅ Fixed Mango Health Labs logo centering on Homepage and Mango page
- ✅ Adjusted logo size and frame: Frame w-44 h-20, Logo scale 1.28
- ✅ Created centralized IST timezone utility module
- ✅ Fixed ESLint warnings in FaithCare.jsx
- ✅ Verified Google Review stats display in DiaGyn Staff Portal
- ✅ Added "Send Review Request" button for completed appointments
  - Pink button with Star icon
  - Shows on completed appointments with phone numbers
  - Integrates with MSG91 WhatsApp API
  - Shows "Review Sent" badge after sending

### Previous Sessions
- ✅ Logo and UI Overhaul for FaithCare and Mango Health Labs
- ✅ FaithCare WhatsApp Reminders (Sehri, Iftar)
- ✅ FaithCare Internationalization (more Jamatkhana locations, timezone-aware)
- ✅ DiaGyn Google Review Automation (auto-sends on appointment completion)
- ✅ Credential distribution endpoint for FaithCare users

## Google Review Feature
### Automatic Trigger
- Review request sent automatically when doctor completes appointment
- Works for SCHEDULED, WALK_IN, and EMERGENCY appointments

### Manual Trigger (NEW)
- Staff can click "REVIEW" button on completed appointment cards
- Button location: DiaGyn Staff Portal → Appointment card actions
- API: `POST /api/diagyn-staff/whatsapp/send-review-request`
- Shows "Review Sent" badge after successful send

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- None currently

### P2 - Medium Priority
- Clean up user profile page

### P3 - Future Enhancements
- Weekly review trends visualization in Summary tab
- Comprehensive testing run (pending user approval)

## API Endpoints
- `POST /api/lifealign/whatsapp/send-sehri-reminder` - Sehri reminder
- `POST /api/diagyn/appointments/{id}/status` - Update appointment + trigger review
- `GET /api/diagyn-staff/review-stats` - Review statistics
- `POST /api/diagyn-staff/whatsapp/send-review-request` - Manual review request
- `GET /api/lifealign/ramadan-timings/{city}` - Timezone-aware Ramadan timings

## Test Credentials
- **FaithCare**: User `FC2026001`, Password `faith@care001`
- **DiaGyn Staff**: User `staff_diagyn`, Password `test`
- **Mango Staff**: User `staff_mango`, Password `test`

## Known Issues
- Login/OTP modal blocks UI verification (use testing agent or valid credentials)
