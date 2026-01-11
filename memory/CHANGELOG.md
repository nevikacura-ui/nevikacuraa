# Nevika Cura Healthcare - Changelog

## [January 10, 2026] - Push Notifications & Feedback System

### Added
- **Auto Notification Prompt:**
  - Shows for logged-in users after 3 second delay
  - Android banner-style with gradient background
  - Enable Now / Maybe Later buttons
  - Dismissal persisted in localStorage

- **Push Notifications for Status Updates:**
  - Pharmacy order status → Push notification (no email)
  - Diagnostic test status → Push notification (no email)
  - Appointment check-in → Push notification (no email)
  - Appointment completion → Push notification + feedback email

- **Appointment Feedback System:**
  - New `/feedback/:token` page with 5-star rating
  - Rating labels: Poor, Fair, Good, Very Good, Excellent
  - Optional comment field
  - Feedback stored in `appointment_feedback` collection (private)
  - Admin notification on new feedback

- **Email Changes:**
  - Reduced email volume - only for NEW appointments and COMPLETED appointments
  - Completed appointment email includes feedback star rating links

- **Service Worker Updates:**
  - Android banner-style notifications
  - Vibration pattern: [200, 100, 200]
  - Action buttons: View Details, Dismiss
  - Click handling opens relevant URL

### Testing
- 13/13 backend tests passed
- Test file: `/app/tests/test_feedback_notifications.py`

---

## [January 10, 2026] - Loyalty Points System

### Added
- **Staff Portal - Pharmacy:**
  - New "Loyalty Points" tab for pharmacy staff
  - Search registered users by phone number
  - Display user name and current loyalty points
  - Add points (1-500 per transaction) with optional reason
  - Shows "User Not Registered" for unregistered phones

- **Staff Portal - Diagnostics:**
  - New "Loyalty Points" tab for diagnostics staff
  - Same functionality as pharmacy staff
  - Purple-themed UI consistent with diagnostics branding

- **Admin Portal - Loyalty Tab:**
  - Summary cards: Total Credited, Total Redeemed, Net Active Points, Users with Points
  - Search user by phone for redemption
  - Redeem/subtract points with required reason
  - View transaction history per user
  - Top Loyalty Members leaderboard with gold/silver/bronze badges

- **Backend APIs:**
  - `GET /api/loyalty-points/by-phone/{phone}` - Staff access to search users
  - `POST /api/staff/loyalty-points/add` - Staff adds points (max 500)
  - `POST /api/admin/loyalty-points/subtract` - Admin redeems points
  - `GET /api/admin/loyalty-points/summary` - Dashboard statistics
  - `GET /api/admin/loyalty-points/transactions` - Transaction history

- **Database Changes:**
  - `loyalty_points` field added to users collection (default: 0)
  - `loyalty_transactions` collection for audit trail

- **Testing:**
  - 22/22 backend tests passed
  - Test file: `/app/tests/test_loyalty_points.py`

### Fixed
- Admin loyalty summary cards field name mismatch (total_points_credited → total_points_issued)

---

## [January 10, 2026] - Doctor Multi-Clinic Portal

### Added
- Doctors can view appointments from ALL clinics they work at
- Clinic toggle dropdown: "All Clinics", "Pushpa Clinic", "Amnion Clinic"
- Calendar-based navigation with 7-day view and appointment counts
- Patient history modal for doctors to view complete medical records

### Fixed
- Slot synchronization bug - patient bookings (pending status) now correctly block slots

---

## [January 8, 2026] - Core Features

### Added
- OTP-based authentication (mock mode)
- DiaGyn Healthcare - Appointment booking
- Proton Diagnostics - Test booking
- Orange Pharmacy - Medicine ordering (4,266 medicines)
- Admin Dashboard with inventory management
- Staff Portal for clinic, pharmacy, and diagnostics staff
- Email notifications via Resend API
- WhatsApp notification links
