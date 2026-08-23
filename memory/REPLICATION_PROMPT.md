# Healthcare Platform — Full Feature Replication Prompt
## For New Emergent Project (Pharmacy + Diagnostics Branch)

---

## OVERVIEW

Build a healthcare platform with **Pharmacy** and **Diagnostics (Lab Tests)** branches. This is a new brand but shares the exact same functional systems as an existing platform. The tech stack, integrations, and core flows must be replicated exactly.

**Tech Stack:** React (Vite) frontend + FastAPI backend + MongoDB
**Integrations:** Cashfree (payments), MSG91 (WhatsApp notifications), Resend (email), OpenAI via Emergent LLM Key

---

## ENVIRONMENT VARIABLES (backend/.env)

```
MONGO_URL=<auto>
DB_NAME=<auto>

# Cashfree Payment Gateway (PRODUCTION)
CASHFREE_CLIENT_ID=1181139f92143ce73f51e8686579311811
CASHFREE_CLIENT_SECRET=cfsk_ma_prod_24f787fb2a60fb9c08817d1209cc49fb_3636981d
CASHFREE_ENVIRONMENT=production

# Resend Email
RESEND_API_KEY=re_ifKCcYXa_CktaqWEx2hzhKHi9rCsQxthS
SENDER_EMAIL="YourBrand <onboarding@resend.dev>"

# MSG91 WhatsApp
MSG91_AUTH_KEY=487196As2GZMEjzz5L696de447P1
MSG91_WHATSAPP_NUMBER=918108888330
```

---

## SYSTEM 1: UNIFIED BOOKING CODE GENERATOR

Every booking/order gets a unique ID in format: `PREFIX-DDMMYY-XXXX`

- PREFIX = 2-letter service + 1-letter source
- DDMMYY = date in IST
- XXXX = random 4-digit code (also serves as verification OTP)

**Service prefixes:**
- Pharmacy: `PH` (or your brand initials)
- Diagnostics: `DX` (or your brand initials)

**Source suffixes:**
- `O` = Online/Web booking
- `W` = WhatsApp chatbot booking
- `C` = Clinic/walk-in/staff entry

Example: `PHO-050426-8921` = Pharmacy Online, April 5 2026, code 8921

**Implementation:** Create `utils/booking_utils.py`:
```python
from datetime import datetime, timezone
import random

async def generate_booking_id(service="pharmacy", source="web", db_instance=None):
    """Generate PREFIX-DDMMYY-XXXX format booking ID."""
    service_map = {"pharmacy": "PH", "diagnostics": "DX"}
    source_map = {"web": "O", "whatsapp": "W", "clinic": "C", "staff": "C"}
    
    prefix = service_map.get(service, "XX") + source_map.get(source, "O")
    ist_offset = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(ist_offset)
    date_part = now.strftime("%d%m%y")
    
    for _ in range(10):  # retry for uniqueness
        code = f"{random.randint(1000, 9999)}"
        booking_id = f"{prefix}-{date_part}-{code}"
        if db_instance:
            exists = await db_instance.appointments.find_one({"booking_id": booking_id})
            if not exists:
                exists2 = await db_instance.pharmacy_orders.find_one({"booking_id": booking_id})
                if not exists2:
                    return booking_id
        else:
            return booking_id
    return f"{prefix}-{date_part}-{random.randint(1000, 9999)}"
```

---

## SYSTEM 2: CASHFREE PAYMENT INTEGRATION

**Install:** `pip install cashfree_pg==4.1.3`

**Pattern:**
1. Frontend sends order details → Backend creates Cashfree order → Returns `payment_session_id`
2. Frontend opens Cashfree checkout JS SDK with session ID
3. User pays → Cashfree redirects to `/payment-success?order_id=xxx`
4. Backend verifies payment status via Cashfree API
5. On success → redirect to Booking Confirmation page

**Backend route (`routes/cashfree.py`):**
```python
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.models.customer_details import CustomerDetails
from cashfree_pg.models.order_meta import OrderMeta
from cashfree_pg.api_client import Cashfree

def init_cashfree():
    client_id = os.environ.get("CASHFREE_CLIENT_ID")
    client_secret = os.environ.get("CASHFREE_CLIENT_SECRET")
    env = os.environ.get("CASHFREE_ENVIRONMENT", "sandbox")
    environment = Cashfree.PRODUCTION if env == "production" else Cashfree.SANDBOX
    return Cashfree(XEnvironment=environment, XClientId=client_id, XClientSecret=client_secret)

API_VERSION = "2023-08-01"

@router.post("/create-order")
async def create_order(request: CashfreeOrderRequest):
    cashfree = init_cashfree()
    customer = CustomerDetails(
        customer_id=request.customer_id,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone
    )
    order_meta = OrderMeta(
        return_url=f"{os.environ.get('FRONTEND_URL')}/payment-success?order_id={{order_id}}"
    )
    order = CreateOrderRequest(
        order_id=f"order_{uuid4()[:12]}",
        order_amount=request.amount,
        order_currency="INR",
        customer_details=customer,
        order_meta=order_meta
    )
    response = cashfree.PGCreateOrder(API_VERSION, order)
    return {"payment_session_id": response.data.payment_session_id, "order_id": response.data.order_id}

@router.get("/verify/{order_id}")
async def verify_payment(order_id: str):
    cashfree = init_cashfree()
    response = cashfree.PGOrderFetchPayments(API_VERSION, order_id)
    # Check payment status, update order in DB
```

