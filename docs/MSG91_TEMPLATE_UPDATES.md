# MSG91 WhatsApp Templates - Ready to Use

## How to Update Templates in MSG91 Dashboard:

1. Login to MSG91: https://control.msg91.com/
2. Go to **WhatsApp > Templates**
3. Click **Create Template** or **Edit** existing template
4. Copy the template body below
5. Submit for approval (24-48 hours)

---

## TEMPLATE 1: DiaGyn Appointment Confirmation

**Template Name:** `diagyn_appointment_confirm_v2`
**Category:** UTILITY
**Language:** English

### Header (Optional - IMAGE)
Upload DiaGyn logo

### Body Text (Copy exactly):
```
🏥 *DiaGyn Healthcare - Appointment Confirmed*

Hi {{1}},

Your appointment has been booked successfully!

📅 *Date:* {{2}}
⏰ *Time:* {{3}}
👨‍⚕️ *Doctor:* {{4}}
🏥 *Clinic:* {{5}}

━━━━━━━━━━━━━━━
🔐 *Your Appointment Code:* {{7}}
━━━━━━━━━━━━━━━
📍 Share this code with clinic staff at check-in
⚠️ Do not share with anyone else
━━━━━━━━━━━━━━━

📋 Booking ID: {{6}}

Need to reschedule? Call +91 9833188288
```

### Variables:
| Variable | Description | Example |
|----------|-------------|---------|
| {{1}} | Patient Name | Rahul Sharma |
| {{2}} | Appointment Date | Monday, 24 Feb 2026 |
| {{3}} | Appointment Time | 10:30 AM |
| {{4}} | Doctor Name | Dr. Vikas Jha |
| {{5}} | Clinic Name | Pushpa Clinic |
| {{6}} | Booking ID | DG-240226-A1B2C3 |
| {{7}} | Appointment Code | 4829 |

---

## TEMPLATE 2: Mango Labs Booking Confirmation

**Template Name:** `mango_lab_confirm_v2`
**Category:** UTILITY
**Language:** English

### Header (Optional - IMAGE)
Upload Mango Health Labs logo

### Body Text (Copy exactly):
```
🧪 *Mango Health Labs - Booking Confirmed*

Hi {{1}},

Your lab test booking is confirmed!

📋 *Tests:* {{2}}
📅 *Date:* {{3}}
⏰ *Time:* {{4}}
📍 *Type:* {{5}}

━━━━━━━━━━━━━━━
🔐 *Your Booking Code:* {{7}}
━━━━━━━━━━━━━━━
🩺 Share this code with phlebotomist before sample collection
⚠️ Do not share with anyone else
━━━━━━━━━━━━━━━

📋 Booking ID: {{6}}

Our phlebotomist will call you to confirm timing.
For queries: +91 9833188288
```

### Variables:
| Variable | Description | Example |
|----------|-------------|---------|
| {{1}} | Patient Name | Priya Patel |
| {{2}} | Test Names | CBC, Lipid Profile, HbA1c |
| {{3}} | Preferred Date | Tuesday, 25 Feb 2026 |
| {{4}} | Preferred Time | 8:00 AM - 10:00 AM |
| {{5}} | Collection Type | Home Collection |
| {{6}} | Booking ID | ML-250226-X1Y2Z3 |
| {{7}} | Booking Code | 5173 |

---

## TEMPLATE 3: Orange Pharmacy Order Confirmation

**Template Name:** `orange_order_confirm_v2`
**Category:** UTILITY
**Language:** English

### Header (Optional - IMAGE)
Upload Orange Pharmacy logo

### Body Text (Copy exactly):
```
📦 *Orange Pharmacy - Order Confirmed*

Hi {{1}},

Your medicine order has been placed!

💊 *Items:* {{2}}
💰 *Total:* ₹{{3}}
📍 *Delivery:* {{5}}

━━━━━━━━━━━━━━━
🔐 *Your Delivery Code:* {{6}}
━━━━━━━━━━━━━━━
🚚 Share this code with delivery person to confirm delivery
⚠️ Do not share with anyone else
━━━━━━━━━━━━━━━

📋 Order ID: {{4}}

Track your order in the Nevika Cura app.
For queries: +91 9833188288
```

### Variables:
| Variable | Description | Example |
|----------|-------------|---------|
| {{1}} | Customer Name | Amit Kumar |
| {{2}} | Items Summary | Metformin 500mg, Paracetamol +2 more |
| {{3}} | Order Total | 450 |
| {{4}} | Order ID | OP-240226-P1Q2R3 |
| {{5}} | Delivery Address | 123 Green Park, Mumbai |
| {{6}} | Delivery Code | 7264 |

---

## Quick Reference - Variable Mapping

### DiaGyn (diagyn_appointment_confirm_v2)
```python
variables = [
    {"type": "text", "text": patient_name},      # {{1}}
    {"type": "text", "text": date},              # {{2}}
    {"type": "text", "text": time},              # {{3}}
    {"type": "text", "text": doctor_name},       # {{4}}
    {"type": "text", "text": clinic_name},       # {{5}}
    {"type": "text", "text": booking_id},        # {{6}}
    {"type": "text", "text": appointment_code},  # {{7}} - NEW
]
```

### Mango Labs (mango_lab_confirm_v2)
```python
variables = [
    {"type": "text", "text": patient_name},      # {{1}}
    {"type": "text", "text": test_names},        # {{2}}
    {"type": "text", "text": date},              # {{3}}
    {"type": "text", "text": time_slot},         # {{4}}
    {"type": "text", "text": collection_type},   # {{5}}
    {"type": "text", "text": booking_id},        # {{6}}
    {"type": "text", "text": booking_code},      # {{7}} - NEW
]
```

### Orange Pharmacy (orange_order_confirm_v2)
```python
variables = [
    {"type": "text", "text": customer_name},     # {{1}}
    {"type": "text", "text": items_summary},     # {{2}}
    {"type": "text", "text": str(order_total)},  # {{3}}
    {"type": "text", "text": order_id},          # {{4}}
    {"type": "text", "text": delivery_address},  # {{5}}
    {"type": "text", "text": delivery_code},     # {{6}} - NEW
]
```

---

## Important Notes:

1. **Template Approval**: Templates take 24-48 hours to be approved by Meta/WhatsApp
2. **Default Code**: Staff can use `0000` if customer didn't receive their code
3. **Character Limits**: Keep variable values concise (test names, addresses)
4. **Header Images**: Optional but recommended for branding

Once templates are approved, let me know and I'll update the backend to use these new templates!
