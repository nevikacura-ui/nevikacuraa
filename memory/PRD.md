# Nevika Cura - Product Requirements Document

## Original Problem Statement
Multi-module healthcare application with modules including:
- **FaithCare** (Ramadan services with WhatsApp reminders)
- **Mango Health Labs** (diagnostics)
- **DiaGyn** (clinic management)

## Architecture
- **Frontend**: React, Tailwind CSS
- **Backend**: Python, FastAPI
- **Database**: MongoDB + JSON files for static data
- **Integrations**: MSG91 (WhatsApp), Resend (Email)

## What's Been Implemented

### Session: Feb 11, 2026
- ✅ Fixed Mango logo alignment on Homepage (equidistant from borders like DiaGyn)
- ✅ Fixed Mango logo alignment on Mango Labs page hero section
- ✅ Fixed mock OTP issue - now only shows when WhatsApp service fails
- ✅ Fixed double `/api/api/` URL bug in IntroScreen.jsx
- ✅ Added "Send Review Request" button for completed appointments
- ✅ Created centralized IST timezone utilities
- ✅ Fixed ESLint warnings in FaithCare.jsx

### Previous Sessions
- ✅ Logo and UI Overhaul for FaithCare and Mango Health Labs
- ✅ FaithCare WhatsApp Reminders (Sehri, Iftar)
- ✅ DiaGyn Google Review Automation (auto-sends on appointment completion)

## Key Files
- `/app/frontend/src/pages/Home.js` - Homepage with service cards
- `/app/frontend/src/pages/Mango.js` - Mango Health Labs page
- `/app/frontend/src/pages/DiaGynStaffPortal.js` - DiaGyn Staff Portal
- `/app/frontend/src/components/IntroScreen.jsx` - Guest login/OTP flow
- `/app/backend/routes/patient_auth.py` - Patient authentication with OTP
- `/app/backend/routes/diagyn_staff.py` - DiaGyn APIs including review requests
- `/app/backend/utils/timezone_utils.py` - IST timezone utilities

## Google Review Feature
- **Auto**: Review request sent when doctor completes appointment
- **Manual**: Staff can click "REVIEW" button on completed appointment cards
- **API**: `POST /api/diagyn-staff/whatsapp/send-review-request`

## OTP Behavior
- Real WhatsApp OTP sent via MSG91 when configured
- Mock OTP only shown when WhatsApp service unavailable
- Fixed URL bug that caused 404 errors on guest login

## Prioritized Backlog

### P2 - Medium Priority
- Clean up user profile page

### P3 - Future Enhancements
- Weekly review trends visualization
- Comprehensive testing run

## Test Credentials
- **FaithCare**: User `FC2026001`, Password `faith@care001`
- **DiaGyn Staff**: User `staff_diagyn`, Password `test`
- **Mango Staff**: User `staff_mango`, Password `test`
