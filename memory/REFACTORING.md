# Refactoring Roadmap — Nevika Cura

## Current State
| File | Lines | Role |
|---|---|---|
| server.py | 2,291 | App setup, middleware, websockets, models, utils, route registration |
| Mango.js | 3,140 | Mango Labs full page (search, filters, booking, orders, tracking) |
| DiaGynStaffPortal.js | 2,872 | Staff portal (queue, billing, patient flow) |
| Admin.js | 2,509 | Super admin dashboard (all verticals) |

## Priority Extractions (Safe)

### Backend — server.py
1. **Shared Models** → `/app/backend/models/orders.py`
   - DiagnosticOrder, DiagnosticOrderCreate, PharmacyOrder, PharmacyOrderCreate
   - **Blocker**: Routes use `from server import ...` — need to update all 8+ files
   - **Risk**: Medium (circular imports)

2. **Booking Utilities** → `/app/backend/utils/booking_utils.py`
   - `generate_booking_id()`, `generate_booking_qr_code()`, `generate_generic_qr_code()`, `generate_booking_email_template()`
   - **Blocker**: `queue_status.py` imports `generate_booking_id` from server
   - **Risk**: Medium

3. **WebSocket Managers** → `/app/backend/utils/websocket_managers.py`
   - SlotConnectionManager, AppointmentConnectionManager, websocket endpoints
   - **Risk**: Low (self-contained)

### Frontend — Safe Component Extraction
1. **Mango.js** → Extract:
   - `MangoSearchBar` component (search + filters)
   - `MangoTestCard` component
   - `MangoOrderTracking` component
   - `MangoBookingModal` component

2. **DiaGynStaffPortal.js** → Extract:
   - `QueueBoard` component (live queue display)
   - `BillingPanel` component
   - `PatientCheckinForm` component

3. **Admin.js** → Extract:
   - `AdminStats` component (overview cards)
   - `AdminAppointmentList` component
   - `AdminOrderManager` component

## Recommended Approach
1. Create shared models file first (lowest risk)
2. Update imports one route file at a time (test after each)
3. Extract frontend components one at a time, keeping old code as fallback
4. Each extraction should be a separate commit/rollback point

## Circular Import Resolution Pattern
```python
# Instead of: from server import generate_booking_id
# Use: lazy import inside function
def some_route():
    from utils.booking_utils import generate_booking_id
    ...
```
