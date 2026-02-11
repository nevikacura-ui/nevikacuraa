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
- `/app/frontend/src/utils/thermalPrinter.js` - Thermal printer utilities
- `/app/backend/routes/lifealign.py` - FaithCare APIs
- `/app/backend/routes/diagyn_staff.py` - DiaGyn APIs
- `/app/backend/routes/clinic_management.py` - Appointment management

## What's Been Implemented

### Session: Feb 11, 2026
- ✅ Fixed Mango Health Labs logo centering on Homepage and Mango page
- ✅ Logo now properly centered in white rectangular frame using flexbox
- ✅ Verified by testing agent (0px offset from center)

### Previous Sessions
- ✅ Logo and UI Overhaul for FaithCare and Mango Health Labs
- ✅ FaithCare WhatsApp Reminders (Sehri, Iftar)
- ✅ FaithCare Internationalization (more Jamatkhana locations, timezone-aware)
- ✅ DiaGyn Google Review Automation (sends link on appointment completion)
- ✅ Credential distribution endpoint for FaithCare users
- ✅ Comprehensive testing completed

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- IST Timezone Standardization (partially done, needs systematic implementation)
- Verify Google Review Stats on doctor portal

### P2 - Medium Priority
- Fix ESLint warnings in FaithCare.jsx (lines 138, 372)
- Clean up user profile page

### P3 - Future Enhancements
- Comprehensive testing run (pending user approval)

## API Endpoints
- `POST /api/lifealign/whatsapp/send-sehri-reminder` - Sehri reminder
- `POST /api/diagyn/appointments/{id}/status` - Update appointment + trigger review
- `GET /api/diagyn/review-stats` - Review statistics
- `GET /api/lifealign/ramadan-timings/{city}` - Timezone-aware Ramadan timings

## Test Credentials
- **FaithCare**: User `FC2026001`, Password `faith@care001`
- **Mango Staff**: User `staff_mango`, Password `test`

## Known Issues
- Login/OTP modal blocks UI verification (use testing agent or valid credentials)
- ESLint warnings in FaithCare.jsx (non-critical)
