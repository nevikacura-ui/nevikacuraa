# Unified WhatsApp Template for Nevika Cura
## Document Delivery Template (MSG91)

### Template Name: `document_delivery`

### Purpose
A unified template for sending any type of document (prescription, invoice, lab report) to patients via WhatsApp.

### Template Format
```
Hi {{1}},

Your {{2}} from {{3}} is ready!

Download: {{4}}

For queries: 9833188288
- Nevika Cura
```

### Variables
| Variable | Description | Example |
|----------|-------------|---------|
| {{1}} | Patient Name | "Rahul Sharma" |
| {{2}} | Document Type | "Prescription" / "Invoice" / "Lab Report" |
| {{3}} | From Name | "Dr. Vikas Jha" / "Nevika Cura" |
| {{4}} | Download URL | "https://nevikacura.com/download/xyz" |

### Usage Examples

#### 1. Prescription Delivery
```json
{
  "patient_name": "Rahul Sharma",
  "document_type": "Prescription",
  "from_name": "Dr. Vikas Jha",
  "download_url": "https://api.nevikacura.com/api/teleconsult/prescription/download/prescription_12345.pdf"
}
```
**Output:**
```
Hi Rahul Sharma,

Your Prescription from Dr. Vikas Jha is ready!

Download: https://api.nevikacura.com/api/teleconsult/prescription/download/prescription_12345.pdf

For queries: 9833188288
- Nevika Cura
```

#### 2. Invoice Delivery
```json
{
  "patient_name": "Priya Patel",
  "document_type": "Invoice",
  "from_name": "Orange Pharmacy",
  "download_url": "https://api.nevikacura.com/api/invoice/download/INV-2024-001.pdf"
}
```

#### 3. Lab Report Delivery
```json
{
  "patient_name": "Amit Kumar",
  "document_type": "Lab Report",
  "from_name": "Mango Health Labs",
  "download_url": "https://api.nevikacura.com/api/reports/download/LB-2024-001.pdf"
}
```

### API Endpoint

**POST** `/api/teleconsult/prescription/upload`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prescription_image | File | Yes | Image file of the prescription |
| appointment_id | String | Yes | Appointment/Booking ID |
| patient_name | String | Yes | Patient's full name |
| patient_phone | String | Yes | 10-digit phone number |
| patient_email | String | No | Email address (for email delivery) |
| doctor_name | String | Yes | Doctor's name |
| notes | String | No | Additional notes |
| send_whatsapp | String | No | "true" or "false" (default: "true") |
| send_email | String | No | "true" or "false" (default: "false") |

**Response:**
```json
{
  "success": true,
  "message": "Prescription uploaded and sent",
  "pdf_url": "https://api.nevikacura.com/api/teleconsult/prescription/download/prescription_12345.pdf",
  "delivery_status": {
    "whatsapp": true,
    "email": true
  }
}
```

### MSG91 Template Registration

To register this template in MSG91:

1. Go to MSG91 Dashboard → WhatsApp → Templates
2. Create new template with:
   - **Template Name:** `document_delivery`
   - **Category:** Utility
   - **Language:** English
   - **Body:** 
     ```
     Hi {{1}},
     
     Your {{2}} from {{3}} is ready!
     
     Download: {{4}}
     
     For queries: 9833188288
     - Nevika Cura
     ```

### Notes
- This template consolidates prescription, invoice, and report delivery into a single template
- Reduces the number of templates needed in MSG91
- Works with both WhatsApp and Email delivery
- PDF generation uses reportlab for professional formatting
