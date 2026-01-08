# Nevika Cura Healthcare Application - PRD

## Original Problem Statement
Build a modern healthcare application for "Nevika Cura" with three core services:
1. **DiaGyn Healthcare** - Appointment booking for doctors
2. **Proton Diagnostics** - Lab test booking
3. **Orange Pharmacy** - Medicine ordering

## Core Requirements

### Services & WhatsApp Numbers
| Service | WhatsApp Number | Purpose |
|---------|-----------------|---------|
| DiaGyn Healthcare | 7039020020 | Appointment notifications |
| Proton Diagnostics | 7039040040 | Test booking notifications |
| Orange Pharmacy | 7039030030 | Medicine order notifications |

### User Flow
- OTP-based login and registration
- **OTP-based verification** for all bookings/orders (MOCK MODE - ready for MSG91 integration)
- Payment options: Cash on Delivery/Visit & QR Pay/Card on Delivery/Visit
- All notifications sent to nevikacura@gmail.com via Resend API
- WhatsApp links generated via wa.me for all orders

---

## What's Been Implemented ✅

### Date: January 8, 2026 - Latest Update

#### Medicine Inventory
- [x] **4,266 total medicines** in inventory
- [x] Company field REMOVED from all medicines
- [x] Medicine data shows only: name, form
- [x] Scrollable list with infinite scroll pagination
- [x] Total count badge displayed

#### OTP-based Authentication
- [x] `POST /api/auth/otp/send` - Send OTP for login/registration
- [x] `POST /api/auth/otp/verify` - Verify OTP and check if user exists
- [x] `POST /api/auth/login/otp` - Login after OTP verification
- [x] `POST /api/auth/register/otp` - Register new user after OTP verification
- [x] 6-digit OTP with 5-minute expiry
- [x] 3 verification attempts before lockout
- [x] 30-second resend cooldown

#### DiaGyn Healthcare
- [x] Appointment booking with date/time selection
- [x] **Slot blocking** - Booked slots cannot be double-booked
- [x] `GET /api/appointments/booked-slots` - Get booked slots for a doctor/date
- [x] OTP verification before booking
- [x] Email notification on booking to nevikacura@gmail.com
- [x] WhatsApp link generation

#### Proton Diagnostics
- [x] Test package selection (no prices shown)
- [x] Prescription upload support
- [x] OTP verification before booking
- [x] Email notification on booking
- [x] WhatsApp link generation

#### Orange Pharmacy
- [x] **4,266 medicines** with search autocomplete
- [x] Scrollable medicine list with pagination
- [x] Manual medicine entry
- [x] OTP verification before order
- [x] Email notification on order
- [x] WhatsApp link generation

#### Email Notifications
- [x] Configured with Resend API
- [x] All notifications sent to nevikacura@gmail.com
- [x] Sent for: New registrations, appointments, test bookings, pharmacy orders

---

## Technical Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main API server
- MongoDB for data persistence
- Resend API for email notifications
- JWT authentication with OTP flow

### Frontend (React)
- `/app/frontend/src/pages/Home.js` - Landing page with OTP auth modal
- `/app/frontend/src/pages/DiaGyn.js` - Appointment booking
- `/app/frontend/src/pages/Proton.js` - Diagnostic test booking
- `/app/frontend/src/pages/Pharmacy.js` - Medicine ordering with scrollable list
- `/app/frontend/src/context/AuthContext.js` - Auth state management

### Key API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/otp/send` | POST | Send OTP for auth |
| `/api/auth/otp/verify` | POST | Verify auth OTP |
| `/api/auth/login/otp` | POST | Login with OTP |
| `/api/auth/register/otp` | POST | Register with OTP |
| `/api/pharmacy/count` | GET | Total medicine count |
| `/api/pharmacy/all` | GET | Paginated medicine list |
| `/api/pharmacy/autocomplete` | GET | Search medicines |
| `/api/appointments` | POST | Book appointment |
| `/api/appointments/booked-slots` | GET | Get booked slots |
| `/api/proton/orders` | POST | Book diagnostic test |
| `/api/otp/send` | POST | Send order OTP |
| `/api/otp/verify` | POST | Verify order OTP |

---

## Current Status

### Working Features ✅
1. Medicine inventory: 4,266 medicines (no company field)
2. OTP-based login and registration
3. DiaGyn appointment booking with slot blocking
4. Proton Diagnostics test booking
5. Orange Pharmacy medicine ordering
6. Email notifications via Resend
7. WhatsApp link generation for all services

### Mocked Features (Ready for Production Integration)
- OTP system returns mock OTP in response (integrate MSG91 for production)

---

## Future Enhancements (Backlog)

### P0 - High Priority
- [ ] Integrate MSG91 for real SMS OTP
- [ ] User account dashboard with order history

### P1 - Medium Priority
- [ ] Admin dashboard for inventory management
- [ ] Order tracking/status updates
- [ ] Real WhatsApp API integration (Twilio/MSG91)

### P2 - Lower Priority
- [ ] Payment gateway integration
- [ ] Push notifications
- [ ] Mobile app

---

## Credentials & Configuration

### Environment Variables
- `RESEND_API_KEY` - Configured in backend/.env
- `MONGO_URL` - MongoDB connection
- `JWT_SECRET` - JWT token secret
- `REACT_APP_BACKEND_URL` - Frontend API base URL

### Notification Recipients
- Email: nevikacura@gmail.com
- WhatsApp: Generated wa.me links with pre-filled messages
