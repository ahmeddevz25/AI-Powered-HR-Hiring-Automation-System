from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models import AuditEvent, utcnow


def log_audit_event(
    db: Session,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: int,
    actor_role: str = "HR Recruiter",
    candidate_id: Optional[int] = None,
    requisition_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditEvent:
    """
    Centralized audit trail logger (FR-14).
    Note: Privacy & security control (Section 12 & 13) — never log full resume text,
    API keys, or full raw transcripts inside audit event details.
    """
    safe_details = dict(details or {})
    # Sanitize sensitive keys if accidentally passed
    for forbidden_key in ("extracted_text", "api_key", "raw_transcript", "password"):
        safe_details.pop(forbidden_key, None)

    event = AuditEvent(
        actor=actor,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        candidate_id=candidate_id,
        requisition_id=requisition_id,
        timestamp=utcnow(),
        details=safe_details,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

