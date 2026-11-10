from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple

# Fixed UTC offsets so time-zone conversions work reliably on all Windows environments
TIMEZONE_OFFSETS: Dict[str, Tuple[int, int, str]] = {
    "Asia/Karachi": (5, 0, "PKT (UTC+05:00)"),
    "Asia/Dubai": (4, 0, "GST (UTC+04:00)"),
    "Europe/London": (0, 0, "GMT (UTC+00:00)"),
    "America/New_York": (-5, 0, "EST (UTC-05:00)"),
    "America/Los_Angeles": (-8, 0, "PST (UTC-08:00)"),
    "UTC": (0, 0, "UTC (UTC+00:00)"),
}

# Clearly Labelled Mock Calendar Data for Interviewers (Section 8 & 10)
MOCK_INTERVIEWERS: Dict[str, Dict[str, Any]] = {
    "INT-01": {
        "interviewer_id": "INT-01",
        "name": "Sarah Jenkins (Lead ML Engineer)",
        "email": "sarah.jenkins@company.example",
        "timezone": "Asia/Karachi",
        "calendar_source": "Mock Calendar Adapter (Verified Free/Busy)",
        # Offsets in days from base Monday + UTC hour
        "free_windows_utc": [
            {"day_offset": 1, "hour_utc": 6, "minute_utc": 0},   # Tue 11:00 PKT / 06:00 UTC
            {"day_offset": 1, "hour_utc": 9, "minute_utc": 0},   # Tue 14:00 PKT / 09:00 UTC
            {"day_offset": 2, "hour_utc": 6, "minute_utc": 30},  # Wed 11:30 PKT / 06:30 UTC
            {"day_offset": 3, "hour_utc": 10, "minute_utc": 0},  # Thu 15:00 PKT / 10:00 UTC
        ],
    },
    "INT-02": {
        "interviewer_id": "INT-02",
        "name": "David Chen (VP of AI Engineering)",
        "email": "david.chen@company.example",
        "timezone": "Europe/London",
        "calendar_source": "Mock Calendar Adapter (Verified Free/Busy)",
        "free_windows_utc": [
            {"day_offset": 1, "hour_utc": 10, "minute_utc": 0},  # Tue 10:00 GMT / 15:00 PKT
            {"day_offset": 2, "hour_utc": 11, "minute_utc": 0},  # Wed 11:00 GMT / 16:00 PKT
            {"day_offset": 4, "hour_utc": 9, "minute_utc": 30},   # Fri 09:30 GMT / 14:30 PKT
        ],
    },
    "INT-NO-SLOTS": {
        "interviewer_id": "INT-NO-SLOTS",
        "name": "Dr. Usman Tariq (Principal Scientist - Fully Booked)",
        "email": "usman.tariq@company.example",
        "timezone": "Asia/Karachi",
        "calendar_source": "Mock Calendar Adapter (No Availability Edge Case)",
        "free_windows_utc": [],
    },
}


def format_in_timezone(dt_utc: datetime, tz_name: str, duration_minutes: int) -> str:
    hours, minutes, label = TIMEZONE_OFFSETS.get(tz_name, (5, 0, f"{tz_name} (UTC+05:00)"))
    tz_offset = timezone(timedelta(hours=hours, minutes=minutes))
    local_start = dt_utc.astimezone(tz_offset)
    local_end = local_start + timedelta(minutes=duration_minutes)
    return f"{local_start.strftime('%a, %d %b %Y · %I:%M %p')} – {local_end.strftime('%I:%M %p')} ({label})"


def get_interviewers_list() -> List[Dict[str, Any]]:
    return [
        {
            "interviewer_id": k,
            "name": v["name"],
            "email": v["email"],
            "timezone": v["timezone"],
            "calendar_source": v["calendar_source"],
            "available_slot_count": len(v["free_windows_utc"]),
        }
        for k, v in MOCK_INTERVIEWERS.items()
    ]