**Frontend Cashfree SDK:**
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```
```javascript
const cashfree = await load({ mode: "production" });
const checkoutOptions = { paymentSessionId, returnUrl: `${API}/payment-success?order_id={order_id}` };
cashfree.checkout(checkoutOptions);
```

---

## SYSTEM 3: CHECKOUT FLOW

### Pharmacy Checkout
1. Cart page → user reviews items (name, qty, MRP, price)
2. Select payment: COD or Online (Cashfree)
3. Enter delivery address, phone, name
4. If COD → create order directly in `pharmacy_orders` collection → show Booking Confirmation
5. If Online → create Cashfree order → redirect to payment → on success → Booking Confirmation

### Diagnostics Checkout
1. Cart page → user reviews selected tests (name, price)
2. Select collection mode: Home Collection or Visit Lab
3. Select date + time slot
4. Enter patient details
5. If free → create order directly → Booking Confirmation
6. If paid → Cashfree flow → Booking Confirmation

**MongoDB Collections:**
```javascript
// pharmacy_orders
{
  booking_id: "PHO-050426-1234",
  patient_name: "Raj Sharma",
  patient_phone: "9876543210",
  items: [{name: "Paracetamol 500mg", qty: 2, price: 15, mrp: 20}],
  total_amount: 850,
  delivery_charge: 49,
  payment_method: "cod", // or "online"
  status: "confirmed", // confirmed → packed → shipped → delivered
  delivery_address: "Flat 301, Building A",
  created_at: ISODate(),
  store: "your_pharmacy"
}

// diagnostic_orders
{
  booking_id: "DXO-050426-5678",
  patient_name: "Raj Sharma",
  patient_phone: "9876543210",
  tests: [{name: "CBC Complete", price: 500}, {name: "Thyroid Profile", price: 800}],
  total_amount: 1300,
  collection_type: "home", // or "lab"
  preferred_date: "2026-04-10",
  time_slot: "09:00 AM - 11:00 AM",
  status: "confirmed", // confirmed → sample_collected → processing → report_ready
  created_at: ISODate()
}
```

---

## SYSTEM 4: BOOKING CONFIRMATION (Dark Boarding Pass)

After successful booking, show a premium animated confirmation page:

**Design:** Dark theme (#1a1a1a cards on #f0f0f0 background), two-card layout:

**Card 1 — Route Header:**
- Dark gradient background with dot texture
- Brand logo + name (left), Booking ID in accent color (right)
- Patient shortname ↔ Destination shortname with brand logo centered
- Date + Time strip at bottom (white text)

**Card 2 — Details + Barcode:**
- Service icon + Patient/Doctor name + "CONFIRMED" badge
- Live indicator with appointment/delivery info
- Platform-specific detail rows (tests for diagnostics, medicines for pharmacy)
- 4-column info grid (Date, Time, Type/Collection, Fees/Total)
- Tear-line separator (circle cutouts)
- Booking ID reference + Copy button
- CODE128 barcode (use `react-barcode` library)
- Instruction text

**CTA Buttons:**
- Diagnostics: `[Add to Calendar]` + `[Download Invoice]`
- Pharmacy: `[Download Invoice]`
- Both: `[Save Photo]` `[Share It]` (side by side)

**Features:**
- Splash animation (2.2s) using an animated status component
- Confetti burst after splash (use `canvas-confetti`)
- Copy booking ID to clipboard
- Share via WhatsApp (with card image using `html2canvas`)
- Save as PNG image
- Add to Google Calendar (generates calendar URL)

**Libraries:** `react-barcode`, `canvas-confetti`, `html2canvas`
**Fonts:** DM Sans + DM Mono (Google Fonts)

---

## SYSTEM 5: ORDER SUMMARY (Downloadable Invoice)

When user clicks "Download Invoice", show an overlay with a white-background professional bill:

**Layout:**
- Header: Brand logo (left) + "Order Summary" title (right) + Order ID
- Customer info: Name, Phone, Date, Payment method, Address (pharmacy)
- Items table: Sr No, Item Name, Qty (pharmacy), MRP (pharmacy), Amount
- Summary: Subtotal, Delivery Charges (pharmacy), Total
- Disclaimer: "This is a provisional order summary. Final invoice will be sent with your order delivery/after sample collection."
- Footer: Brand logo + tagline

**Download:** Use `html2canvas` to convert the overlay to PNG and trigger download.

---

## SYSTEM 6: MSG91 WHATSAPP NOTIFICATIONS

**Install:** `pip install requests` (MSG91 uses HTTP API, no SDK)

**Pattern:**
```python
import requests

