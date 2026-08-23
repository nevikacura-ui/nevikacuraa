# WhatsApp Message Templates - Nevika Cura

These are the **copy-paste ready** templates to create in MSG91. The Booking ID is now the verification code.

---

## 1. DiaGyn Appointment Confirmation
**Template Name:** `diagyn_appointment_confirm`
**Variables:** {{1}} patient_name, {{2}} date, {{3}} time, {{4}} doctor_name, {{5}} clinic_name, {{6}} booking_id, {{7}} address

**Message:**
```
✅ *Appointment Confirmed!*

Hello {{1}},

Your appointment is booked:
📅 Date: {{2}}
⏰ Time: {{3}}
👨‍⚕️ Doctor: {{4}}
🏥 Clinic: {{5}}
📍 Address: {{7}}

🎫 *Your Booking ID: {{6}}*

📌 Show your Booking ID to the clinic staff at check-in.
⚠️ Do not share with anyone else.

Thank you for choosing Nevika Cura! 🙏
```

---

## 2. Mango Labs Confirmation  
**Template Name:** `proton_lab_confirm`
**Variables:** {{1}} patient_name, {{2}} tests, {{3}} preferred_date, {{4}} preferred_time, {{5}} booking_id, {{6}} address

**Message:**
```
✅ *Lab Test Booking Confirmed!*

Hello {{1}},

Your lab tests are booked:
📋 Tests: {{2}}
📅 Preferred Date: {{3}}
⏰ Preferred Time: {{4}}
📍 Address: {{6}}

🎫 *Your Booking ID: {{5}}*

📌 Tell your Booking ID to the phlebotomist before sample collection.
⚠️ Do not share with anyone else.

Our team will contact you to confirm your slot. Thank you! 🙏
```

---

## 3. Orange Pharmacy Confirmation
**Template Name:** `orange_pharmacy_confirm`
**Variables:** {{1}} patient_name, {{2}} order_id, {{3}} items, {{4}} delivery_address

**Message:**
```
✅ *Order Confirmed!*

Hello {{1}},

Your medicine order is confirmed:
📋 Order ID: {{2}}
💊 Items: {{3}}
📍 Delivery Address: {{4}}

🎫 *Your Booking ID: {{2}}*

📌 Tell your Booking ID to the delivery person when receiving your order.
⚠️ Do not share with anyone else.

Our pharmacist will call to confirm your order. Thank you! 🙏
```

---

## Instructions for MSG91 Setup

1. Go to MSG91 Dashboard → WhatsApp → Templates
2. Create new template with the above names
3. Set language: English
4. Set category: UTILITY
5. Add the variables {{1}}, {{2}}, etc. as shown
6. Submit for approval

**Important Notes:**
- The Booking ID is a 4-digit random number
- Staff can use `0000` as an override code if customer forgets
- The Booking ID IS the verification code - no separate code needed
