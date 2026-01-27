"""
WhatsApp Notification Service using Baileys via Emergent Integrations
This provides a cost-free alternative to Twilio for appointment reminders
"""
from datetime import datetime
import logging
import os
import asyncio

# Set up logging
logger = logging.getLogger(__name__)

# Store for WhatsApp session
whatsapp_session = {
    "is_connected": False,
    "phone_number": None,
    "last_connected": None,
    "qr_code": None,
    "connection_instance": None
}

async def initialize_whatsapp():
    """Initialize WhatsApp connection - requires QR code scan"""
    try:
        from emergentintegrations.llm.whatsapp import WhatsAppBot
        
        bot = WhatsAppBot()
        whatsapp_session["connection_instance"] = bot
        
        # Start the bot and get QR code
        logger.info("Initializing WhatsApp connection...")
        return {
            "status": "qr_required",
            "message": "Please scan the QR code with your WhatsApp to connect"
        }
    except ImportError as e:
        logger.warning(f"emergentintegrations not installed: {e}")
        return {
            "status": "error",
            "message": "WhatsApp integration not available. Please install emergentintegrations."
        }
    except Exception as e:
        logger.error(f"Failed to initialize WhatsApp: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def get_whatsapp_qr():
    """Get QR code for WhatsApp pairing"""
    try:
        if whatsapp_session.get("connection_instance"):
            bot = whatsapp_session["connection_instance"]
            # Generate QR code
            qr_data = await bot.get_qr_code()
            if qr_data:
                whatsapp_session["qr_code"] = qr_data
                return {
                    "status": "success",
                    "qr_code": qr_data
                }
        return {
            "status": "error",
            "message": "WhatsApp not initialized. Call initialize first."
        }
    except Exception as e:
        logger.error(f"Failed to get QR code: {e}")
        return {"status": "error", "message": str(e)}


async def check_whatsapp_connection():
    """Check if WhatsApp is connected"""
    return {
        "is_connected": whatsapp_session.get("is_connected", False),
        "phone_number": whatsapp_session.get("phone_number"),
        "last_connected": whatsapp_session.get("last_connected")
    }


async def send_whatsapp_message(phone: str, message: str) -> dict:
    """
    Send a WhatsApp message to the specified phone number
    
    Args:
        phone: Phone number with country code (e.g., +919999999999 or 919999999999)
        message: Message text to send
        
    Returns:
        dict with status and message_id if successful
    """
    try:
        from emergentintegrations.llm.whatsapp import WhatsAppBot
        
        # Clean phone number - remove + and spaces
        clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        if not clean_phone.startswith("91"):
            clean_phone = "91" + clean_phone
        
        # Format for WhatsApp - add @s.whatsapp.net suffix
        whatsapp_jid = f"{clean_phone}@s.whatsapp.net"
        
        # Get or create bot instance
        bot = whatsapp_session.get("connection_instance")
        if not bot:
            bot = WhatsAppBot()
            whatsapp_session["connection_instance"] = bot
        
        # Send message
        result = await bot.send_message(whatsapp_jid, message)
        
        logger.info(f"WhatsApp message sent to {phone}")
        return {
            "status": "success",
            "message_id": result.get("key", {}).get("id"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except ImportError:
        logger.warning("emergentintegrations not installed - using fallback")
        return await send_whatsapp_fallback(phone, message)
    except Exception as e:
        logger.error(f"Failed to send WhatsApp message: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def send_whatsapp_fallback(phone: str, message: str) -> dict:
    """
    Fallback method using WhatsApp Web deep link
    This creates a clickable link for manual sending
    """
    import urllib.parse
    
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_phone.startswith("91"):
        clean_phone = "91" + clean_phone
    
    encoded_message = urllib.parse.quote(message)
    whatsapp_link = f"https://wa.me/{clean_phone}?text={encoded_message}"
    
    return {
        "status": "fallback",
        "whatsapp_link": whatsapp_link,
        "message": "WhatsApp direct send not available. Use the link to send manually."
    }


# Template messages for different notification types
def get_appointment_confirmation_message(patient_name: str, doctor_name: str, 
                                         clinic_name: str, date: str, time: str) -> str:
    """Generate appointment confirmation message"""
    return f"""🏥 *Nevika Cura - Appointment Confirmed*

Dear *{patient_name}*,

Your appointment has been successfully booked!

👨‍⚕️ *Doctor:* {doctor_name}
🏥 *Clinic:* {clinic_name}
📅 *Date:* {date}
🕐 *Time:* {time}

*Important:*
• Please arrive 15 minutes early
• Bring your ID and previous records
• Wear a mask

Need to reschedule? Reply to this message or call us.

Thank you for choosing Nevika Cura! 💚"""


def get_appointment_reminder_message(patient_name: str, doctor_name: str,
                                     clinic_name: str, date: str, time: str) -> str:
    """Generate appointment reminder message"""
    return f"""⏰ *Reminder: Upcoming Appointment*

Dear *{patient_name}*,

This is a reminder for your appointment tomorrow:

👨‍⚕️ *Doctor:* {doctor_name}
🏥 *Clinic:* {clinic_name}
📅 *Date:* {date}
🕐 *Time:* {time}

*Please remember:*
• Arrive 15 minutes early
• Bring previous prescriptions
• Fast if advised for tests

Reply *CONFIRM* to confirm or *CANCEL* to cancel.

- Nevika Cura Team"""


def get_pharmacy_order_message(patient_name: str, order_id: str, 
                               medicines: list, status: str) -> str:
    """Generate pharmacy order update message"""
    medicine_list = "\n".join([f"• {m}" for m in medicines[:5]])  # Limit to 5 items
    if len(medicines) > 5:
        medicine_list += f"\n• ... and {len(medicines) - 5} more items"
    
    status_emoji = {
        "confirmed": "✅",
        "processing": "📦",
        "shipped": "🚚",
        "delivered": "🎉"
    }.get(status.lower(), "📋")
    
    return f"""{status_emoji} *Orange Pharmacy - Order Update*

Dear *{patient_name}*,

Your order *#{order_id}* status: *{status.upper()}*

*Medicines:*
{medicine_list}

Track your order in the Nevika Cura app.

Need help? Reply to this message.

- Orange Pharmacy Team 🍊"""


def get_lab_report_ready_message(patient_name: str, test_name: str, 
                                  order_id: str) -> str:
    """Generate lab report ready notification"""
    return f"""📋 *Proton Diagnostics - Report Ready*

Dear *{patient_name}*,

Great news! Your test report is ready:

🔬 *Test:* {test_name}
📄 *Order ID:* {order_id}

You can:
1. Download from the Nevika Cura app
2. Visit our center with your Order ID

💡 *Pro tip:* Share your report with your doctor through the app for instant review.

Questions about your results? Book a consultation with our specialists.

- Proton Diagnostics Team 🔬"""
