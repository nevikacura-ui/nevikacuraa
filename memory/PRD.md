# Nevika Cura - Healthcare Application PRD

## Original Problem Statement
Healthcare application with multiple modules including FaithCare (cultural health sync) and Mango Health Labs (diagnostics portal).

## Core Modules

### 1. FaithCare - Cultural Health Sync
- **Religions Supported**: Hindu, Jain, Muslim (Sunni, Ismaili), Christian
- **Features**:
  - Exclusive login portal (30 credentials: FC2026001-FC2026030)
  - Festival calendar with health alerts
  - Ramadan 2026 Calendar with Sehri/Iftar timings
  - Ramadan Diet Plans (Diabetic, Hypertension, Kidney)
  - Jamatkhana Finder (for Ismaili users)
  - **WhatsApp Reminders** (Sehri, Iftar, Festival alerts)
- **Logo**: Black background dove logo
- **Theme**: Dark slate with amber accents

### 2. Mango Health Labs - Diagnostics Portal
- **User Features**: Book lab tests, WhatsApp OTP verification (mandatory for guests)
- **Staff Portal**: 
  - New Entry form (patient booking with barcode)
  - Status tracking (Booked → Sample Collected → In Lab → Report Generated)
  - Cost Calculator
- **Logo**: White background with mango icon and "Aam logon ki, Khaas Lab" tagline
- **Theme**: Orange gradient

## What's Been Implemented

### Session: February 11, 2026

#### Completed Features:
1. ✅ **Email Credentials API** - Sends 30 FaithCare credentials to specified email
2. ✅ **WhatsApp Reminder System** for FaithCare:
   - `/api/lifealign/whatsapp/register` - Register user for reminders
   - `/api/lifealign/whatsapp/send-sehri-reminder` - Sehri alerts
   - `/api/lifealign/whatsapp/send-iftar-reminder` - Iftar alerts  
   - `/api/lifealign/whatsapp/send-festival-reminder` - Festival alerts
   - `/api/lifealign/whatsapp/user-preferences/{user_id}` - Get preferences
   - `/api/lifealign/whatsapp/bulk-reminder` - Send to all registered users
3. ✅ **FaithCare UI Updates**:
   - WhatsApp Reminders card on dashboard
   - Dialog with toggles for Sehri/Iftar/Festival
   - Test reminder buttons
4. ✅ **Logo Updates**:
   - Mango: New white background logo (all locations)
   - FaithCare: Dove logo with scale 1.45
5. ✅ **UI Fixes**:
   - "in 60 MINS" text changed to white
   - Homepage service cards styling

#### MSG91 Templates Created:
- `faithcare_sehri_remind` - Sehri reminder with "Ya Ali Madad" greeting
- `faithcare_iftar_reminder` - Iftar reminder

## Technical Architecture

### Backend: Python/FastAPI
- `/app/backend/server.py` - Main server
- `/app/backend/routes/lifealign.py` - FaithCare routes (including WhatsApp)
- `/app/backend/services/msg91_whatsapp.py` - MSG91 WhatsApp integration

### Frontend: React/Vite
- `/app/frontend/src/pages/FaithCare.jsx` - FaithCare portal
- `/app/frontend/src/pages/Mango.js` - Mango Health Labs
- `/app/frontend/src/pages/MangoLabsStaffPortal.js` - Staff portal
- `/app/frontend/src/pages/Home.js` - Homepage with service cards

### Database: MongoDB
- `faithcare_whatsapp_prefs` - WhatsApp notification preferences

## Credentials

### FaithCare (30 accounts)
- Format: `FC2026001` to `FC2026030`
- Password format: `faith@care001` to `faith@care030`
- Email sent to: nevikacura@gmail.com

### Mango Staff Portal
- Username: `staff_mango`
- Password: `test`

## Important Notes

### WhatsApp Opt-in Requirement
Users must first message the WhatsApp Business number (918108888330) before receiving template messages. This is Meta/WhatsApp's anti-spam policy.

### MSG91 Configuration
- Auth Key: Configured in backend/.env
- WhatsApp Number: 918108888330
- Templates must be approved by Meta for delivery

## Backlog / Future Tasks

### P1 - High Priority
- [ ] Real-time timezone detection for Sehri/Iftar (international users)
- [ ] GPS integration for Jamatkhana finder
- [ ] Add more Jamatkhana locations (USA/Canada)

### P2 - Medium Priority
- [ ] Clean up user profile page (remove theme toggle)
- [ ] Camera-based barcode scanning for Staff Portal
- [ ] Full end-to-end Cashfree payment testing

### P3 - Low Priority
- [ ] Sehri/Iftar push notifications (Firebase)
- [ ] Backend modularization (Flask Blueprints)
- [ ] Database migration (in-memory → persistent)
