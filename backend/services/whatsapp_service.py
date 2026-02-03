"""
WhatsApp Notification Service using Twilio WhatsApp API
Professional transactional messages for appointment management
"""
from datetime import datetime
import logging
import os

# Set up logging
logger = logging.getLogger(__name__)

# =============================================
# Professional Message Templates (Twilio Style)
# =============================================

def get_appointment_confirmation_message(patient_name: str, doctor_name: str, 
                                         clinic_name: str, date: str, time: str) -> str:
    """Generate professional appointment confirmation message"""
    return f"""*Nevika Cura - Appointment Confirmed*

Dear {patient_name},

Your appointment has been successfully booked.

*Appointment Details:*
• Doctor: {doctor_name}
• Clinic: {clinic_name}
• Date: {date}
• Time: {time}

*Please Note:*
• Arrive 15 minutes before your appointment
• Bring your ID and any previous medical records
• Wear a mask for safety

To reschedule or cancel, reply to this message or call us at 9403890429.

Thank you for choosing Nevika Cura.
- Team Nevika Cura"""


def get_appointment_reminder_message(patient_name: str, doctor_name: str,
                                     clinic_name: str, date: str, time: str) -> str:
    """Generate professional appointment reminder message"""
    return f"""*Nevika Cura - Appointment Reminder*

Dear {patient_name},

This is a reminder for your upcoming appointment.

*Appointment Details:*
• Doctor: {doctor_name}
• Clinic: {clinic_name}
• Date: {date}
• Time: {time}

*Reminders:*
• Please arrive 15 minutes early
• Bring any previous prescriptions
• Fast if advised for blood tests

Reply CONFIRM to confirm or CANCEL to cancel your appointment.

- Team Nevika Cura"""


def get_appointment_completion_message(patient_name: str, doctor_name: str,
                                       clinic_name: str) -> str:
    """Generate professional appointment completion message"""
    return f"""*Nevika Cura - Consultation Complete*

Dear {patient_name},

Thank you for visiting us today.

Your consultation with {doctor_name} at {clinic_name} has been completed.

*Next Steps:*
• View your prescription in the Nevika Cura app
• Order medicines from Orange Pharmacy
• Book a follow-up appointment if advised

*Need Help?*
• Order medicines: Visit /pharmacy in the app
• Book follow-up: Visit /diagyn in the app
• Contact us: 9403890429

We wish you good health!
- Team Nevika Cura"""


def get_pharmacy_order_message(patient_name: str, order_id: str, 
                               medicines: list, status: str) -> str:
    """Generate pharmacy order update message"""
    medicine_list = "\n".join([f"  • {m}" for m in medicines[:5]])
    if len(medicines) > 5:
        medicine_list += f"\n  • ... and {len(medicines) - 5} more items"
    
    status_text = {
        "confirmed": "Order Confirmed",
        "processing": "Being Processed",
        "shipped": "Out for Delivery",
        "delivered": "Delivered"
    }.get(status.lower(), status)
    
    return f"""*Orange Pharmacy - Order Update*

Dear {patient_name},

Your order #{order_id} is: {status_text}

*Order Items:*
{medicine_list}

Track your order in the Nevika Cura app.

For queries, contact us at 9403890429.

- Orange Pharmacy"""


def get_lab_report_ready_message(patient_name: str, test_name: str, 
                                  order_id: str) -> str:
    """Generate lab report ready notification"""
    return f"""*Mango Health Labs - Report Ready*

Dear {patient_name},

Your test report is now available.

*Test Details:*
• Test: {test_name}
• Order ID: {order_id}

*How to Access:*
1. Open the Nevika Cura app
2. Go to My Orders
3. Download your report

Tip: Share your report with your doctor through the app for a quick review.

For queries, contact us at 9403890429.

- Proton Diagnostics"""


def get_emergency_alert_message(patient_name: str, emergency_type: str,
                                clinic_name: str) -> str:
    """Generate emergency appointment alert"""
    return f"""*Nevika Cura - Emergency Appointment*

URGENT: Emergency appointment created

*Patient:* {patient_name}
*Type:* {emergency_type}
*Clinic:* {clinic_name}
*Time:* Immediate

Please proceed to the clinic immediately. Our team is ready to assist you.

Emergency Contact: 9403890429

- Team Nevika Cura"""
