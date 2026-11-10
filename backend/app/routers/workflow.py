import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Header, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, ACTIVE_DB_ENGINE_NAME
from ..config import GEMINI_MODEL, DATA_RETENTION_DAYS, MAX_UPLOAD_SIZE_MB, MAX_CALL_RETRY_ATTEMPTS, UPLOAD_DIR
from ..models import (
    Requisition,
    Candidate,
    ResumeEvaluation,
    Screening,
    Interview,
    CommunicationLog,
    AuditEvent,
    CANDIDATE_STATUSES,
    utcnow,
)
from ..schemas import (
    RequisitionCreate,
    ShortlistDecisionRequest,
    ScreeningSimulationRequest,
    ScreeningReviewRequest,
    SlotProposalRequest,
    InvitationDraftRequest,
    SendInvitationApprovalRequest,
)
from ..services.resume_parser import parse_resume_bytes
from ..services.audit_service import log_audit_event
from ..services.gemini_client import is_gemini_configured
from ..services.seed_service import seed_demo_dataset, ensure_sample_files_on_disk
from ..agents.scoring_agent import score_resume_with_agent1
from ..agents.screening_agent import run_screening_call_agent2, filter_approved_questions
from ..agents.scheduling_agent import (
    get_interviewers_list,
    propose_slots_with_agent3,
    draft_invitation_email_agent3,
)

router = APIRouter(prefix="/api", tags=["HR Hiring Workflow"])


def serialize_candidate(cand: Candidate) -> dict:
    eval_obj = cand.evaluation
    scr_obj = cand.screening
    int_obj = cand.interview
    req_obj = cand.requisition

    return {
        "candidate_id": cand.candidate_id,
        "requisition_id": cand.requisition_id,
        "job_title": req_obj.title if req_obj else "Open Role",
        "department": req_obj.department if req_obj else "",
        "name": cand.name,
        "email": cand.email,
        "phone": cand.phone,
        "timezone": cand.timezone,
        "resume_filename": cand.resume_filename,
        "extracted_text_preview": (cand.extracted_text[:600] + "...") if len(cand.extracted_text or "") > 600 else (cand.extracted_text or ""),
        "extracted_text": cand.extracted_text or "",
        "consent_preferences": cand.consent_preferences,
        "current_status": cand.current_status,
        "status_reason": cand.status_reason,
        "created_at": cand.created_at.isoformat() if cand.created_at else None,
        "updated_at": cand.updated_at.isoformat() if cand.updated_at else None,
        "evaluation": {
            "evaluation_id": eval_obj.evaluation_id,
            "total_score": eval_obj.total_score,
            "criterion_scores": eval_obj.criterion_scores,
            "evidence": eval_obj.evidence,
            "missing_or_unclear_items": eval_obj.missing_or_unclear_items,
            "parsing_warnings": eval_obj.parsing_warnings,
            "recommendation_for_human_review": eval_obj.recommendation_for_human_review,
            "model_version": eval_obj.model_version,
            "hr_decision": eval_obj.hr_decision,
            "hr_decision_by": eval_obj.hr_decision_by,
            "hr_decision_reason": eval_obj.hr_decision_reason,
            "hr_decision_at": eval_obj.hr_decision_at.isoformat() if eval_obj.hr_decision_at else None,
        }
        if eval_obj
        else None,
        "screening": {
            "screening_id": scr_obj.screening_id,
            "call_status": scr_obj.call_status,
            "consent_status": scr_obj.consent_status,
            "retry_count": scr_obj.retry_count,
            "question_answer_pairs": scr_obj.question_answer_pairs,
            "candidate_stated_availability": scr_obj.candidate_stated_availability,
            "role_requirement_responses": scr_obj.role_requirement_responses,
            "unresolved_questions": scr_obj.unresolved_questions,
            "concise_summary": scr_obj.concise_summary,
            "agent_interpretation_notes": scr_obj.agent_interpretation_notes,
            "recommended_next_step_for_human_review": scr_obj.recommended_next_step_for_human_review,
            "call_timestamp": scr_obj.call_timestamp.isoformat() if scr_obj.call_timestamp else None,
            "reviewed_by": scr_obj.reviewed_by,
            "reviewed_at": scr_obj.reviewed_at.isoformat() if scr_obj.reviewed_at else None,
            "hr_decision": scr_obj.hr_decision,
            "hr_notes": scr_obj.hr_notes,
        }
        if scr_obj
        else None,
        "interview": {
            "interview_id": int_obj.interview_id,
            "interviewer_id": int_obj.interviewer_id,
            "interviewer_name": int_obj.interviewer_name,
            "interviewer_email": int_obj.interviewer_email,
            "interviewer_timezone": int_obj.interviewer_timezone,
            "duration_minutes": int_obj.duration_minutes,
            "proposed_slots": int_obj.proposed_slots,
            "confirmed_slot": int_obj.confirmed_slot,
            "timezone": int_obj.timezone,
            "meeting_details": int_obj.meeting_details,
            "email_draft": int_obj.email_draft,
            "approval_status": int_obj.approval_status,
            "approved_by": int_obj.approved_by,
            "approved_at": int_obj.approved_at.isoformat() if int_obj.approved_at else None,
            "send_status": int_obj.send_status,
            "provider_message_id": int_obj.provider_message_id,
            "idempotency_key": int_obj.idempotency_key,
            "sent_at": int_obj.sent_at.isoformat() if int_obj.sent_at else None,
            "status": int_obj.status,
        }
        if int_obj
        else None,
        "communications": [
            {
                "communication_id": c.communication_id,
                "channel": c.channel,
                "template_version": c.template_version,
                "subject": c.subject,
                "body_preview": c.body_preview,
                "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                "delivery_status": c.delivery_status,
                "provider_reference": c.provider_reference,
            }
            for c in cand.communications
        ],
        "audit_events": [
            {
                "event_id": e.event_id,
                "actor": e.actor,
                "actor_role": e.actor_role,
                "action": e.action,
                "entity_type": e.entity_type,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "details": e.details,
            }
            for e in sorted(cand.audit_events, key=lambda x: x.event_id, reverse=True)
        ],
    }


