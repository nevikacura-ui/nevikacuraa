# WhatsApp Template: Clinic Switch Notification
## For MSG91 Registration

---

### Template Name: `diagyn_clinic_switch`

### Category: **UTILITY**

### Language: English (en)

---

### Header
**Type:** Text

```
Clinic Change Notice
```

---

### Body

```
Dear {{1}},

This is an important update regarding your upcoming appointment at *Nevika Cura DiaGyn*.

*Appointment Details:*
Booking ID: #{{2}}
Doctor: {{3}}
Date: {{4}}
Session: {{5}}

*Clinic Change:*
Original Clinic: {{6}}
New Clinic: *{{7}}*
Clinic Address: {{8}}

*Reason:* {{9}}

All other details of your appointment remain unchanged. Please visit the updated clinic at the scheduled time.

If you have any questions, please contact our helpline.

Warm regards,
*Nevika Cura DiaGyn*
Your trusted healthcare partner
```

---

### Footer

```
Nevika Cura | nevikacura.com
```

---

### Buttons
| Type | Text | Action |
|------|------|--------|
| URL | View on Map | `{{10}}` |
| PHONE_NUMBER | Call Helpline | `+918108500522` |

---

### Template Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `{{1}}` | Patient Name | Priya Sharma |
| `{{2}}` | Booking ID | APT-2026-0325 |
| `{{3}}` | Doctor Name | Dr. Vikas Jha |
| `{{4}}` | Appointment Date | Tuesday, 25 March 2026 |
| `{{5}}` | Session (Morning/Evening) | Evening (6:00 PM - 10:00 PM) |
| `{{6}}` | Original Clinic Name | Pushpa Clinic |
| `{{7}}` | New (Override) Clinic Name | Amnion Clinic |
| `{{8}}` | New Clinic Address | G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East |
| `{{9}}` | Reason for Change | Doctor scheduling adjustment |
| `{{10}}` | Google Maps URL for new clinic | https://maps.google.com/?q=Amnion+Clinic+Naigaon |

---

### Sample Message Preview

> **Clinic Change Notice**
>
> Dear Priya Sharma,
>
> This is an important update regarding your upcoming appointment at *Nevika Cura DiaGyn*.
>
> *Appointment Details:*
> Booking ID: #APT-2026-0325
> Doctor: Dr. Vikas Jha
> Date: Tuesday, 25 March 2026
> Session: Evening (6:00 PM - 10:00 PM)
>
> *Clinic Change:*
> Original Clinic: Pushpa Clinic
> New Clinic: *Amnion Clinic*
> Clinic Address: G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East
>
> *Reason:* Doctor scheduling adjustment
>
> All other details of your appointment remain unchanged. Please visit the updated clinic at the scheduled time.
>
> If you have any questions, please contact our helpline.
>
> Warm regards,
> *Nevika Cura DiaGyn*
> Your trusted healthcare partner
>
> ---
> Nevika Cura | nevikacura.com
>
> [View on Map] [Call Helpline]

---

### MSG91 Registration Steps

1. Go to MSG91 Dashboard > WhatsApp > Templates
2. Click "Create Template"
3. Template Name: `diagyn_clinic_switch`
4. Category: Utility
5. Language: English
6. Add Header (Text): `Clinic Change Notice`
7. Paste the body text with `{{1}}` through `{{9}}` variables
8. Add Footer: `Nevika Cura | nevikacura.com`
9. Add Buttons:
   - URL Button: "View on Map" with dynamic URL `{{10}}`
   - Phone Button: "Call Helpline" with `+918108500522`
10. Submit for approval (typically 24-48 hours)

---

### Notes
- This template is triggered automatically when a doctor creates a clinic override via the Doctor Portal
- Only patients with existing bookings for the affected date+session receive this notification
- The backend function `send_clinic_switch_whatsapp()` in `msg91_whatsapp.py` handles the API call
- If the template is pending approval, the system falls back to a plain text message via the generic WhatsApp notification function
