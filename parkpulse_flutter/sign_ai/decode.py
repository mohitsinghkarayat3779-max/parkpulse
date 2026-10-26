"""
Parking sign rule decoder.
Converts raw OCR text from street parking signs into structured rules,
plain-English summaries, and real-time verdicts.
"""

import re
from datetime import datetime

DAY_MAP = {
    "SUN": 0, "SUNDAY": 0,
    "MON": 1, "MONDAY": 1,
    "TUE": 2, "TUES": 2, "TUESDAY": 2,
    "WED": 3, "WEDNESDAY": 3,
    "THU": 4, "THUR": 4, "THURS": 4, "THURSDAY": 4,
    "FRI": 5, "FRIDAY": 5,
    "SAT": 6, "SATURDAY": 6,
}

DAY_FULL_NAMES = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
]


def decode(raw: str, now: datetime = None) -> dict | None:
    """
    Decodes raw OCR text from a parking sign.
    Returns None if text < 4 chars or unrecognized format.
    Otherwise returns dict: {"kind": str, "summary": str, "verdict": str}
    """
    if not raw or not isinstance(raw, str):
        return None

    # Uppercase text and collapse whitespace
    text = " ".join(raw.upper().split()).strip()
    if len(text) < 4:
        return None

    if now is None:
        now = datetime.now()

    # Python weekday is 0 for Monday, 6 for Sunday.
    # Convert so Sunday is 0, Monday is 1, ..., Saturday is 6.
    today_weekday = (now.weekday() + 1) % 7
    current_minutes = now.hour * 60 + now.minute

    # 1. Days parsing (default every day)
    days = [0, 1, 2, 3, 4, 5, 6]

    range_match = re.search(
        r"\b(MON|TUE|TUES|WED|THU|THUR|THURS|FRI|SAT|SUN)\s*(?:-|–|TO)\s*(MON|TUE|TUES|WED|THU|THUR|THURS|FRI|SAT|SUN)\b",
        text,
    )
    if range_match:
        start_d = DAY_MAP[range_match.group(1)]
        end_d = DAY_MAP[range_match.group(2)]
        expanded = []
        cur = start_d
        while True:
            expanded.append(cur)
            if cur == end_d:
                break
            cur = (cur + 1) % 7
        days = expanded

    # EXCEPT <DAY> removes that day
    for ex_match in re.finditer(
        r"EXCEPT\s+(SUN|SUNDAY|MON|MONDAY|TUE|TUESDAY|WED|WEDNESDAY|THU|THURSDAY|FRI|FRIDAY|SAT|SATURDAY)\b",
        text,
    ):
        ex_d = DAY_MAP[ex_match.group(1)]
        days = [d for d in days if d != ex_d]

    # Format Days string
    is_all_days = len(days) == 7 and set(days) == {0, 1, 2, 3, 4, 5, 6}
    is_mon_fri = len(days) == 5 and set(days) == {1, 2, 3, 4, 5}

    if is_all_days:
        days_str = "every day"
    elif is_mon_fri:
        days_str = "Monday to Friday"
    else:
        days_str = ", ".join(DAY_FULL_NAMES[d] for d in days)

    # 2. Times parsing
    # Matches windows like 8AM-6PM or 7-9AM or 8:30AM-5PM
    time_regex = re.compile(
        r"(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:-|–|TO)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)",
        re.IGNORECASE,
    )

    windows = []
    for m in time_regex.finditer(text):
        s_h = int(m.group(1))
        s_m = int(m.group(2)) if m.group(2) else 0
        end_meridiem = m.group(6).upper()
        start_meridiem = m.group(3).upper() if m.group(3) else end_meridiem
        e_h = int(m.group(4))
        e_m = int(m.group(5)) if m.group(5) else 0

        # Convert to 24-hr minutes
        def to_min(h, m_val, meridiem):
            if meridiem == "PM" and h != 12:
                h += 12
            elif meridiem == "AM" and h == 12:
                h = 0
            return h * 60 + m_val

        start_min = to_min(s_h, s_m, start_meridiem)
        end_min = to_min(e_h, e_m, end_meridiem)

        def format_part(h, m_val, meridiem):
            min_str = f":{m_val:02d}" if m_val > 0 else ""
            return f"{h}{min_str} {meridiem}"

        formatted = f"{format_part(s_h, s_m, start_meridiem)} to {format_part(e_h, e_m, end_meridiem)}"
        windows.append((start_min, end_min, formatted))

    if windows:
        times_str = " and ".join(w[2] for w in windows)
    else:
        times_str = "at all times"

    # 3. Active now check
    day_active = today_weekday in days
    if not windows:
        time_active = True
    else:
        time_active = any(w[0] <= current_minutes < w[1] for w in windows)

    is_active = day_active and time_active

    # 4. Limit parsing
    limit_match = re.search(
        r"\b(\d+)\s*(HR|HOUR|HOURS|MIN|MINS|MINUTE|MINUTES)\b", text
    )
    limit_str = None
    if limit_match:
        val = int(limit_match.group(1))
        unit = limit_match.group(2).upper()
        if unit.startswith("HR") or unit.startswith("HOUR"):
            limit_str = "1 hour" if val == 1 else f"{val} hours"
        else:
            limit_str = "1 minute" if val == 1 else f"{val} minutes"

    # 5. Order of checks:
    # 1. NO PARKING/STOPPING/STANDING gives kind no
    # 2. then time limit gives kind limit
    # 3. then PERMIT gives kind no
    # 4. then METER/PAY/PAID gives kind limit
    # otherwise None
    category = None
    kind = None

    if any(
        phrase in text
        for phrase in [
            "NO PARKING",
            "NO STOPPING",
            "NO STANDING",
            "TOW AWAY",
            "DO NOT PARK",
        ]
    ):
        kind = "no"
        category = "no_parking"
    elif limit_str:
        kind = "limit"
        category = "limit"
    elif "PERMIT" in text:
        kind = "no"
        category = "permit"
    elif any(phrase in text for phrase in ["METER", "PAY", "PAID"]):
        kind = "limit"
        category = "paid"
    else:
        return None

    # 6. Wording
    if category == "no_parking":
        summary = f"No parking {times_str}, {days_str}."
        verdict = (
            "Don’t park here now."
            if is_active
            else "You can park now. The rule isn’t active."
        )
    elif category == "limit":
        summary = f"Up to {limit_str}, {times_str}, {days_str}. No limit outside those times."
        verdict = (
            f"You can park now, but move within {limit_str}."
            if is_active
            else "You can park now with no limit."
        )
    elif category == "permit":
        summary = f"Permit holders only, {times_str}, {days_str}."
        verdict = (
            "Skip this street unless you hold a permit."
            if is_active
            else "Permit rule isn't active now."
        )
    elif category == "paid":
        summary = f"Paid parking {times_str}, {days_str}."
        verdict = (
            "Pay before you leave the car."
            if is_active
            else "Free right now."
        )
    else:
        return None

    return {
        "kind": kind,
        "summary": summary,
        "verdict": verdict,
    }