def verify_authorized_role(role: str):
    """FR-15: Access Control check ensuring candidate progression & configuration are restricted to authorized staff."""
    allowed = {"HR Recruiter", "Administrator", "Hiring Manager"}
    if role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Access Denied (FR-15): Role '{role}' is not authorized to perform this action.",
        )


@router.get("/health")
def get_system_health(db: Session = Depends(get_db)):
    sample_files = ensure_sample_files_on_disk()
    req_count = db.query(Requisition).count()
    cand_count = db.query(Candidate).count()
    return {
        "status": "healthy",
        "database_engine": ACTIVE_DB_ENGINE_NAME,
        "gemini_configured": is_gemini_configured(),
        "model_version": f"{GEMINI_MODEL} (Live Google Gemini API)" if is_gemini_configured() else f"{GEMINI_MODEL} (Deterministic Structured Guard)",
        "retention_days": DATA_RETENTION_DAYS,
        "max_upload_size_mb": MAX_UPLOAD_SIZE_MB,
        "max_call_retry_attempts": MAX_CALL_RETRY_ATTEMPTS,
        "lifecycle_statuses": CANDIDATE_STATUSES,
        "requisitions_count": req_count,
        "candidates_count": cand_count,
        "sample_files": sample_files,
    }


@router.get("/candidates")
def list_all_candidates(
    requisition_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Returns all candidates across all job requisitions (or filtered by requisition_id)."""
    query = db.query(Candidate)
    if requisition_id is not None:
        query = query.filter(Candidate.requisition_id == requisition_id)
    cands = query.all()
    serialized = [serialize_candidate(c) for c in cands]
    serialized.sort(
        key=lambda c: (
            c["candidate_id"],
            c["evaluation"]["total_score"] if c["evaluation"] else -1.0,
        ),
        reverse=True,
    )
    return serialized


@router.delete("/requisitions/{requisition_id}")
def delete_requisition(
    requisition_id: int,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    verify_authorized_role(x_user_role)
    req = db.query(Requisition).filter(Requisition.requisition_id == requisition_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found.")
    title = req.title
    db.delete(req)
    db.commit()
    return {"message": f"Job Requisition '{title}' deleted."}


@router.post("/demo/seed")
def trigger_demo_seed(db: Session = Depends(get_db)):
    result = seed_demo_dataset(db)
    return {"message": "Synthetic demo dataset seeded successfully.", **result}


@router.post("/demo/reset")
def reset_and_reseed_demo(reseed: bool = True, db: Session = Depends(get_db)):
    db.query(AuditEvent).delete()
    db.query(CommunicationLog).delete()
    db.query(Interview).delete()
    db.query(Screening).delete()
    db.query(ResumeEvaluation).delete()
    db.query(Candidate).delete()
    db.query(Requisition).delete()
    db.commit()

    if reseed:
        result = seed_demo_dataset(db, actor="Administrator (System Reset)")
        return {"message": "Database reset and synthetic demo dataset loaded.", **result}
    return {"message": "Database cleared."}


@router.get("/requisitions")
def list_requisitions(db: Session = Depends(get_db)):
    reqs = db.query(Requisition).order_by(Requisition.requisition_id.asc()).all()
    output = []
    for r in reqs:
        status_counts = {}
        for c in r.candidates:
            status_counts[c.current_status] = status_counts.get(c.current_status, 0) + 1
        output.append(
            {
                "requisition_id": r.requisition_id,
                "title": r.title,
                "department": r.department,
                "location_work_arrangement": r.location_work_arrangement,
                "min_experience_years": r.min_experience_years,
                "job_description": r.job_description,
                "required_skills": r.required_skills,
                "preferred_skills": r.preferred_skills,
                "screening_questions": r.screening_questions,
                "rubric": r.rubric,
                "status": r.status,
                "created_by": r.created_by,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "candidate_count": len(r.candidates),
                "status_counts": status_counts,
            }
        )
    return output


@router.post("/requisitions")
def create_requisition(
    payload: RequisitionCreate,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    verify_authorized_role(x_user_role)
    questions = filter_approved_questions(payload.screening_questions, payload.title)
    req = Requisition(
        title=payload.title,
        department=payload.department,
        location_work_arrangement=payload.location_work_arrangement,
        min_experience_years=payload.min_experience_years,
        job_description=payload.job_description,
        required_skills=payload.required_skills,
        preferred_skills=payload.preferred_skills,
        screening_questions=questions,
        rubric=payload.rubric.model_dump(),
        status="Open",
        created_by=payload.created_by,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    log_audit_event(
        db=db,
        actor=payload.created_by,
        actor_role=x_user_role,
        action="Created Job Requisition & Rubric (FR-01)",
        entity_type="Requisition",
        entity_id=req.requisition_id,
        requisition_id=req.requisition_id,
        details={"title": req.title, "rubric": req.rubric},
    )
    return {"requisition_id": req.requisition_id, "title": req.title, "rubric": req.rubric}


@router.get("/requisitions/{requisition_id}")
def get_requisition_detail(requisition_id: int, db: Session = Depends(get_db)):
    req = db.query(Requisition).filter(Requisition.requisition_id == requisition_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found.")

    serialized_candidates = [serialize_candidate(c) for c in req.candidates]
    # Sort ranked review queue by score descending; keep unscored/unreadable visible at bottom
    serialized_candidates.sort(
        key=lambda c: (
            c["evaluation"]["total_score"] if c["evaluation"] else -1.0,
            c["candidate_id"],
        ),
        reverse=True,
    )

    return {
        "requisition_id": req.requisition_id,
        "title": req.title,
        "department": req.department,
        "location_work_arrangement": req.location_work_arrangement,
        "min_experience_years": req.min_experience_years,
        "job_description": req.job_description,
        "required_skills": req.required_skills,
        "preferred_skills": req.preferred_skills,
        "screening_questions": req.screening_questions,
        "rubric": req.rubric,
        "status": req.status,
        "created_by": req.created_by,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "candidates": serialized_candidates,
    }


@router.post("/requisitions/{requisition_id}/resumes")
async def upload_and_score_resumes(
    requisition_id: int,
    files: List[UploadFile] = File(...),
    actor: str = Form(default="HR Recruiter"),
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """
    FR-02 & FR-03: Accepts multiple PDF/DOCX resumes, validates file format & size,
    flags unreadable files as 'Needs Manual Review', and runs Agent 1 (Resume Scoring Agent)
    for valid resumes without automatically contacting or rejecting anyone.
    """
    verify_authorized_role(x_user_role)
    req = db.query(Requisition).filter(Requisition.requisition_id == requisition_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found.")

    processed_results = []
    for upload in files:
        content = await upload.read()
        fname = upload.filename or "uploaded_resume.pdf"
        save_path = UPLOAD_DIR / f"req_{requisition_id}_{uuid.uuid4().hex[:6]}_{fname}"
        save_path.write_bytes(content)

        is_valid, extracted_text, warnings, meta = parse_resume_bytes(fname, content)

        cand = Candidate(
            requisition_id=req.requisition_id,
            name=meta["name"],
            email=meta["email"],
            phone=meta["phone"],
            timezone=meta["timezone"],
            resume_filename=fname,
            resume_reference=str(save_path),
            extracted_text=extracted_text if is_valid else "",
            current_status="Scored — HR Review" if is_valid else "Needs Manual Review",
            status_reason=(
                "Scored by Agent 1; awaiting human shortlist decision."
                if is_valid
                else (warnings[0] if warnings else "Unreadable file; flagged for manual HR review.")
            ),
        )
        db.add(cand)
        db.commit()
        db.refresh(cand)

        if is_valid:
            score_data = score_resume_with_agent1(
                extracted_text=extracted_text,
                job_description=req.job_description,
                required_skills=req.required_skills,
                preferred_skills=req.preferred_skills,
                min_experience_years=req.min_experience_years,
                rubric=req.rubric,
                parsing_warnings=warnings,
            )
            eval_record = ResumeEvaluation(
                candidate_id=cand.candidate_id,
                requisition_id=req.requisition_id,
                total_score=score_data["overall_score"],
                criterion_scores=score_data["criterion_scores"],
                evidence=score_data["evidence"],
                missing_or_unclear_items=score_data["missing_or_unclear_items"],
                parsing_warnings=score_data["parsing_warnings"],
                recommendation_for_human_review=score_data["recommendation_for_human_review"],
                model_version=score_data["model_version"],
                hr_decision="Pending",
            )
            db.add(eval_record)
            db.commit()
            db.refresh(cand)

            log_audit_event(
                db=db,
                actor="Agent 1 (Resume Scoring Agent)",
                actor_role="AI Agent",
                action="Evaluated Resume & Produced Explainable Score Breakdown",
                entity_type="ResumeEvaluation",
                entity_id=eval_record.evaluation_id,
                candidate_id=cand.candidate_id,
                requisition_id=req.requisition_id,
                details={
                    "filename": fname,
                    "overall_score": eval_record.total_score,
                    "model_version": eval_record.model_version,
                    "warnings": warnings,
                },
            )
        else:
            log_audit_event(
                db=db,
                actor=actor,
                actor_role=x_user_role,
                action="Upload Flagged for Manual Review (Unreadable / Unsupported File)",
                entity_type="Candidate",
                entity_id=cand.candidate_id,
                candidate_id=cand.candidate_id,
                requisition_id=req.requisition_id,
                details={"filename": fname, "warnings": warnings},
            )

        processed_results.append(serialize_candidate(cand))

    return {"processed_count": len(processed_results), "candidates": processed_results}


@router.post("/candidates/{candidate_id}/shortlist-decision")
def record_human_shortlist_decision(
    candidate_id: int,
    payload: ShortlistDecisionRequest,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """
    Human Approval Gate #1 (FR-04, AC-04):
    Allows authorized HR users to review, approve, override, or decline Agent 1's recommendation.
    No candidate can be contacted by Agent 2 without passing this human gate.
    """
    verify_authorized_role(x_user_role)
    if x_user_role not in {"HR Recruiter", "Administrator"}:
        raise HTTPException(
            status_code=403,
            detail="Only HR Recruiters or Administrators can approve or override shortlist decisions.",
        )

    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    if payload.decision in {"Approved", "Overridden"}:
        cand.current_status = "Approved for Screening"
        cand.status_reason = f"Human Gate #1 ({payload.decision} by {payload.actor}): {payload.reason}"
    elif payload.decision == "Declined":
        cand.current_status = "Closed"
        cand.status_reason = f"Closed at Shortlist Review by {payload.actor}: {payload.reason}"
    else:
        raise HTTPException(status_code=400, detail="Decision must be 'Approved', 'Overridden', or 'Declined'.")

    if cand.evaluation:
        cand.evaluation.hr_decision = payload.decision
        cand.evaluation.hr_decision_by = payload.actor
        cand.evaluation.hr_decision_reason = payload.reason
        cand.evaluation.hr_decision_at = utcnow()

    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        actor=payload.actor,
        actor_role=x_user_role,
        action=f"Human Gate #1: Shortlist {payload.decision}",
        entity_type="Candidate",
        entity_id=cand.candidate_id,
        candidate_id=cand.candidate_id,
        requisition_id=cand.requisition_id,
        details={
            "decision": payload.decision,
            "reason": payload.reason,
            "new_status": cand.current_status,
            "agent1_score": cand.evaluation.total_score if cand.evaluation else None,
        },
    )

    return serialize_candidate(cand)


@router.post("/candidates/{candidate_id}/screening/run")
def run_candidate_screening_call(
    candidate_id: int,
    payload: ScreeningSimulationRequest,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """
    Agent 2 — Candidate Screening Call Agent (FR-05, FR-06, FR-07, AC-04, AC-05, AC-06):
    Strictly enforces that the candidate was approved at Human Gate #1 before initiating contact.
    Handles consent, structured Q&A, escalation to human, no-answer retry limits, and factual summary.
    """
    verify_authorized_role(x_user_role)
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    allowed_statuses = {
        "Approved for Screening",
        "Screening Scheduled / Pending",
        "Screening Completed — HR Review",
        "Needs Manual Review",
    }
    if cand.current_status not in allowed_statuses or (
        cand.evaluation and cand.evaluation.hr_decision not in {"Approved", "Overridden"}
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Guardrail Violation (FR-04 / AC-04): Cannot contact candidate in status '{cand.current_status}'. "
                "Human Recruiter must explicitly approve the candidate for screening first."
            ),
        )

    req = cand.requisition
    existing_screening = cand.screening
    current_retries = existing_screening.retry_count if existing_screening else 0

    # Idempotency & Retry Policy Guard (Section 14)
    if payload.mode == "no_answer" and current_retries >= MAX_CALL_RETRY_ATTEMPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Retry Policy Guard (Section 14): Maximum call retry attempts ({MAX_CALL_RETRY_ATTEMPTS}) already reached. Route to manual email follow-up.",
        )

    result = run_screening_call_agent2(
        candidate_name=cand.name,
        job_title=req.title,
        approved_questions=req.screening_questions,
        mode=payload.mode,
        custom_answers=payload.custom_answers,
        candidate_stated_availability=payload.candidate_stated_availability,
        current_retry_count=current_retries,
    )

    if not existing_screening:
        existing_screening = Screening(
            candidate_id=cand.candidate_id,
            requisition_id=cand.requisition_id,
        )
        db.add(existing_screening)

    existing_screening.call_status = result["call_status"]
    existing_screening.consent_status = result["consent_status"]
    existing_screening.retry_count = result["retry_count"]
    existing_screening.question_answer_pairs = result["question_answer_pairs"]
    existing_screening.candidate_stated_availability = result["candidate_stated_availability"]
    existing_screening.role_requirement_responses = result["role_requirement_responses"]
    existing_screening.unresolved_questions = result["unresolved_questions"]
    existing_screening.concise_summary = result["concise_summary"]
    existing_screening.agent_interpretation_notes = result["agent_interpretation_notes"]
    existing_screening.recommended_next_step_for_human_review = result["recommended_next_step_for_human_review"]
    existing_screening.call_timestamp = utcnow()
    existing_screening.hr_decision = "Pending"

    cand.consent_preferences = {
        "call_consent": result["consent_status"],
        "recording_consent": "Granted" if "Granted" in result["consent_status"] else "Declined",
    }
    cand.current_status = result["target_candidate_status"]
    cand.status_reason = f"Agent 2 Call Outcome: {result['call_status']} ({result['consent_status']})"

    comm = CommunicationLog(
        candidate_id=cand.candidate_id,
        channel="Voice Call Simulator (Agent 2)",
        template_version="v1.0-screening-script",
        subject=f"Screening Call ({payload.mode}) — {req.title}",
        body_preview=result["concise_summary"][:280],
        delivery_status=result["call_status"],
        provider_reference=f"SIM-CALL-{uuid.uuid4().hex[:8].upper()}",
    )
    db.add(comm)
    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        actor="Agent 2 (Screening Call Agent)",
        actor_role="AI Agent",
        action=f"Executed Screening Call (Mode: {payload.mode})",
        entity_type="Screening",
        entity_id=existing_screening.screening_id,
        candidate_id=cand.candidate_id,
        requisition_id=cand.requisition_id,
        details={
            "mode": payload.mode,
            "call_status": result["call_status"],
            "consent_status": result["consent_status"],
            "unresolved_count": len(result["unresolved_questions"]),
            "new_status": cand.current_status,
        },
    )

    return serialize_candidate(cand)


@router.post("/candidates/{candidate_id}/screening/review")
def review_screening_outcome(
    candidate_id: int,
    payload: ScreeningReviewRequest,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """
    Human Approval Gate #2 (FR-08):
    HR reviews Agent 2's screening transcript & summary and explicitly approves progression
    to 'Approved for Interview' or closes the candidate.
    """
    verify_authorized_role(x_user_role)
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand or not cand.screening:
        raise HTTPException(status_code=404, detail="Candidate or screening record not found.")

    if payload.decision == "Approved for Interview":
        cand.current_status = "Approved for Interview"
        cand.status_reason = f"Human Gate #2 (Approved by {payload.actor}): {payload.notes}"
    elif payload.decision == "Closed":
        cand.current_status = "Closed"
        cand.status_reason = f"Closed after Screening Review by {payload.actor}: {payload.notes}"
    else:
        raise HTTPException(status_code=400, detail="Decision must be 'Approved for Interview' or 'Closed'.")

    cand.screening.reviewed_by = payload.actor
    cand.screening.reviewed_at = utcnow()
    cand.screening.hr_decision = payload.decision
    cand.screening.hr_notes = payload.notes

    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        actor=payload.actor,
        actor_role=x_user_role,
        action=f"Human Gate #2: Screening Review -> {payload.decision}",
        entity_type="Screening",
        entity_id=cand.screening.screening_id,
        candidate_id=cand.candidate_id,
        requisition_id=cand.requisition_id,
        details={"decision": payload.decision, "notes": payload.notes, "new_status": cand.current_status},
    )

    return serialize_candidate(cand)


@router.get("/scheduling/interviewers")
def list_available_interviewers():
    return get_interviewers_list()


@router.post("/candidates/{candidate_id}/scheduling/propose-slots")
def propose_interview_slots(
    candidate_id: int,
    payload: SlotProposalRequest,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """
    Agent 3 — Interview Scheduling Agent (FR-09, AC-07):
    Checks interviewer calendar availability & candidate time zone.
    Handles calendar API failure and no-shared-availability edge cases gracefully.
    """
    verify_authorized_role(x_user_role)
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    if cand.current_status not in {"Approved for Interview", "Interview Proposed", "Needs Manual Review"}:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Guardrail Violation (FR-08): Cannot propose interview slots while candidate is in '{cand.current_status}'. "
                "HR must approve screening outcome at Gate #2 first."
            ),
        )

    if payload.simulate_api_failure:
        log_audit_event(
            db=db,
            actor="Agent 3 (Interview Scheduling Agent)",
            actor_role="AI Agent",
            action="Calendar API Failure Detected (Safe Recovery)",
            entity_type="Candidate",
            entity_id=cand.candidate_id,
            candidate_id=cand.candidate_id,
            requisition_id=cand.requisition_id,
            details={"error": "Simulated Calendar Provider Timeout (503). State preserved for safe retry."},
        )
        raise HTTPException(
            status_code=503,
            detail="Calendar Integration Failure (Simulated 503): Could not read interviewer calendar. Candidate state is preserved; please retry safely.",
        )

    if payload.candidate_timezone:
        cand.timezone = payload.candidate_timezone

    stated_avail = cand.screening.candidate_stated_availability if cand.screening else "Weekdays 10:00 AM - 4:00 PM"
    proposal = propose_slots_with_agent3(
        candidate_name=cand.name,
        candidate_timezone=cand.timezone,
        candidate_stated_availability=stated_avail,
        interviewer_id=payload.interviewer_id,
        duration_minutes=payload.duration_minutes,
    )

    interviewer_info = proposal["interviewer"]
    interview_obj = cand.interview
    if not interview_obj:
        interview_obj = Interview(
            candidate_id=cand.candidate_id,
            requisition_id=cand.requisition_id,
        )
        db.add(interview_obj)

    interview_obj.interviewer_id = interviewer_info["interviewer_id"]
    interview_obj.interviewer_name = interviewer_info["name"]
    interview_obj.interviewer_email = interviewer_info["email"]
    interview_obj.interviewer_timezone = interviewer_info["timezone"]
    interview_obj.duration_minutes = payload.duration_minutes
    interview_obj.proposed_slots = proposal["proposed_slots"]
    interview_obj.timezone = proposal["candidate_timezone"]

    # Edge Case: No Shared Availability (Section 14)
    if not proposal["has_shared_availability"]:
        cand.current_status = "Needs Manual Review"
        cand.status_reason = (
            f"No shared availability found with {interviewer_info['name']}. Routed to HR for manual scheduling coordination."
        )
        interview_obj.status = "No Shared Availability"
    else:
        cand.current_status = "Interview Proposed"
        cand.status_reason = (
            f"Agent 3 proposed {len(proposal['proposed_slots'])} verified slots with {interviewer_info['name']}."
        )
        interview_obj.status = "Slots Proposed"

    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        actor="Agent 3 (Interview Scheduling Agent)",
        actor_role="AI Agent",
        action="Checked Availability & Proposed Interview Slots",
        entity_type="Interview",
        entity_id=interview_obj.interview_id,
        candidate_id=cand.candidate_id,
        requisition_id=cand.requisition_id,
        details={
            "interviewer": interviewer_info["name"],
            "interviewer_timezone": interviewer_info["timezone"],
            "candidate_timezone": cand.timezone,
            "slots_count": len(proposal["proposed_slots"]),
        },
    )

    return serialize_candidate(cand)


@router.post("/candidates/{candidate_id}/scheduling/draft-invitation")
def draft_interview_invitation(
    candidate_id: int,
    payload: InvitationDraftRequest,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """
    Agent 3 (FR-10): Selects a proposed slot and drafts the interview invitation email.
    Does NOT send the email until Human Gate #3 confirmation.
    """
    verify_authorized_role(x_user_role)
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand or not cand.interview:
        raise HTTPException(status_code=404, detail="Candidate or interview proposal not found.")

    interview_obj = cand.interview
    matching_slot = next(
        (s for s in (interview_obj.proposed_slots or []) if s["slot_id"] == payload.slot_id),
        None,
    )
    if not matching_slot:
        raise HTTPException(
            status_code=400,
            detail=f"Slot '{payload.slot_id}' is not in the verified proposed slots list (AC-07).",
        )

    draft_data = draft_invitation_email_agent3(
        candidate_name=cand.name,
        candidate_email=cand.email,
        job_title=cand.requisition.title,
        interviewer_name=interview_obj.interviewer_name,
        interviewer_email=interview_obj.interviewer_email,
        selected_slot=matching_slot,
    )

    interview_obj.confirmed_slot = matching_slot
    interview_obj.meeting_details = draft_data["meeting_details"]
    interview_obj.email_draft = payload.custom_email_body or draft_data["email_draft"]
    interview_obj.approval_status = "Pending HR Confirmation"
    interview_obj.status = "Draft Ready for Approval"

    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        actor="Agent 3 (Interview Scheduling Agent)",
        actor_role="AI Agent",
        action="Prepared Interview Invitation Draft (Awaiting Gate #3 Approval)",
        entity_type="Interview",
        entity_id=interview_obj.interview_id,
        candidate_id=cand.candidate_id,
        requisition_id=cand.requisition_id,
        details={
            "slot_id": matching_slot["slot_id"],
            "candidate_local_time": matching_slot["candidate_local_time"],
            "interviewer_local_time": matching_slot["interviewer_local_time"],
        },
    )

    return serialize_candidate(cand)


@router.post("/candidates/{candidate_id}/scheduling/send-invitation")
def approve_and_send_invitation(
    candidate_id: int,
    payload: SendInvitationApprovalRequest,
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """
    Human Approval Gate #3 (FR-11, AC-08, AC-10):
    Requires explicit human confirmation before sending the interview invitation.
    Enforces idempotency so retries or double-clicks never send duplicate invitations.
    """
    verify_authorized_role(x_user_role)
    if not payload.approved:
        raise HTTPException(
            status_code=400,
            detail="Guardrail Violation (FR-11 / AC-08): Explicit HR approval is required before sending an interview invitation.",
        )

    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand or not cand.interview or not cand.interview.confirmed_slot:
        raise HTTPException(
            status_code=400,
            detail="Cannot send invitation: No confirmed slot or email draft exists for this candidate.",
        )

    interview_obj = cand.interview
    slot_id = interview_obj.confirmed_slot.get("slot_id", "SLOT")
    idem_key = payload.idempotency_key or f"INV-{cand.candidate_id}-{slot_id}"

    # Idempotency Check (Section 14 & AC-10)
    if interview_obj.send_status == "Sent" and interview_obj.idempotency_key == idem_key:
        return {
            "idempotent_replay": True,
            "message": f"Idempotency Check Passed: Invitation '{idem_key}' was already sent. Duplicate email prevented.",
            "candidate": serialize_candidate(cand),
        }

    if payload.custom_email_body:
        interview_obj.email_draft = payload.custom_email_body

    # Edge Case: Email Provider Failure (Section 14 & AC-10)
    if payload.simulate_email_failure:
        interview_obj.approval_status = "Approved (Send Failed — Ready for Retry)"
        interview_obj.approved_by = payload.actor
        interview_obj.approved_at = utcnow()
        interview_obj.send_status = "Failed"
        db.commit()
        db.refresh(cand)

        log_audit_event(
            db=db,
            actor=payload.actor,
            actor_role=x_user_role,
            action="Email Delivery Failure (Draft Retained for Safe Retry)",
            entity_type="Interview",
            entity_id=interview_obj.interview_id,
            candidate_id=cand.candidate_id,
            requisition_id=cand.requisition_id,
            details={"error": "Simulated SMTP/Email Provider 502 Error. Draft retained; status NOT marked as sent."},
        )
        raise HTTPException(
            status_code=502,
            detail="Email Provider Failure (Simulated 502): Invitation was NOT sent. Email draft and approval have been retained for a safe retry.",
        )

    msg_id = f"MSG-{uuid.uuid4().hex[:10].upper()}"
    interview_obj.approval_status = "Approved"
    interview_obj.approved_by = payload.actor
    interview_obj.approved_at = utcnow()
    interview_obj.send_status = "Sent"
    interview_obj.provider_message_id = msg_id
    interview_obj.idempotency_key = idem_key
    interview_obj.sent_at = utcnow()
    interview_obj.status = "Interview Scheduled"

    cand.current_status = "Interview Scheduled"
    cand.status_reason = (
        f"Human Gate #3 Approved by {payload.actor}. Invitation sent ({interview_obj.confirmed_slot['candidate_local_time']})."
    )

    comm = CommunicationLog(
        candidate_id=cand.candidate_id,
        channel="Email (Mock Adapter)",
        template_version="v1.0-interview-invite",
        subject=f"Interview Invitation: {cand.requisition.title} — {cand.name}",
        body_preview=interview_obj.email_draft[:300],
        delivery_status="Delivered",
        provider_reference=msg_id,
        idempotency_key=idem_key,
    )
    db.add(comm)
    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        actor=payload.actor,
        actor_role=x_user_role,
        action="Human Gate #3: Approved & Sent Interview Invitation",
        entity_type="Interview",
        entity_id=interview_obj.interview_id,
        candidate_id=cand.candidate_id,
        requisition_id=cand.requisition_id,
        details={
            "provider_message_id": msg_id,
            "idempotency_key": idem_key,
            "confirmed_slot": interview_obj.confirmed_slot["candidate_local_time"],
        },
    )

    return {
        "idempotent_replay": False,
        "message": "Interview invitation approved and sent successfully.",
        "candidate": serialize_candidate(cand),
    }


@router.post("/candidates/{candidate_id}/manual-resolve")
def resolve_manual_review_candidate(
    candidate_id: int,
    target_status: str = Form(...),
    reason: str = Form(...),
    actor: str = Form(default="HR Recruiter"),
    x_user_role: str = Header(default="HR Recruiter"),
    db: Session = Depends(get_db),
):
    """Allows HR Recruiter to manually transition a candidate out of 'Needs Manual Review'."""
    verify_authorized_role(x_user_role)
    if target_status not in CANDIDATE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status '{target_status}'.")

    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    old_status = cand.current_status
    cand.current_status = target_status
    cand.status_reason = f"Manual HR Resolution by {actor}: {reason}"
    if target_status == "Approved for Screening" and cand.evaluation:
        cand.evaluation.hr_decision = "Overridden"
        cand.evaluation.hr_decision_by = actor
        cand.evaluation.hr_decision_reason = reason
        cand.evaluation.hr_decision_at = utcnow()

    db.commit()
    db.refresh(cand)

    log_audit_event(
        db=db,
        actor=actor,
        actor_role=x_user_role,
        action=f"Manual Exception Resolution: {old_status} -> {target_status}",
        entity_type="Candidate",
        entity_id=cand.candidate_id,
        candidate_id=cand.candidate_id,
        requisition_id=cand.requisition_id,
        details={"old_status": old_status, "new_status": target_status, "reason": reason},
    )
    return serialize_candidate(cand)


@router.delete("/candidates/{candidate_id}")
def delete_candidate_record(
    candidate_id: int,
    actor: str = "Administrator",
    x_user_role: str = Header(default="Administrator"),
    db: Session = Depends(get_db),
):
    """Section 12 & 13 Privacy Control: Right to deletion / data retention enforcement."""
    verify_authorized_role(x_user_role)
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    req_id = cand.requisition_id
    cand_name = cand.name
    db.delete(cand)
    db.commit()

    log_audit_event(
        db=db,
        actor=actor,
        actor_role=x_user_role,
        action="Deleted Candidate Personal Data (Privacy / Retention Request)",
        entity_type="Candidate",
        entity_id=candidate_id,
        requisition_id=req_id,
        details={"deleted_candidate_id": candidate_id, "anonymized_reference": f"Deleted ({cand_name[:2]}***)"},
    )
    return {"message": f"Candidate #{candidate_id} personal data deleted in compliance with privacy controls."}


@router.get("/audit-logs")
def list_audit_logs(
    requisition_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(AuditEvent)
    if requisition_id is not None:
        query = query.filter(AuditEvent.requisition_id == requisition_id)
    if candidate_id is not None:
        query = query.filter(AuditEvent.candidate_id == candidate_id)
    events = query.order_by(AuditEvent.event_id.desc()).limit(limit).all()
    return [
        {
            "event_id": e.event_id,
            "actor": e.actor,
            "actor_role": e.actor_role,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "candidate_id": e.candidate_id,
            "requisition_id": e.requisition_id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "details": e.details,
        }
        for e in events
    ]


# ==============================================================================
# SAAS AUTHENTICATION & PUBLIC CANDIDATE PORTAL ENDPOINTS (Section 5 & FR-15)
# ==============================================================================

DEMO_STAFF_ACCOUNTS = {
    "recruiter@talentsense.ai": {
        "password": "password123",
        "name": "Ayesha Khan (Lead HR Recruiter)",
        "role": "HR Recruiter",
        "title": "Senior Talent Acquisition Partner",
        "permissions": ["requisitions:write", "shortlist:approve", "screening:review", "scheduling:send"],
    },
    "manager@talentsense.ai": {
        "password": "password123",
        "name": "Sarah Jenkins (Lead ML Engineer)",
        "role": "Hiring Manager",
        "title": "Lead Machine Learning Engineer & Interviewer",
        "permissions": ["requisitions:read", "screening:review", "scheduling:propose"],
    },
    "admin@talentsense.ai": {
        "password": "password123",
        "name": "Ahmed Raza (System Administrator)",
        "role": "Administrator",
        "title": "Platform & Compliance Administrator",
        "permissions": ["all", "audit:read", "privacy:delete", "system:reset"],
    },
}


@router.get("/auth/demo-accounts")
def get_demo_staff_accounts():
    """Returns demo credentials for classroom demonstration (AC-12)."""
    return [
        {
            "email": email,
            "password": info["password"],
            "name": info["name"],
            "role": info["role"],
            "title": info["title"],
        }
        for email, info in DEMO_STAFF_ACCOUNTS.items()
    ]


@router.post("/auth/login")
def staff_login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    account = DEMO_STAFF_ACCOUNTS.get(email.strip().lower())
    if not account or account["password"] != password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. Use one of the demo staff accounts shown on the login screen.",
        )

    log_audit_event(
        db=db,
        actor=account["name"],
        actor_role=account["role"],
        action="Staff Portal Login (FR-15 Authenticated Session)",
        entity_type="AuthSession",
        entity_id=1,
        details={"email": email.strip().lower(), "role": account["role"]},
    )

    return {
        "token": f"ts-jwt-{uuid.uuid4().hex}",
        "user": {
            "email": email.strip().lower(),
            "name": account["name"],
            "role": account["role"],
            "title": account["title"],
            "permissions": account["permissions"],
        },
    }


@router.get("/public/jobs")
def list_public_jobs(db: Session = Depends(get_db)):
    """
    Public Careers Website Endpoint:
    Returns open job postings without exposing internal HR rubrics or candidate PII (FR-15).
    """
    reqs = (
        db.query(Requisition)
        .filter(Requisition.status == "Open")
        .order_by(Requisition.requisition_id.asc())
        .all()
    )
    return [
        {
            "requisition_id": r.requisition_id,
            "title": r.title,
            "department": r.department,
            "location_work_arrangement": r.location_work_arrangement,
            "min_experience_years": r.min_experience_years,
            "job_description": r.job_description,
            "required_skills": r.required_skills,
            "preferred_skills": r.preferred_skills,
            "screening_questions_count": len(r.screening_questions or []),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reqs
    ]


@router.post("/public/jobs/{requisition_id}/apply")
async def candidate_public_apply(
    requisition_id: int,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(default="+92-300-0000000"),
    timezone: str = Form(default="Asia/Karachi"),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Public Candidate Job Application Endpoint:
    Allows a candidate on the public website to apply for a posted job with their resume (PDF/DOCX).
    Extracts text, runs Agent 1 for the HR review queue, and returns a transparent application receipt.
    """
    req = db.query(Requisition).filter(Requisition.requisition_id == requisition_id).first()
    if not req or req.status != "Open":
        raise HTTPException(status_code=404, detail="This job requisition is no longer open.")

    content = await resume.read()
    fname = resume.filename or "candidate_resume.pdf"
    save_path = UPLOAD_DIR / f"public_req_{requisition_id}_{uuid.uuid4().hex[:6]}_{fname}"
    save_path.write_bytes(content)

    is_valid, extracted_text, warnings, meta = parse_resume_bytes(fname, content)

    cand = Candidate(
        requisition_id=req.requisition_id,
        name=name.strip() or meta["name"],
        email=email.strip().lower() or meta["email"],
        phone=phone.strip() or meta["phone"],
        timezone=timezone.strip() or meta["timezone"],
        resume_filename=fname,
        resume_reference=str(save_path),
        extracted_text=extracted_text if is_valid else "",
        current_status="Scored — HR Review" if is_valid else "Needs Manual Review",
        status_reason=(
            "Application submitted via Public Careers Portal; evaluated by Agent 1 and queued for Human HR Recruiter review."
            if is_valid
            else (warnings[0] if warnings else "Uploaded file requires manual HR verification.")
        ),
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)

    if is_valid:
        score_data = score_resume_with_agent1(
            extracted_text=extracted_text,
            job_description=req.job_description,
            required_skills=req.required_skills,
            preferred_skills=req.preferred_skills,
            min_experience_years=req.min_experience_years,
            rubric=req.rubric,
            parsing_warnings=warnings,
        )
        eval_record = ResumeEvaluation(
            candidate_id=cand.candidate_id,
            requisition_id=req.requisition_id,
            total_score=score_data["overall_score"],
            criterion_scores=score_data["criterion_scores"],
            evidence=score_data["evidence"],
            missing_or_unclear_items=score_data["missing_or_unclear_items"],
            parsing_warnings=score_data["parsing_warnings"],
            recommendation_for_human_review=score_data["recommendation_for_human_review"],
            model_version=score_data["model_version"],
            hr_decision="Pending",
        )
        db.add(eval_record)
        db.commit()

        log_audit_event(
            db=db,
            actor=f"Candidate ({cand.name})",
            actor_role="Candidate",
            action="Submitted Job Application via Public Careers Portal",
            entity_type="Candidate",
            entity_id=cand.candidate_id,
            candidate_id=cand.candidate_id,
            requisition_id=req.requisition_id,
            details={"job_title": req.title, "filename": fname, "agent1_queued": True},
        )
    else:
        log_audit_event(
            db=db,
            actor=f"Candidate ({cand.name})",
            actor_role="Candidate",
            action="Submitted Application (Flagged for Manual HR File Review)",
            entity_type="Candidate",
            entity_id=cand.candidate_id,
            candidate_id=cand.candidate_id,
            requisition_id=req.requisition_id,
            details={"job_title": req.title, "filename": fname, "warnings": warnings},
        )

    return {
        "message": "Your application has been submitted! An HR Recruiter will review your profile.",
        "application_id": cand.candidate_id,
        "candidate_name": cand.name,
        "email": cand.email,
        "job_title": req.title,
        "current_status": cand.current_status,
    }


@router.get("/public/candidate-portal")
def get_candidate_portal_status(email: str, db: Session = Depends(get_db)):
    """
    Candidate Self-Service Status & Screening Portal (Section 5: Candidate Role):
    Shows transparent application status, screening questions (once HR approves for screening),
    and confirmed interview invitation details—without exposing internal HR rubric scores.
    """
    clean_email = email.strip().lower()
    cands = (
        db.query(Candidate)
        .filter(Candidate.email.ilike(clean_email))
        .order_by(Candidate.candidate_id.desc())
        .all()
    )
    output = []
    for c in cands:
        req = c.requisition
        scr = c.screening
        intv = c.interview
        can_take_screening = c.current_status in {"Approved for Screening", "Screening Scheduled / Pending"}

        output.append(
            {
                "candidate_id": c.candidate_id,
                "name": c.name,
                "email": c.email,
                "timezone": c.timezone,
                "job_title": req.title if req else "Open Position",
                "department": req.department if req else "",
                "location_work_arrangement": req.location_work_arrangement if req else "",
                "current_status": c.current_status,
                "status_reason": c.status_reason,
                "applied_at": c.created_at.isoformat() if c.created_at else None,
                "can_take_screening": can_take_screening,
                "screening_questions": req.screening_questions if (req and can_take_screening) else [],
                "screening_completed": scr is not None and scr.call_status.startswith("Completed"),
                "screening_consent_status": scr.consent_status if scr else None,
                "interview_scheduled": c.current_status == "Interview Scheduled" and intv is not None,
                "interview_details": {
                    "interviewer_name": intv.interviewer_name,
                    "confirmed_slot": intv.confirmed_slot,
                    "meeting_details": intv.meeting_details,
                    "email_draft": intv.email_draft,
                }
                if (intv and c.current_status == "Interview Scheduled")
                else None,
            }
        )
    return output


@router.post("/public/candidates/{candidate_id}/self-screening")
def candidate_complete_self_screening(
    candidate_id: int,
    payload: ScreeningSimulationRequest,
    db: Session = Depends(get_db),
):
    """
    Allows an approved candidate in the Candidate Portal to participate in the AI Screening Call
    (granting/declining consent, answering questions, or requesting human assistance).
    """
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Application not found.")
    if cand.current_status not in {"Approved for Screening", "Screening Scheduled / Pending"}:
        raise HTTPException(
            status_code=400,
            detail="Screening call is only available after an HR Recruiter approves your shortlist application.",
        )

    return run_candidate_screening_call(
        candidate_id=candidate_id,
        payload=payload,
        x_user_role="HR Recruiter",
        db=db,
    )


