# MSG91 WhatsApp Templates for Nevika Cura

This document contains the WhatsApp message templates that need to be registered in MSG91 for order status notifications.

---

## Orange Pharmacy Templates

### 1. orange_order_confirmed
**Purpose**: Sent when pharmacy order is confirmed

**Template Name**: `orange_order_confirmed`

**Message Content**:
```
Hi {{1}}! 🧡

Your order #{{2}} has been confirmed at Orange Pharmacy.

📦 Items: {{3}}

⏰ Estimated delivery: {{4}}

Our pharmacist will call you shortly to confirm medicine availability and final bill.

Track your order: nevikacura.com/track

Thank you for choosing Orange Pharmacy!
```

**Variables**:
- {{1}} - Customer Name
- {{2}} - Order ID
- {{3}} - Items ordered (comma separated)
- {{4}} - Estimated delivery time (e.g., "Today, 4-6 PM")

---

### 2. orange_order_packed
**Purpose**: Sent when order is packed and ready for dispatch

**Template Name**: `orange_order_packed`

**Message Content**:
```
Hi {{1}}! 📦

Great news - your order #{{2}} is packed and ready!

💰 Total Amount: {{3}}
💳 Payment: {{4}}

Our delivery partner will pick it up shortly and it will be on its way to you.

Track your order: nevikacura.com/track
```

**Variables**:
- {{1}} - Customer Name
- {{2}} - Order ID
- {{3}} - Total Amount (e.g., "₹450")
- {{4}} - Payment Status (e.g., "Paid" / "Cash on Delivery" / "Pay via Link")

---

### 3. orange_order_dispatched
**Purpose**: Sent when order is out for delivery

**Template Name**: `orange_order_dispatched`

**Message Content**:
```
Hi {{1}}! 🚴

Your order #{{2}} is on the way!

🛵 Delivery by: {{3}}
⏰ Arriving in: {{4}}
📞 Contact: {{5}}

Please keep your payment ready if Cash on Delivery.

Track your order: nevikacura.com/track
```

**Variables**:
- {{1}} - Customer Name
- {{2}} - Order ID
- {{3}} - Delivery Partner Name
- {{4}} - Estimated Arrival Time (e.g., "30-45 mins")
- {{5}} - Delivery Contact Number

---

### 4. orange_order_delivered (Existing)
**Purpose**: Sent when order is successfully delivered

**Template Name**: `orange_order_delivered`

**Message Content**:
```
Hi {{1}}! ✅

Your order #{{2}} has been delivered successfully!

🕐 Delivered at: {{3}}
🧾 Invoice: {{4}}

Thank you for choosing Orange Pharmacy!
Rate us: ⭐⭐⭐⭐⭐
```

**Variables**:
- {{1}} - Customer Name
- {{2}} - Order ID
- {{3}} - Delivery Time
- {{4}} - Invoice URL

---

## Mango Health Labs Templates

### 1. mango_sample_collected
**Purpose**: Sent when phlebotomist collects the sample

**Template Name**: `mango_sample_collected`

**Message Content**:
```
Hi {{1}}! 🧪

Your sample for booking #{{2}} has been collected.

🔬 Tests: {{3}}
👨‍⚕️ Collected by: {{4}}
🕐 Time: {{5}}

Your sample is being transported to our NABL certified lab for analysis.

📊 Reports expected within 6-24 hours.

Track your booking: nevikacura.com/track
```

**Variables**:
- {{1}} - Patient Name
- {{2}} - Booking ID
- {{3}} - Test Names (comma separated)
- {{4}} - Phlebotomist Name
- {{5}} - Collection Time

---

### 2. mango_processing
**Purpose**: Sent when sample processing begins in the lab

**Template Name**: `mango_processing`

**Message Content**:
```
Hi {{1}}! 🔬

Your tests for booking #{{2}} are now being processed in our state-of-the-art lab.

🧪 Tests: {{3}}
⏰ Expected completion: {{4}}

We'll notify you as soon as your reports are ready!

Track your booking: nevikacura.com/track
```

**Variables**:
- {{1}} - Patient Name
- {{2}} - Booking ID
- {{3}} - Test Names
- {{4}} - Expected Completion Time (e.g., "Today by 6 PM")

---

### 3. mango_reports_ready
**Purpose**: Sent when reports are ready for download

**Template Name**: `mango_reports_ready`

**Message Content**:
```
Hi {{1}}! 📋

Great news - your reports for booking #{{2}} are ready!

🔬 Tests: {{3}}

📥 Download your reports: {{4}}

For any queries about your results, please consult your doctor.

Thank you for choosing Mango Health Labs! 🥭
```

**Variables**:
- {{1}} - Patient Name
- {{2}} - Booking ID
- {{3}} - Test Names
- {{4}} - Report Download URL

---

## Template Registration Instructions

### For MSG91 Portal:

1. Login to MSG91 Control Panel
2. Go to WhatsApp > Templates
3. Create new template with:
   - **Category**: Utility / Transactional
   - **Language**: English
   - **Header**: None (or optional image for branding)
   - **Body**: Copy the message content above
   - **Footer**: Optional
   - **Buttons**: Optional (Track Order / Download Report)

### Variable Format:
- Use `{{1}}`, `{{2}}`, etc. for variables
- Each variable should be marked as "Text" type
- Variables should match the order specified above

### Sample Variables for Testing:
```json
{
  "orange_order_confirmed": ["Rahul", "ORD001", "Paracetamol 500mg, Crocin", "Today, 4-6 PM"],
  "orange_order_packed": ["Rahul", "ORD001", "₹450", "Cash on Delivery"],
  "orange_order_dispatched": ["Rahul", "ORD001", "Amit", "30-45 mins", "9876543210"],
  "mango_sample_collected": ["Priya", "LAB001", "CBC, Thyroid Profile", "Raj Kumar", "10:30 AM"],
  "mango_processing": ["Priya", "LAB001", "CBC, Thyroid Profile", "Today by 6 PM"],
  "mango_reports_ready": ["Priya", "LAB001", "CBC, Thyroid Profile", "https://nevikacura.com/report/LAB001"]
}
```

---

## Integration Notes

### Backend Functions (in msg91_whatsapp.py):
- `send_orange_order_confirmed()` - Call when order status changes to "confirmed"
- `send_orange_order_packed()` - Call when order status changes to "packing"
- `send_orange_order_dispatched()` - Call when order status changes to "out_for_delivery"
- `send_orange_order_delivered()` - Call when order status changes to "delivered"
- `send_mango_sample_collected()` - Call when status changes to "sample_collected"
- `send_mango_processing()` - Call when status changes to "processing"
- `send_mango_reports_ready()` - Call when status changes to "reports_ready"

### Status Flow:

**Orange Pharmacy**:
```
Order Placed → Confirmed → Packing → Out for Delivery → Delivered
     ↓            ↓           ↓             ↓              ↓
   (auto)    (confirm)    (packed)    (dispatched)    (delivered)
```

**Mango Health Labs**:
```
Booking Confirmed → Sample Collected → Processing → Reports Ready
        ↓                  ↓               ↓              ↓
    (confirm)       (collected)      (processing)    (ready)
```