if __name__ == "__main__":
    # Test 1
    t1 = datetime(2026, 10, 26, 10, 0)  # Monday 10:00
    r1 = decode("2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN", t1)
    print("Test 1:", r1)
    assert r1["kind"] == "limit"
    assert r1["summary"] == "Up to 2 hours, 8 AM to 6 PM, Monday to Friday. No limit outside those times."
    assert r1["verdict"] == "You can park now, but move within 2 hours."

    # Test 2
    r2 = decode("NO PARKING 7-9AM 4-6PM MON-FRI", t1)
    print("Test 2:", r2)
    assert r2["kind"] == "no"
    assert r2["summary"] == "No parking 7 AM to 9 AM and 4 PM to 6 PM, Monday to Friday."
    assert r2["verdict"] == "You can park now. The rule isn’t active."

    # Test 3
    t3 = datetime(2026, 10, 26, 17, 0)  # Monday 17:00
    r3 = decode("NO PARKING 7-9AM 4-6PM MON-FRI", t3)
    print("Test 3:", r3)
    assert r3["verdict"] == "Don’t park here now."

    # Test 4
    t4 = datetime(2026, 10, 25, 10, 0)  # Sunday 10:00
    r4 = decode("2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN", t4)
    print("Test 4:", r4)
    assert r4["verdict"] == "You can park now with no limit."

    print("All Python decoder tests passed successfully!")
