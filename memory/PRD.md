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
- ✅ Logo now properly centered in white rectangular frame using flexbox
- ✅ Created centralized IST timezone utility module (`/app/backend/utils/timezone_utils.py`)
- ✅ Updated review stats API to use IST date
- ✅ Fixed ESLint warnings in FaithCare.jsx (converted functions to useCallback)
- ✅ Verified Google Review stats display in DiaGyn Staff Portal

### Previous Sessions
- ✅ Logo and UI Overhaul for FaithCare and Mango Health Labs
- ✅ FaithCare WhatsApp Reminders (Sehri, Iftar)
- ✅ FaithCare Internationalization (more Jamatkhana locations, timezone-aware)
- ✅ DiaGyn Google Review Automation (sends link on appointment completion)
- ✅ Credential distribution endpoint for FaithCare users
- ✅ Comprehensive testing completed

## IST Timezone Utilities
Location: `/app/backend/utils/timezone_utils.py`

Functions available:
- `get_ist_now()` - Current IST datetime
- `get_ist_date()` - Current IST date (YYYY-MM-DD)
- `get_ist_datetime_iso()` - Current IST datetime in ISO format
- `get_ist_display_datetime()` - Formatted for display (DD-MM-YYYY HH:MM AM/PM IST)
- `format_datetime_ist(dt_str)` - Convert any datetime string to IST display format
- `utc_to_ist(dt)` - Convert UTC datetime to IST

## Thermal Printer Formats
Location: `/app/frontend/src/utils/thermalPrinter.js`

- **Token Receipt**: Clinic name, token number, booking ID, appointment type, patient name, slot time
- **Bill Receipt**: Clinic name, date/time, patient details, fees breakdown, total, doctor name

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- None currently

### P2 - Medium Priority
- Clean up user profile page

### P3 - Future Enhancements
- Comprehensive testing run (pending user approval)
- Review Insights card for Summary tab

## API Endpoints
- `POST /api/lifealign/whatsapp/send-sehri-reminder` - Sehri reminder
- `POST /api/diagyn/appointments/{id}/status` - Update appointment + trigger review
- `GET /api/diagyn-staff/review-stats` - Review statistics (uses IST date)
- `GET /api/lifealign/ramadan-timings/{city}` - Timezone-aware Ramadan timings

## Test Credentials
- **FaithCare**: User `FC2026001`, Password `faith@care001`
- **DiaGyn Staff**: User `staff_diagyn`, Password `test`
- **Mango Staff**: User `staff_mango`, Password `test`

## Known Issues
- Login/OTP modal blocks UI verification (use testing agent or valid credentials)
