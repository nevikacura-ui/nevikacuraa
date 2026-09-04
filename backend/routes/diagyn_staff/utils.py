"""
DiaGyn Staff Portal — Time helpers, slot generation utilities.
"""

from datetime import datetime, timezone, timedelta
from .shared import IST_OFFSET, DOCTOR_SCHEDULE


def get_ist_now():
    return datetime.now(timezone.utc) + IST_OFFSET


def get_ist_date():
    return get_ist_now().strftime("%Y-%m-%d")


def get_ist_datetime():
    return get_ist_now().isoformat()


def format_ist_display(dt_str):
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        ist_dt = dt + IST_OFFSET
        return ist_dt.strftime("%d-%m-%Y %I:%M %p")
    except (ValueError, TypeError):
        return dt_str


def normalize_time_to_24h(time_str: str, for_sorting: bool = True) -> str:
    if not time_str or str(time_str) == "None":
        return "99:99" if for_sorting else None

    time_str = str(time_str).strip().upper()

    if "AM" not in time_str and "PM" not in time_str:
        parts = time_str.split(":")
        if len(parts) >= 2:
            try:
                hour = int(parts[0])
                minute = int(parts[1].split()[0])
                return f"{hour:02d}:{minute:02d}"
            except (ValueError, IndexError):
                pass
        return time_str

    try:
        is_pm = "PM" in time_str
        time_str = time_str.replace("AM", "").replace("PM", "").strip()
        parts = time_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1].strip()) if len(parts) > 1 else 0
        if is_pm and hour != 12:
            hour += 12
        elif not is_pm and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"
    except (ValueError, IndexError, TypeError):
        return time_str


def format_time_for_display(time_str: str) -> str:
    if not time_str or str(time_str) == "None":
        return ""
    normalized = normalize_time_to_24h(time_str, for_sorting=False)
    if not normalized:
        return str(time_str)
    try:
        parts = normalized.split(":")
        hour = int(parts[0])
        minute = int(parts[1])
        am_pm = "AM" if hour < 12 else "PM"
        if hour == 0:
            hour = 12
        elif hour > 12:
            hour -= 12
        return f"{hour:02d}:{minute:02d} {am_pm}"
    except (ValueError, IndexError):
        return str(time_str)


def generate_time_slots_for_session(start_time: str, end_time: str, interval: int = 15):
    slots = []
    start_hour, start_min = map(int, start_time.split(":"))
    end_hour, end_min = map(int, end_time.split(":"))
    current_minutes = start_hour * 60 + start_min
    end_minutes = end_hour * 60 + end_min
    while current_minutes < end_minutes:
        hour = current_minutes // 60
        minute = current_minutes % 60
        time_str = f"{hour:02d}:{minute:02d}"
        display = datetime.strptime(time_str, "%H:%M").strftime("%I:%M %p")
        slots.append({"value": time_str, "display": display})
        current_minutes += interval
    return slots


def get_current_ist_session():
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    current_hour = now_ist.hour
    if 11 <= current_hour < 18:
        return "morning"
    elif 18 <= current_hour < 22:
        return "evening"
    return None


def get_slots_for_doctor_clinic_date(doctor: str, clinic: str, date_str: str, session_filter: str = None):
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    day_of_week = date_obj.weekday()

    schedule = DOCTOR_SCHEDULE.get(doctor, {}).get(clinic, {})
    if not schedule or day_of_week not in schedule.get("days", []):
        return {"morning": [], "evening": [], "all": [], "current_session": None}

    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    current_date = now_ist.strftime("%Y-%m-%d")
    current_session = get_current_ist_session()

    morning_slots = []
    evening_slots = []

    if schedule.get("morning"):
        morning_slots = generate_time_slots_for_session(schedule["morning"]["start"], schedule["morning"]["end"])
        for slot in morning_slots:
            slot["session"] = "morning"

    if schedule.get("evening"):
        evening_config = schedule["evening"]
        evening_days = evening_config.get("days", schedule.get("days", []))
        if day_of_week in evening_days:
            evening_slots = generate_time_slots_for_session(evening_config["start"], evening_config["end"])
            for slot in evening_slots:
                slot["session"] = "evening"

    is_today = date_str == current_date

    if session_filter == "current" and is_today:
        if current_session == "morning":
            return {"morning": morning_slots, "evening": [], "all": morning_slots, "current_session": "morning"}
        elif current_session == "evening":
            return {"morning": [], "evening": evening_slots, "all": evening_slots, "current_session": "evening"}
        else:
            return {"morning": [], "evening": [], "all": [], "current_session": None}

    elif session_filter == "future":
        if is_today:
            if current_session == "morning":
                return {"morning": [], "evening": evening_slots, "all": evening_slots, "current_session": "morning"}
            elif current_session == "evening":
                return {"morning": [], "evening": [], "all": [], "current_session": "evening"}
            else:
                all_slots = morning_slots + evening_slots
                return {"morning": morning_slots, "evening": evening_slots, "all": all_slots, "current_session": None}
        else:
            all_slots = morning_slots + evening_slots
            return {"morning": morning_slots, "evening": evening_slots, "all": all_slots, "current_session": None}

    all_slots = morning_slots + evening_slots
    return {"morning": morning_slots, "evening": evening_slots, "all": all_slots, "current_session": current_session}


def generate_time_slots():
    slots = []
    for hour in range(9, 21):
        for minute in [0, 15, 30, 45]:
            time_str = f"{hour:02d}:{minute:02d}"
            display = datetime.strptime(time_str, "%H:%M").strftime("%I:%M %p")
            slots.append({"value": time_str, "display": display})
    return slots


TIME_SLOTS = generate_time_slots()