def send_msg91_whatsapp(phone, template_name, variables):
    url = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/"
    headers = {
        "authkey": os.environ.get("MSG91_AUTH_KEY"),
        "Content-Type": "application/json"
    }
    payload = {
        "integrated_number": os.environ.get("MSG91_WHATSAPP_NUMBER"),
        "content_type": "template",
        "payload": {
            "messaging_product": "whatsapp",
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "en", "policy": "deterministic"},
                "namespace": "your_namespace",
                "to_and_components": [{
                    "to": [f"91{phone}"],
                    "components": {
                        "body_1": {"type": "text", "value": variables.get("body_1", "")},
                        "body_2": {"type": "text", "value": variables.get("body_2", "")},
                        # ... up to body_N based on template
                    }
                }]
            }
        }
    }
    response = requests.post(url, json=payload, headers=headers)
    return response.json()
```

**When to send notifications:**
- Booking confirmed → send confirmation with booking ID, date, time
- Status update → send status change (e.g., "Your order is packed")
- Reminder → send 2hrs before appointment

**Templates needed (must be pre-approved in MSG91/Meta):**
- `appointment_confirmation` — patient_name, booking_id, doctor, date, time
- `lab_booking_confirmation` — patient_name, booking_id, tests, date
- `pharmacy_order_confirmation` — patient_name, order_id, items, total
- `status_update` — patient_name, booking_id, new_status

---

## SYSTEM 7: RESEND EMAIL NOTIFICATIONS

**Install:** `pip install resend==2.19.0`

**Pattern:**
```python
import resend
import asyncio

resend.api_key = os.environ.get("RESEND_API_KEY")

async def send_confirmation_email(email, subject, html_content):
    sender = os.environ.get("SENDER_EMAIL", "Brand <onboarding@resend.dev>")
    result = await asyncio.to_thread(
        resend.Emails.send,
        {"from": sender, "to": [email], "subject": subject, "html": html_content}
    )
    return result
```

**Email Templates:** Create dark-themed HTML email templates matching the booking confirmation cards:
- Table-based layout (email clients don't support flexbox)
- Inline CSS only
- Route card + Details card + Notice card + CTA button + Footer
- Platform-specific accent colors and content

**When to send:**
- POST `/api/send-booking-email` with `{email, type, patient_name, booking_id, ...}`
- Triggered after booking creation

---

## SYSTEM 8: STAFF PORTAL

Two separate staff portals:

### Pharmacy Staff Portal
- View all incoming orders (sorted by newest)
- Update order status: Confirmed → Packed → Shipped → Delivered
- Search orders by booking ID, patient name, phone
- View order details (items, amounts, address)
- Cancel orders with reason
- Daily summary stats (total orders, revenue, pending)

### Diagnostics Staff Portal
- View all lab bookings (sorted by date)
- Update status: Confirmed → Sample Collected → Processing → Report Ready
- Upload lab reports (PDF)
- Home collection scheduling
- Search bookings by ID, patient, test name
- Assign phlebotomist for home collections

**Key API Endpoints:**
```
# Pharmacy Staff
GET  /api/staff/pharmacy/orders?status=confirmed&date=2026-04-05
PUT  /api/staff/pharmacy/orders/{id}/status  {status: "packed"}
GET  /api/staff/pharmacy/orders/{id}

# Diagnostics Staff
GET  /api/staff/diagnostics/bookings?date=2026-04-05
PUT  /api/staff/diagnostics/bookings/{id}/status  {status: "sample_collected"}
POST /api/staff/diagnostics/bookings/{id}/upload-report  (multipart/form-data)
```

---

## SYSTEM 9: CART SYSTEM

Use React Context (`CartContext.js`) with localStorage persistence:

```javascript
const CartContext = createContext();

// Two separate carts
const [pharmacyCart, setPharmacyCart] = useState([]); // [{id, name, price, mrp, quantity, form, image_url}]
const [labCart, setLabCart] = useState([]);             // [{name, price, parameters}]

