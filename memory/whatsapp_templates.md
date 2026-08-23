# MSG91 WhatsApp Templates - Nevika Cura

## NEW: Patient Check-in Notification

### Template Name: `patient_checkin`

**Purpose:** Sent automatically when staff checks in a patient at the clinic reception.

**Sample Message:**
```
Hi {{patient_name}}! 

✅ You've been checked in successfully.

🎫 Your Token: {{token_number}}
👨‍⚕️ Doctor: {{doctor_name}}
🏥 Clinic: {{clinic_name}}

Please have a seat in the waiting area. You'll be called when the doctor is ready to see you.

Thank you for choosing DiaGyn Healthcare!
```

**Variables:**
| Variable | Description | Example |
|----------|-------------|---------|
| `{{patient_name}}` | Patient's name | Rahul Sharma |
| `{{token_number}}` | Assigned token | S001, W002, E001 |
| `{{doctor_name}}` | Doctor's name | Dr. Vikas Jha |
| `{{clinic_name}}` | Clinic location | Pushpa Clinic |

**Token Prefixes:**
- `S` = Scheduled appointment
- `W` = Walk-in
- `E` = Emergency

---

## Existing Templates

### 1. `document_delivery`
For sending prescriptions, invoices, and reports.

**Variables:**
- `{{patient_name}}`
- `{{document_type}}` - Prescription/Invoice/Report
- `{{from_name}}` - Doctor name or Nevika Cura
- `{{download_url}}`
- `{{reference_id}}`

### 2. `order_cancelled`
For order cancellation notifications.

**Variables:**
- `{{patient_name}}`
- `{{order_type}}` - Medicine Order/Lab Test/Appointment
- `{{order_id}}`
- `{{reason}}`

### 3. `refund_initiated`
For refund notifications.

**Variables:**
- `{{patient_name}}`
- `{{amount}}`
- `{{order_id}}`
- `{{refund_method}}`

### 4. Orange Pharmacy Templates

#### `orange_order_confirmed`
```
Hi {{patient_name}}! Your order #{{order_id}} is confirmed.
Items: {{items}}
Estimated delivery: {{estimated_time}}
```

#### `orange_order_packed`
```
Great news {{patient_name}}! Your order #{{order_id}} is packed and ready.
Total: {{total_amount}}
Payment: {{payment_status}}
```

#### `orange_order_dispatched`
```
{{patient_name}}, your order #{{order_id}} is out for delivery!
Delivery partner: {{delivery_partner}}
ETA: {{estimated_arrival}}
Contact: {{contact_number}}
```

#### `orange_order_delivered`
```
{{patient_name}}, your order #{{order_id}} has been delivered at {{delivered_time}}.
Invoice: {{invoice_url}}
Thank you for choosing Orange Pharmacy!
```

---

## How to Add Templates in MSG91

1. Login to MSG91 Dashboard
2. Go to WhatsApp > Templates
3. Create new template with:
   - Template Name: `patient_checkin`
   - Category: Utility
   - Language: English
4. Add the message body with variables in `{{variable}}` format
5. Submit for approval (usually 24-48 hours)

---

*Last Updated: February 23, 2026*

---

## Mango Health Labs Templates

### 5. `mango_booking_confirmed`
```
Hi {{patient_name}}!

Your lab booking #{{booking_id}} is confirmed.

Tests: {{test_names}}
Date: {{booking_date}}
Time: {{booking_time}}
Collection: {{collection_type}}

{{#if home_collection}}
Our phlebotomist will call 30 mins before arrival.
{{/if}}

Thank you for choosing Mango Health Labs!
```

**Variables:**
| Variable | Description | Example |
|----------|-------------|---------|
| `{{patient_name}}` | Patient's name | Rahul Sharma |
| `{{booking_id}}` | Booking reference | MNG-20260328-001 |
| `{{test_names}}` | Comma-separated test names | CBC, Thyroid Panel |
| `{{booking_date}}` | Preferred date | March 29, 2026 |
| `{{booking_time}}` | Preferred time slot | 7:00 AM - 9:00 AM |
| `{{collection_type}}` | Home/Center | Home Collection |

### 6. `mango_sample_collected`
```
Hi {{patient_name}}!

Sample for booking #{{booking_id}} has been collected.

Tests: {{test_names}}
Reports expected: {{report_time}}

You'll receive your reports via email and WhatsApp.
```

### 7. `mango_report_ready`
```
Hi {{patient_name}}!

Your lab report is ready!

Tests: {{test_names}}
Download: {{report_url}}
Reference: {{booking_id}}

Need help understanding your results? Book a free doctor consultation at Nevika Cura.
```

---

*Last Updated: March 28, 2026*
