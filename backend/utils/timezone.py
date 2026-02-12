"""
Centralized IST (Indian Standard Time) Timezone Utilities
All user-facing timestamps should use these functions for consistency.
IST = UTC + 5:30
"""

from datetime import datetime, timezone, timedelta

# IST offset: UTC + 5:30
IST_OFFSET = timedelta(hours=5, minutes=30)
IST = timezone(IST_OFFSET)

def ist_now() -> datetime:
    """Get current time in IST (Indian Standard Time)"""
    return datetime.now(IST)

def utc_to_ist(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to IST"""
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(IST)

def ist_date_str() -> str:
    """Get today's date in IST as YYYY-MM-DD string"""
    return ist_now().strftime("%Y-%m-%d")

def ist_time_str() -> str:
    """Get current time in IST as HH:MM:SS string"""
    return ist_now().strftime("%H:%M:%S")

def ist_datetime_str() -> str:
    """Get current datetime in IST as readable string"""
    return ist_now().strftime("%Y-%m-%d %H:%M:%S IST")

def format_ist_display(dt: datetime = None) -> str:
    """Format datetime for user display (e.g., '12 Feb 2026, 3:45 PM IST')"""
    if dt is None:
        dt = ist_now()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    ist_dt = dt.astimezone(IST)
    return ist_dt.strftime("%d %b %Y, %I:%M %p IST")

def format_ist_date(dt: datetime = None) -> str:
    """Format date for user display (e.g., '12 Feb 2026')"""
    if dt is None:
        dt = ist_now()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    ist_dt = dt.astimezone(IST)
    return ist_dt.strftime("%d %b %Y")

def format_ist_time(dt: datetime = None) -> str:
    """Format time for user display (e.g., '3:45 PM')"""
    if dt is None:
        dt = ist_now()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    ist_dt = dt.astimezone(IST)
    return ist_dt.strftime("%I:%M %p")

def ist_iso_string() -> str:
    """Get current IST time as ISO format string for database storage"""
    return ist_now().isoformat()