// Functions: addToPharmacyCart, removeFromPharmacyCart, updateQuantity, clearCart
// Functions: addToLabCart, removeFromLabCart, clearLabCart

// Persist to localStorage
useEffect(() => {
    localStorage.setItem('pharmacyCart', JSON.stringify(pharmacyCart));
    localStorage.setItem('labCart', JSON.stringify(labCart));
}, [pharmacyCart, labCart]);
```

**Cart Page Features:**
- Show items with +/- quantity controls
- Subtotal, delivery charges, total calculation
- "Before you checkout" suggestions (context-aware: show tests when lab cart, medicines when pharmacy cart)
- Proceed to Checkout button
- Clicking on cart item navigates to product page

---

## SYSTEM 10: PATIENT DASHBOARD WITH ACTIVE TRACKING

**Active Tracking Section** — placed at TOP of patient dashboard, below greeting:

- Fetches all active orders/appointments for the logged-in patient (by phone)
- Shows step-by-step progress tracker:
  - Pharmacy: Confirmed → Packed → Shipped → Delivered
  - Diagnostics: Confirmed → Sample Collected → Processing → Report Ready
- Cancel button on "Confirmed" status items (with confirmation modal)
- Color-coded status badges

**API:** `GET /api/patient/active-orders?phone=9876543210`
Returns array of active appointments + orders with current status.

---

## SYSTEM 11: PAYMENT SUCCESS PAGE

After Cashfree payment redirect:
1. Extract `order_id` from URL params
2. Call `GET /api/cashfree/verify/{order_id}` to confirm payment
3. Show success animation
4. "View Booking Pass" button → navigates to `/booking-confirmation?type=pharmacy|diagnostics&bookingId=xxx&...params`

---

## SYSTEM 12: MY ORDERS / ORDER HISTORY

**Page:** `/my-orders`
- Fetch orders by patient phone: `GET /api/orders/my-orders?phone=xxx`
- Show pharmacy orders + lab bookings in tabs
- Each order card: Booking ID, Date, Status badge, Items summary, Total
- Click → expand details

---

## SYSTEM 13: WHATSAPP AI CHATBOT BOOKING

Simple API for MSG91 chatbot to create bookings:

```
GET /api/chatbot/book-simple?patient_name=X&patient_phone=Y&doctor=Z&date=D&time_slot=T
```
- Generates booking with `W` source suffix (e.g., `PHW-050426-1234`)
- Returns plain text confirmation (not JSON) for WhatsApp display
- Also supports `/api/chatbot/labs`, `/api/chatbot/pharmacy` for those flows

---

## KEY MONGODB COLLECTIONS

```
medicines          — Product catalog (pharmacy)
diagnostic_tests   — Test catalog (lab)
pharmacy_orders    — Pharmacy order records
diagnostic_orders  — Lab booking records
appointments       — Doctor appointment records (if applicable)
patients           — Patient profiles (name, phone, email)
api_cache          — Optional server-side cache
```

---

## FRONTEND LIBRARIES TO INSTALL

```
yarn add react-barcode canvas-confetti html2canvas sonner lucide-react axios
```

## BACKEND LIBRARIES TO INSTALL

```
pip install cashfree_pg==4.1.3 resend==2.19.0 requests motor python-dotenv
```

---

## IMPORTANT NOTES

1. **All MongoDB responses must exclude `_id`** — use `{"_id": 0}` in projections or convert ObjectId to string
2. **Use `datetime.now(timezone.utc)`** not `datetime.utcnow()` 
3. **Cashfree is in PRODUCTION mode** — real payments will be processed
4. **MSG91 templates must be pre-approved** by Meta before use — plan template submission early
5. **Resend free tier** has daily email limits — plan accordingly
6. **Priority system for products**: `priority: 2` (premium) → `priority: 1` (standard) → no priority (generic). Sort all product queries by `[("priority", -1), ("name", 1)]`

---

## BUILD ORDER (Recommended)

1. **Phase 1:** MongoDB setup + Product catalog + Browse/Search APIs
2. **Phase 2:** Cart system + Checkout flow (COD first)
3. **Phase 3:** Cashfree payment integration
4. **Phase 4:** Booking Confirmation (dark boarding pass + animations)
5. **Phase 5:** Order Summary / Invoice download
6. **Phase 6:** Staff Portals (pharmacy + diagnostics)
7. **Phase 7:** Resend email confirmations
8. **Phase 8:** MSG91 WhatsApp notifications
9. **Phase 9:** Patient Dashboard + Active Tracking + My Orders
10. **Phase 10:** WhatsApp AI Chatbot booking

Each phase should be independently testable before moving to the next.
