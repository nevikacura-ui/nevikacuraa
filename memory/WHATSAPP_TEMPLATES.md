# WhatsApp Templates & Triggers - Nevika Cura

## Registered Templates (MSG91)

### 1. DiaGyn (Clinic Appointments)

| Template Name | Trigger Point | Variables |
|--------------|---------------|-----------|
| `diagyn_appointment_confirm` | After booking confirmed | patient_name, doctor, date, time, clinic, booking_id |
| `diagyn_appointment_reminder` | Day before appointment | patient_name, doctor, date, time, clinic |
| `diagyn_one_hour_reminder` | 1 hour before appointment | patient_name, doctor, time, clinic, map_url |
| `diagyn_walkin_emergency` | Walk-in emergency booking | patient_name, doctor, clinic, time |
| `diagyn_appointment_completed` | After consultation | patient_name, doctor, rating_link |

### 2. Orange Pharmacy (Medicine Orders)

| Template Name | Trigger Point | Variables |
|--------------|---------------|-----------|
| `orange_pharmacy_confirm` | After order placed | patient_name, order_id, items, amount |
| `orange_order_confirmed` | Staff confirms order | patient_name, order_id, expected_time |
| `orange_order_packed` | Order packed | patient_name, order_id |
| `orange_order_dispatched` | Out for delivery | patient_name, order_id, tracking_link |
| `orange_order_delivered` | Delivered | patient_name, order_id |

### 3. Mango Health Labs (Diagnostic Tests)

| Template Name | Trigger Point | Variables |
|--------------|---------------|-----------|
| `proton_lab_confirm` | After booking | patient_name, test_name, date, time, collection_type |
| `mango_sample_collected` | Sample collected | patient_name, booking_id, tests |
| `mango_processing` | Lab processing | patient_name, booking_id, estimated_time |
| `mango_reports_ready` | Reports ready | patient_name, booking_id, tests, report_url |
| `proton_report_delivered` | Reports sent | patient_name, booking_id, test_name |
| `proton_sonography_confirm` | Sonography booked | patient_name, date, time, doctor |

### 4. Payment Templates

| Template Name | Trigger Point | Variables |
|--------------|---------------|-----------|
| `payment_link_reminder` | Pay Later orders, status=Ready | customer_name, order_id, amount, payment_link |

### 5. Unified Document Delivery (NEW)

| Template Name | Trigger Point | Variables |
|--------------|---------------|-----------|
| `document_delivery` | Prescription/Invoice/Report sent | patient_name, document_type, from_name, download_url |

---

## Templates You Need to Register in MSG91

### Already Registered (Assumed Working):
- All DiaGyn templates ✅
- All Orange Pharmacy templates ✅
- All Mango Labs templates ✅
- Payment link reminder ✅

### NEW Template to Register:

**Template Name:** `document_delivery`
**Category:** Utility
**Language:** English

**Body:**
```
Hi {{1}},

Your {{2}} from {{3}} is ready!

📥 Download: {{4}}

For queries: 9833188288
- Nevika Cura
```

**Variables:**
- {{1}} = patient_name
- {{2}} = document_type (Prescription/Invoice/Lab Report)
- {{3}} = from_name (Doctor name or service name)
- {{4}} = download_url

---

**Template Name:** `order_cancelled`
**Category:** Utility
**Language:** English

**Body:**
```
Hi {{1}},

Your {{2}} booking #{{3}} has been cancelled.

Need help? Call 9833188288
- Nevika Cura
```

**Variables:**
- {{1}} = patient_name (e.g., "Rahul Sharma")
- {{2}} = service_name (e.g., "DiaGyn" / "Orange Pharmacy" / "Mango Labs")
- {{3}} = order_id (e.g., "ORD-2024-001" / "APT-1234")

---

**Template Name:** `refund_initiated`
**Category:** Utility
**Language:** English

**Body:**
```
Hi {{1}},

Refund of {{2}} for your {{3}} order #{{4}} has been initiated.

Expected: {{5}}

Questions? 9833188288
- Nevika Cura
```

**Variables:**
- {{1}} = patient_name
- {{2}} = amount (₹500 / $30)
- {{3}} = service_name
- {{4}} = order_id
- {{5}} = refund_timeline (3-5 business days)

---

## Trigger Flow Summary

### Pharmacy Order Flow:
1. **Order Placed** → `orange_pharmacy_confirm`
2. **Staff Confirms** → `orange_order_confirmed`
3. **Order Packed** → `orange_order_packed`
4. **Pay Later + Ready** → `payment_link_reminder`
5. **Dispatched** → `orange_order_dispatched`
6. **Delivered** → `orange_order_delivered`

### Lab Test Flow:
1. **Booking Confirmed** → `proton_lab_confirm`
2. **Sample Collected** → `mango_sample_collected`
3. **Processing** → `mango_processing`
4. **Reports Ready** → `mango_reports_ready`

### Clinic Appointment Flow:
1. **Booking Confirmed** → `diagyn_appointment_confirm`
2. **Day Before** → `diagyn_appointment_reminder` (via scheduler)
3. **1 Hour Before** → `diagyn_one_hour_reminder` (via scheduler)
4. **After Consultation** → `diagyn_appointment_completed`
5. **Prescription Sent** → `document_delivery` (via doctor portal)

---

## Missing Templates (Optional Enhancements)

1. **Order Cancellation** - When order is cancelled
2. **Refund Initiated** - Payment refund notification
3. **Appointment Rescheduled** - When patient reschedules
4. **Medicine Reminder** - Daily medicine intake reminder (future feature)
5. **Subscription Renewal** - Monthly subscription reminder (future feature)
