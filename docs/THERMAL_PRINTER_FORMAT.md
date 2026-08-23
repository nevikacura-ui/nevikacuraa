# Thermal Printer Bill/Token Format Documentation

## Printer: Everycom EC58 (58mm Bluetooth)
- Paper Width: 58mm
- Characters per line: ~32 characters (standard font)
- Protocol: ESC/POS commands over Bluetooth

---

## TOKEN RECEIPT FORMAT

```
================================
       [CLINIC NAME]
      [Clinic Address]
================================

           TOKEN
           [##]
      [BOOKING-ID-XXX]

        [ WALK-IN ]
--------------------------------
Patient:
[PATIENT NAME]
Time Slot: [HH:MM AM/PM]
Date: [DD MMM YYYY]
--------------------------------
Generated: [DD MMM, HH:MM AM/PM]
--------------------------------

    Thank you for choosing
        NEVIKA CURA
================================




```

### Token Data Fields:
| Field | Description | Example |
|-------|-------------|---------|
| clinic | Clinic name | "Pushpa Clinic" |
| clinic_address | Full address | "Naigaon East, Mumbai" |
| token_number | Queue number | 12 |
| booking_id | Reference ID | "PC-A1B2C3" |
| appointment_type | Type badge | "WALK_IN", "EMERGENCY", "SCHEDULED" |
| patient_name | Patient's name | "John Doe" |
| slot_time | Appointment time | "10:30 AM" |
| date | Appointment date | "2026-02-12" |

---

## BILL RECEIPT FORMAT

```
================================
   [CLINIC NAME] CLINIC
      [Clinic Address]
================================
       BILL / RECEIPT
--------------------------------
Date: [DD MMM YYYY] [HH:MM AM/PM]
Ref: [BOOKING-ID]
--------------------------------
Patient:
[PATIENT NAME]
Mobile: [PHONE NUMBER]
--------------------------------

FEES & CHARGES
--------------------------------
[CODE] - [Label]
                       Rs.[AMT]
[SCAN] - [Scan Label]
                       Rs.[AMT]
--------------------------------

TOTAL
Rs. [TOTAL AMOUNT]
================================

Treated by: [Dr. Name]
--------------------------------

    Thank you for choosing
        NEVIKA CURA
       Get well soon!
================================




```

### Bill Data Fields:
| Field | Description | Example |
|-------|-------------|---------|
| clinic | Clinic name | "Pushpa Clinic" |
| clinic_address | Address line | "Naigaon East" |
| booking_id | Reference | "PC-A1B2C3" |
| patient_name | Patient's name | "John Doe" |
| patient_mobile | Contact number | "9876543210" |
| fee_code | Consultation code | "NEW" |
| fee_details | {label, amount} | {label: "New Patient", amount: 500} |
| scan_codes | Array of scans | [{code: "USG", label: "Ultrasound", amount: 800}] |
| total_amount | Total bill | 1300 |
| doctor | Treating doctor | "Dr. Vikas Jha" |

---

## ESC/POS Commands Used

| Command | Hex | Description |
|---------|-----|-------------|
| INIT | ESC @ | Reset printer |
| ALIGN_CENTER | ESC a 1 | Center text |
| ALIGN_LEFT | ESC a 0 | Left align |
| BOLD_ON | ESC E 1 | Enable bold |
| BOLD_OFF | ESC E 0 | Disable bold |
| DOUBLE_HEIGHT | GS ! 0x10 | Double height text |
| DOUBLE_WIDTH | GS ! 0x20 | Double width text |
| DOUBLE_SIZE | GS ! 0x30 | Double height + width |
| NORMAL_SIZE | GS ! 0x00 | Normal text |
| FEED_LINES | ESC d n | Feed n lines |
| CUT_PAPER | GS V 0 | Full paper cut |

---

## Integration Code Location
- **File**: `/app/frontend/src/utils/thermalPrinter.js`
- **Usage**: `import thermalPrinter from '@/utils/thermalPrinter'`

### Methods:
```javascript
// Connect to printer
await thermalPrinter.connect();

// Print token
await thermalPrinter.printToken({
  clinic: "Pushpa Clinic",
  token_number: 5,
  patient_name: "John Doe",
  appointment_type: "WALK_IN",
  slot_time: "10:30 AM",
  date: "2026-02-12",
  booking_id: "PC-12345"
});

// Print bill
await thermalPrinter.printBill({
  clinic: "Pushpa Clinic",
  patient_name: "John Doe",
  patient_mobile: "9876543210",
  fee_code: "NEW",
  fee_details: { label: "New Patient", amount: 500 },
  scan_codes: [{ code: "USG", label: "Ultrasound", amount: 800 }],
  total_amount: 1300,
  doctor: "Dr. Vikas Jha",
  booking_id: "PC-12345"
});
```

---

## Timestamps
All timestamps on receipts are displayed in **IST (Indian Standard Time)**.
