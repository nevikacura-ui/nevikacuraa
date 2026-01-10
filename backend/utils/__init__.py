"""
Nevika Cura - Utility Functions
Common helpers used across the application
"""

from datetime import datetime, timezone, timedelta
import random


# ============ OTP UTILITIES ============

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))


# ============ DATE UTILITIES ============

def get_indian_date():
    """Get current date in IST (UTC+5:30)"""
    ist_offset = timedelta(hours=5, minutes=30)
    ist_time = datetime.now(timezone.utc) + ist_offset
    return ist_time.strftime("%Y-%m-%d")


def get_indian_datetime():
    """Get current datetime in IST (UTC+5:30)"""
    ist_offset = timedelta(hours=5, minutes=30)
    ist_time = datetime.now(timezone.utc) + ist_offset
    return ist_time


def format_date_ist(date_str):
    """Format a date string for display in IST"""
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        return date_obj.strftime("%d %b %Y")  # "10 Jan 2026"
    except:
        return date_str


# ============ PHONE UTILITIES ============

def clean_phone(phone: str) -> str:
    """Clean and normalize phone number"""
    if not phone:
        return ""
    return phone.strip().replace(" ", "").replace("-", "").replace("+91", "")


def format_phone_whatsapp(phone: str) -> str:
    """Format phone for WhatsApp link (Indian numbers)"""
    clean = clean_phone(phone)
    if len(clean) == 10:
        return f"91{clean}"
    return clean


# ============ SLOT UTILITIES ============

def generate_time_slots(start_time: str, end_time: str, interval_minutes: int = 15):
    """Generate time slots between start and end times"""
    slots = []
    start_hour, start_min = map(int, start_time.split(':'))
    end_hour, end_min = map(int, end_time.split(':'))
    
    current = start_hour * 60 + start_min
    end = end_hour * 60 + end_min
    
    while current < end:
        hours, minutes = divmod(current, 60)
        slots.append(f"{hours:02d}:{minutes:02d}")
        current += interval_minutes
    
    return slots


# ============ STATUS COLOR MAPPING ============

STATUS_COLORS = {
    "pending": "yellow",
    "Booked": "blue",
    "In Clinic": "orange",
    "Completed": "green",
    "Cancelled": "red",
    "No Show": "gray",
    "Test Booked": "blue",
    "Sample Collected": "purple",
    "Report Ready": "green",
    "Order Received": "blue",
    "Preparing": "orange",
    "Ready for Pickup": "teal",
    "Out for Delivery": "purple",
    "Delivered": "green"
}


def get_status_class(status: str) -> str:
    """Get CSS class based on status"""
    color = STATUS_COLORS.get(status, "gray")
    return f"bg-{color}-100 text-{color}-800"