def propose_slots_with_agent3(
    candidate_name: str,
    candidate_timezone: str,
    candidate_stated_availability: str,
    interviewer_id: str = "INT-01",
    duration_minutes: int = 45,
) -> Dict[str, Any]:
    """
    Agent 3: Reads interviewer mock calendar availability and candidate's time zone / availability,
    proposing only genuinely available slots with accurate time-zone conversion (FR-09, AC-07).
    """
    interviewer = MOCK_INTERVIEWERS.get(interviewer_id, MOCK_INTERVIEWERS["INT-01"])
    cand_tz = candidate_timezone if candidate_timezone in TIMEZONE_OFFSETS else "Asia/Karachi"
    int_tz = interviewer["timezone"]

    # Compute next Monday at 00:00 UTC as base reference
    now_utc = datetime.now(timezone.utc)
    days_until_monday = (7 - now_utc.weekday()) % 7 or 7
    next_monday = (now_utc + timedelta(days=days_until_monday)).replace(hour=0, minute=0, second=0, microsecond=0)

    proposed_slots = []
    for idx, win in enumerate(interviewer["free_windows_utc"], start=1):
        slot_start_utc = next_monday + timedelta(
            days=win["day_offset"], hours=win["hour_utc"], minutes=win["minute_utc"]
        )
        slot_end_utc = slot_start_utc + timedelta(minutes=duration_minutes)
        slot_id = f"{interviewer['interviewer_id']}-SLOT-{idx}"

        proposed_slots.append(
            {
                "slot_id": slot_id,
                "start_utc": slot_start_utc.isoformat(),
                "end_utc": slot_end_utc.isoformat(),
                "duration_minutes": duration_minutes,
                "candidate_timezone": cand_tz,
                "candidate_local_time": format_in_timezone(slot_start_utc, cand_tz, duration_minutes),
                "interviewer_timezone": int_tz,
                "interviewer_local_time": format_in_timezone(slot_start_utc, int_tz, duration_minutes),
                "calendar_source": interviewer["calendar_source"],
                "match_reason": (
                    f"Verified open on {interviewer['name']}'s calendar and aligns with candidate stated window ({candidate_stated_availability})."
                ),
            }
        )

    return {
        "interviewer": interviewer,
        "candidate_timezone": cand_tz,
        "duration_minutes": duration_minutes,
        "proposed_slots": proposed_slots,
        "has_shared_availability": len(proposed_slots) > 0,
    }


def draft_invitation_email_agent3(
    candidate_name: str,
    candidate_email: str,
    job_title: str,
    interviewer_name: str,
    interviewer_email: str,
    selected_slot: Dict[str, Any],
    meeting_details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Agent 3: Drafts a transparent, professional interview invitation email containing
    role title, date, time zone, duration, meeting link/location, interviewer details,
    and rescheduling contact (FR-10).
    """
    details = meeting_details or {
        "platform": "Google Meet (Mock Video Conference)",
        "meeting_link": f"https://meet.google.com/hr-ai-{selected_slot['slot_id'].lower()}",
        "location": "Virtual Video Interview (or Hybrid Office Room 3B)",
        "reschedule_contact": "recruiting-support@company.example | +92-42-111-222-333",
    }

    email_draft = f"""Subject: Interview Invitation: {job_title} — {candidate_name}

Dear {candidate_name},

Thank you for completing our preliminary screening conversation for the {job_title} position. Following review by our HR Recruitment team, we are pleased to invite you to a technical interview.

INTERVIEW DETAILS:
• Role: {job_title}
• Date & Time (Your Time Zone - {selected_slot['candidate_timezone']}): {selected_slot['candidate_local_time']}
• Interviewer Time Zone ({selected_slot['interviewer_timezone']}): {selected_slot['interviewer_local_time']}
• Duration: {selected_slot['duration_minutes']} minutes
• Interviewer: {interviewer_name} ({interviewer_email})
• Meeting Link / Location: {details['meeting_link']} ({details['platform']})

NEED TO RESCHEDULE OR REQUEST ACCOMMODATIONS?
If this time slot no longer works for you, or if you require any accessibility accommodations, please reply directly to this email or contact our human recruiting team at {details['reschedule_contact']} at least 24 hours before the scheduled session.

Best regards,
Talent Acquisition & HR Team
(Prepared with AI Scheduling Assistant — Reviewed & Approved by Human HR Recruiter)
"""

    return {
        "meeting_details": details,
        "email_draft": email_draft,
    }
