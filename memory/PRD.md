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
  - **WhatsApp Reminders** (Sehri, Iftar, Festival alerts) ✅ WORKING
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

### 3. DiaGyn Healthcare - Clinic Management
- **Clinics**: Pushpa Clinic, Amnion Clinic
- **Features**:
  - Appointment booking (Online, Walk-in, Emergency)
  - Doctor dashboard
  - **Auto Google Review Request** on appointment completion ✅ WORKING

## What's Been Implemented

### Session: February 11, 2026

#### Completed Features:
1. ✅ **Email Credentials API** - Sends 30 FaithCare credentials to email
2. ✅ **FaithCare WhatsApp Reminders**:
   - Sehri reminder (template: `faithcare_sehri_remind`)
   - Iftar reminder (template: `faithcare_iftar_reminder`)
   - Festival alerts
   - UI with toggles in FaithCare dashboard
3. ✅ **DiaGyn Google Review System**:
   - Auto-sends review request when appointment completed
   - Works for ALL appointment types (scheduled, walk-in, emergency)
   - Clinic-specific review links (Pushpa & Amnion)
   - Template: `diagyn_google_review`
4. ✅ **Logo Updates**:
   - Mango: New white background logo
   - FaithCare: Dove logo with scale 1.45
5. ✅ **UI Fixes**:
   - "in 60 MINS" text changed to white
   - Homepage service cards styling

#### MSG91 Templates Created:
| Template | Purpose | Status |
|----------|---------|--------|
| `faithcare_sehri_remind` | Sehri reminder with "Ya Ali Madad" | ✅ Working |
| `faithcare_iftar_reminder` | Iftar reminder | ✅ Working |
| `diagyn_google_review` | Google Review request | ✅ Working |

## API Endpoints

### FaithCare WhatsApp
- `POST /api/lifealign/whatsapp/register` - Register for reminders
- `POST /api/lifealign/whatsapp/send-sehri-reminder` - Send Sehri alert
- `POST /api/lifealign/whatsapp/send-iftar-reminder` - Send Iftar alert
- `POST /api/lifealign/whatsapp/send-festival-reminder` - Send festival alert
- `POST /api/lifealign/send-credentials-email` - Email 30 credentials

### DiaGyn Google Review
- `POST /api/diagyn-staff/whatsapp/send-review-request` - Manual review request
- `POST /api/diagyn-staff/whatsapp/bulk-review-request` - Bulk send by date
- **Auto-trigger**: On appointment completion (status = "Completed")

## Google Review Links
| Clinic | Link |
|--------|------|
| Pushpa Clinic | https://g.page/r/CZBa3QPJ_1lXECI/review |
| Amnion Clinic | https://g.page/r/CZyZHBaBV8i_EBI/review |

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

## Backlog / Future Tasks

### P1 - High Priority
- [ ] Real-time timezone detection for Sehri/Iftar (international users)
- [ ] GPS integration for Jamatkhana finder
- [ ] Add more Jamatkhana locations (USA/Canada)

### P2 - Medium Priority
- [ ] Clean up user profile page
- [ ] Camera-based barcode scanning for Staff Portal
- [ ] Cashfree payment testing

### P3 - Low Priority
- [ ] Push notifications (Firebase)
- [ ] Backend modularization
