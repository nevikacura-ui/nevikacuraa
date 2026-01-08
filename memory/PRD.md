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

#### User Dashboard (/profile)
- [x] View user profile (name, email, phone)
- [x] View appointment history
- [x] View diagnostic order history
- [x] View pharmacy order history
- [x] Order status display

#### Admin Dashboard (/admin) - ENHANCED
- [x] Password-protected admin login (default: `nevikacura2026`)
- [x] Dashboard stats: Medicines, Users, Appointments, Diagnostics, Pharmacy Orders
- [x] **Pharmacy Tab (Inventory Management):**
  - [x] Searchable medicine list with infinite scroll
  - [x] Add new medicine (name + form)
  - [x] Delete medicine from inventory
- [x] **Tests Tab (Proton Diagnostic Tests):**
  - [x] View all tests by category (Imaging, Pathology)
  - [x] Add new test (name, category, subcategory)
  - [x] Delete test from list
  - [x] Categories: Imaging (ECG, Sonography), Pathology (Blood, Urine, Stool)
- [x] **Doctor Leave Tab (Appointment Cancellation):**
  - [x] View upcoming appointments
  - [x] Cancel by Session (specific time slot on a day)
  - [x] Cancel by Day (all appointments on a single day)
  - [x] Cancel by Range (all appointments in a date range)
  - [x] Email notification sent to admin for cancelled appointments
  - [x] Reason field for cancellation
- [x] **Orders Tab:**
  - [x] View recent appointments
  - [x] View recent diagnostic orders
  - [x] View recent pharmacy orders

#### Email Notifications
- [x] Configured with Resend API
- [x] All notifications sent to nevikacura@gmail.com
- [x] Sent for: New registrations, appointments, test bookings, pharmacy orders
- ⚠️ **Note:** Emails may go to spam folder when using free Resend tier (onboarding@resend.dev)

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
- `/app/frontend/src/pages/Profile.js` - User dashboard with order history
- `/app/frontend/src/pages/Admin.js` - Admin dashboard with inventory management
- `/app/frontend/src/context/AuthContext.js` - Auth state management

### Key API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/otp/send` | POST | Send OTP for auth |
| `/api/auth/otp/verify` | POST | Verify auth OTP |
| `/api/auth/login/otp` | POST | Login with OTP |
| `/api/auth/register/otp` | POST | Register with OTP |
| `/api/admin/login` | POST | Admin login |
| `/api/admin/stats` | GET | Get dashboard stats |
| `/api/admin/orders/recent` | GET | Get recent orders |
| `/api/admin/diagnostic-tests` | GET | Get all diagnostic tests |
| `/api/admin/diagnostic-tests/add` | POST | Add new diagnostic test |
| `/api/admin/diagnostic-tests/{cat}/{sub}/{name}` | DELETE | Delete diagnostic test |
| `/api/diagnostic-tests` | GET | Get tests for frontend |
| `/api/admin/appointments` | GET | Get appointments with filters |
| `/api/admin/appointments/cancel` | POST | Cancel appointments (session/day/range) |
| `/api/admin/doctors` | GET | Get list of doctors |
| `/api/pharmacy/count` | GET | Total medicine count |
| `/api/pharmacy/all` | GET | Paginated medicine list |
| `/api/pharmacy/inventory/add` | POST | Add medicine |
| `/api/pharmacy/inventory/{name}` | DELETE | Delete medicine |
| `/api/appointments` | POST | Book appointment |
| `/api/appointments/booked-slots` | GET | Get booked slots |
| `/api/proton/orders` | POST | Book diagnostic test |

---

## Access URLs

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page with services |
| DiaGyn | `/diagyn` | Appointment booking |
| Proton | `/proton` | Diagnostic test booking |
| Pharmacy | `/pharmacy` | Medicine ordering |
| Profile | `/profile` | User dashboard (requires login) |
| Admin | `/admin` | Admin dashboard (password: `nevikacura2026`) |

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
8. User dashboard with order history
9. Admin dashboard with inventory management

### Mocked Features (Ready for Production Integration)
- OTP system returns mock OTP in response (integrate MSG91 for production)

---

## Future Enhancements (Backlog)

### P0 - High Priority
| Feature | How to Implement |
|---------|-----------------|
| **MSG91 OTP** | Call `integration_playbook_expert_v2` with "MSG91 SMS OTP". Get API key from msg91.com. Replace mock OTP calls in server.py |
| **Custom Domain Email** | Add nevikacura.com to Resend dashboard. Verify DNS. Update SENDER_EMAIL in .env |

### P1 - Medium Priority
| Feature | How to Implement |
|---------|-----------------|
| **WhatsApp API** | Use Twilio WhatsApp Business API or MSG91 WhatsApp. Requires WhatsApp Business verification |
| **Order Tracking** | Add `status` field updates. Create `/api/orders/{id}/status` endpoint. Add tracking UI |
| **Payment Gateway** | Call `integration_playbook_expert_v2` with "Razorpay" or "Stripe". Add payment flow before order confirmation |

### P2 - Lower Priority
| Feature | How to Implement |
|---------|-----------------|
| **Push Notifications** | Use Firebase Cloud Messaging (FCM). Add service worker for web push |
| **Mobile App** | React Native or Flutter. Reuse API endpoints |
| **Analytics Dashboard** | Add date range filters to admin. Create charts with recharts library |

---

## Credentials & Configuration

### Admin Access
- **URL:** `/admin`
- **Password:** `nevikacura2026`

### Environment Variables
- `RESEND_API_KEY` - Configured in backend/.env
- `MONGO_URL` - MongoDB connection
- `JWT_SECRET` - JWT token secret
- `ADMIN_PASSWORD` - Admin dashboard password (default: nevikacura2026)
- `REACT_APP_BACKEND_URL` - Frontend API base URL

### Notification Recipients
- Email: nevikacura@gmail.com
- WhatsApp: Generated wa.me links with pre-filled messages
