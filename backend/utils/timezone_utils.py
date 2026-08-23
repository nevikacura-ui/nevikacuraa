"""
Centralized IST Timezone Utilities
All user-facing communications should use these functions for consistent IST times.
"""

from datetime import datetime, timezone, timedelta

# IST is UTC+5:30
IST_OFFSET = timedelta(hours=5, minutes=30)

def get_ist_now() -> datetime:
    """Get current time in IST as datetime object"""
    return datetime.now(timezone.utc) + IST_OFFSET

def get_ist_date() -> str:
    """Get current date in IST (YYYY-MM-DD format)"""
    return get_ist_now().strftime("%Y-%m-%d")

def get_ist_datetime_iso() -> str:
    """Get current datetime in IST (ISO format for storage)"""
    return get_ist_now().isoformat()

def get_ist_display_datetime() -> str:
    """Get current datetime formatted for display (DD-MM-YYYY HH:MM AM/PM IST)"""
    return get_ist_now().strftime("%d-%m-%Y %I:%M %p IST")

def get_ist_display_date() -> str:
    """Get current date formatted for display (DD MMM YYYY)"""
    return get_ist_now().strftime("%d %b %Y")

def get_ist_display_time() -> str:
    """Get current time formatted for display (HH:MM AM/PM)"""
    return get_ist_now().strftime("%I:%M %p")

def utc_to_ist(dt: datetime) -> datetime:
    """Convert UTC datetime to IST datetime"""
    if dt.tzinfo is None:
        # Assume UTC if no timezone
        dt = dt.replace(tzinfo=timezone.utc)
    return dt + IST_OFFSET

def format_datetime_ist(dt_str: str) -> str:
    """
    Format datetime string for user display in IST.
    Handles various input formats including ISO strings.
    Returns: DD-MM-YYYY HH:MM AM/PM IST
    """
    try:
        # Handle ISO format with or without Z suffix
        if isinstance(dt_str, str):
            dt_str = dt_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(dt_str)
        elif isinstance(dt_str, datetime):
            dt = dt_str
        else:
            return str(dt_str)
        
        # Convert to IST
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist_dt = dt + IST_OFFSET
        return ist_dt.strftime("%d-%m-%Y %I:%M %p IST")
    except Exception:
        return str(dt_str)

def format_date_ist(dt_str: str) -> str:
    """
    Format date string for user display in IST.
    Returns: DD MMM YYYY
    """
    try:
        if isinstance(dt_str, str):
            dt_str = dt_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(dt_str)
        elif isinstance(dt_str, datetime):
            dt = dt_str
        else:
            return str(dt_str)
        
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist_dt = dt + IST_OFFSET
        return ist_dt.strftime("%d %b %Y")
    except Exception:
        return str(dt_str)

def format_time_ist(dt_str: str) -> str:
    """
    Format time string for user display in IST.
    Returns: HH:MM AM/PM
    """
    try:
        if isinstance(dt_str, str):
            dt_str = dt_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(dt_str)
        elif isinstance(dt_str, datetime):
            dt = dt_str
        else:
            return str(dt_str)
        
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist_dt = dt + IST_OFFSET
        return ist_dt.strftime("%I:%M %p")
    except Exception:
        return str(dt_str)


def normalize_time_to_24h(time_str: str) -> str:
    """
    Normalize any time format to 24-hour format (HH:MM) for consistent storage.
    Handles: '09:00 AM', '9:00 AM', '14:00', '2:00 PM', '6:15 PM', etc.
    
    This ensures all times in the database are stored in a consistent format
    that sorts correctly and can be displayed properly.
    """
    if not time_str or str(time_str) == 'None':
        return None
    
    time_str = str(time_str).strip().upper()
    
    # Already in 24-hour format (no AM/PM)
    if 'AM' not in time_str and 'PM' not in time_str:
        parts = time_str.split(':')
        if len(parts) >= 2:
            try:
                hour = int(parts[0])
                minute = int(parts[1].split()[0])  # Handle any trailing text
                return f"{hour:02d}:{minute:02d}"
            except (ValueError, IndexError):
                pass
        return time_str
    
    # 12-hour format with AM/PM
    try:
        is_pm = 'PM' in time_str
        time_str = time_str.replace('AM', '').replace('PM', '').strip()
        
        parts = time_str.split(':')
        hour = int(parts[0])
        minute = int(parts[1].strip()) if len(parts) > 1 else 0
        
        # Convert to 24-hour
        if is_pm and hour != 12:
            hour += 12
        elif not is_pm and hour == 12:
            hour = 0
        
        return f"{hour:02d}:{minute:02d}"
    except (ValueError, IndexError):
        return time_str


def format_time_for_display(time_str: str) -> str:
    """
    Format time for user display in 12-hour format with AM/PM.
    Handles any input format (24-hour or 12-hour).
    Returns: HH:MM AM/PM (e.g., "02:30 PM", "11:00 AM")
    """
    if not time_str or str(time_str) == 'None':
        return ""
    
    # First normalize to 24-hour
    normalized = normalize_time_to_24h(time_str)
    if not normalized:
        return time_str
    
    try:
        parts = normalized.split(':')
        hour = int(parts[0])
        minute = int(parts[1])
        
        # Convert to 12-hour format
        am_pm = 'AM' if hour < 12 else 'PM'
        if hour == 0:
            hour = 12
        elif hour > 12:
            hour -= 12
        
        return f"{hour:02d}:{minute:02d} {am_pm}"
    except (ValueError, IndexError):
        return time_str
