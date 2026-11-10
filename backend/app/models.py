from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


# Section 9: Official Candidate Lifecycle Statuses
CANDIDATE_STATUSES = [
    "Resume Received",
    "Needs Manual Review",
    "Scored — HR Review",
    "Approved for Screening",
    "Screening Scheduled / Pending",
    "Screening Completed — HR Review",
    "Approved for Interview",
    "Interview Proposed",
    "Interview Scheduled",
    "Closed",
]


class Requisition(Base):
    __tablename__ = "requisitions"

    requisition_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    department = Column(String(120), default="Engineering & AI")
    location_work_arrangement = Column(String(150), default="Hybrid (Lahore / Remote)")
    min_experience_years = Column(Float, default=1.0)
    job_description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)      # List[str]
    preferred_skills = Column(JSON, default=list)     # List[str]
    screening_questions = Column(JSON, default=list)  # List[str]
    rubric = Column(JSON, nullable=False)             # Dict with weights totaling 100
    status = Column(String(50), default="Open")
    created_by = Column(String(100), default="HR Recruiter")
    created_at = Column(DateTime(timezone=True), default=utcnow)

    candidates = relationship("Candidate", back_populates="requisition", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(Integer, primary_key=True, index=True)
    requisition_id = Column(Integer, ForeignKey("requisitions.requisition_id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(60), default="+92-300-0000000")
    timezone = Column(String(60), default="Asia/Karachi")
    resume_filename = Column(String(255), nullable=False)
    resume_reference = Column(String(500), nullable=False)
    extracted_text = Column(Text, default="")
    consent_preferences = Column(JSON, default=lambda: {"call_consent": "pending", "recording_consent": "pending"})
    current_status = Column(String(80), default="Resume Received", nullable=False)
    status_reason = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    requisition = relationship("Requisition", back_populates="candidates")
    evaluation = relationship("ResumeEvaluation", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    screening = relationship("Screening", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    interview = relationship("Interview", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    communications = relationship("CommunicationLog", back_populates="candidate", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="candidate", cascade="all, delete-orphan")


class ResumeEvaluation(Base):
    __tablename__ = "resume_evaluations"

    evaluation_id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id"), nullable=False, unique=True)
    requisition_id = Column(Integer, ForeignKey("requisitions.requisition_id"), nullable=False)
    total_score = Column(Float, nullable=False, default=0.0)
    criterion_scores = Column(JSON, default=dict)             # Dict[criterion, {score, max_weight, reasoning, evidence_quote}]
    evidence = Column(JSON, default=list)                     # List[str]
    missing_or_unclear_items = Column(JSON, default=list)     # List[str]
    parsing_warnings = Column(JSON, default=list)             # List[str] (includes prompt-injection or OCR warnings)
    recommendation_for_human_review = Column(Text, default="")
    model_version = Column(String(100), default="gemini-2.5-flash")
    hr_decision = Column(String(50), default="Pending")       # Pending | Approved | Declined | Overridden
    hr_decision_by = Column(String(100), nullable=True)
    hr_decision_reason = Column(Text, nullable=True)
    hr_decision_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    candidate = relationship("Candidate", back_populates="evaluation")


class Screening(Base):
    __tablename__ = "screenings"

    screening_id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id"), nullable=False, unique=True)
    requisition_id = Column(Integer, ForeignKey("requisitions.requisition_id"), nullable=False)
    call_status = Column(String(80), default="Not Started")   # Not Started | In Progress | Completed | No Answer | Escalated to Human | Alternative Requested
    consent_status = Column(String(80), default="Pending")    # Pending | Granted | Declined (Non-Recorded Mode) | Declined (Human Requested)
    retry_count = Column(Integer, default=0)
    question_answer_pairs = Column(JSON, default=list)        # List[{question, candidate_answer, status, agent_note}]
    candidate_stated_availability = Column(String(255), default="Not stated yet")
    role_requirement_responses = Column(JSON, default=dict)
    unresolved_questions = Column(JSON, default=list)
    concise_summary = Column(Text, default="")
    agent_interpretation_notes = Column(Text, default="")
    recommended_next_step_for_human_review = Column(Text, default="")
    call_timestamp = Column(DateTime(timezone=True), default=utcnow)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    hr_decision = Column(String(50), default="Pending")       # Pending | Approved for Interview | Closed
    hr_notes = Column(Text, nullable=True)

    candidate = relationship("Candidate", back_populates="screening")


class Interview(Base):
    __tablename__ = "interviews"

    interview_id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id"), nullable=False, unique=True)
    requisition_id = Column(Integer, ForeignKey("requisitions.requisition_id"), nullable=False)
    interviewer_id = Column(String(80), default="INT-01")
    interviewer_name = Column(String(120), default="Sarah Jenkins (Lead ML Engineer)")
    interviewer_email = Column(String(150), default="sarah.jenkins@company.example")
    interviewer_timezone = Column(String(60), default="Asia/Karachi")
    duration_minutes = Column(Integer, default=45)
    proposed_slots = Column(JSON, default=list)               # List[{slot_id, start_utc, candidate_local, interviewer_local, match_reason}]
    confirmed_slot = Column(JSON, nullable=True)
    timezone = Column(String(60), default="Asia/Karachi")
    meeting_details = Column(JSON, default=dict)              # {platform, meeting_link, location, reschedule_contact}
    email_draft = Column(Text, default="")
    approval_status = Column(String(50), default="Draft")     # Draft | Approved | Rejected
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    send_status = Column(String(50), default="Not Sent")      # Not Sent | Sent | Failed | Cancelled
    provider_message_id = Column(String(120), nullable=True)
    idempotency_key = Column(String(120), nullable=True, index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(60), default="Proposed")

    candidate = relationship("Candidate", back_populates="interview")


class CommunicationLog(Base):
    __tablename__ = "communication_logs"

    communication_id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id"), nullable=False)
    channel = Column(String(50), nullable=False)              # Email | Voice Call Simulator
    template_version = Column(String(50), default="v1.0-approved")
    subject = Column(String(255), default="")
    body_preview = Column(Text, default="")
    sent_at = Column(DateTime(timezone=True), default=utcnow)
    delivery_status = Column(String(50), default="Delivered") # Delivered | Failed | Simulated
    provider_reference = Column(String(120), default="")
    idempotency_key = Column(String(120), nullable=True, index=True)

    candidate = relationship("Candidate", back_populates="communications")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    event_id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(100), nullable=False)               # e.g., "HR Recruiter (Ayesha)", "Agent 1 (Resume Scoring)"
    actor_role = Column(String(60), default="HR Recruiter")
    action = Column(String(120), nullable=False)
    entity_type = Column(String(60), nullable=False)          # Requisition | Candidate | ResumeEvaluation | Screening | Interview
    entity_id = Column(Integer, nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.candidate_id"), nullable=True)
    requisition_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow)
    details = Column(JSON, default=dict)

    candidate = relationship("Candidate", back_populates="audit_events")

