import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_ac01_create_requisition_with_rubric():
    """AC-01: The user can create a requisition and define or select a scoring rubric."""
    payload = {
        "title": "Senior NLP & LLM Engineer",
        "department": "AI Research",
        "location_work_arrangement": "Hybrid (Lahore / Remote)",
        "min_experience_years": 2.0,
        "job_description": "Build multi-agent RAG workflows using Python, FastAPI, Machine Learning, and SQL.",
        "required_skills": ["Python", "Machine Learning", "FastAPI", "SQL"],
        "preferred_skills": ["Docker", "LangChain"],
        "screening_questions": [
            "Describe your experience building FastAPI and ML pipelines.",
            "What is your availability for a technical interview next week?",
        ],
        "rubric": {
            "required_skills": 45.0,
            "relevant_experience": 25.0,
            "role_related_projects": 15.0,
            "education_certifications": 10.0,
            "other_job_related_evidence": 5.0,
            "justification": "Core emphasis on Python/ML/FastAPI skills.",
        },
        "created_by": "HR Recruiter (Test)",
    }
    res = client.post("/api/requisitions", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Senior NLP & LLM Engineer"
    assert data["rubric"]["required_skills"] == 45.0


def test_ac02_and_ac03_resume_upload_scoring_and_unreadable_flagging():
    """
    AC-02: The system accepts supported resume files and clearly flags unsupported or unreadable files.
    AC-03: Each successfully processed resume receives a structured score, criterion breakdown, evidence, and uncertainty notes.
    """
    # Create a test requisition
    req_res = client.post(
        "/api/requisitions",
        json={
            "title": "AI Automation Engineer",
            "job_description": "Python, Machine Learning, FastAPI, and SQL required.",
            "required_skills": ["Python", "Machine Learning", "FastAPI", "SQL"],
            "preferred_skills": ["Docker"],
        },
    )
    req_id = req_res.json()["requisition_id"]

    valid_resume = (
        b"Omar Farooq\nEmail: omar.farooq@example.com\nPhone: +92-300-1112233\n"
        b"Experience: 3 years as Machine Learning Engineer building Python and FastAPI services.\n"
        b"Projects: Deployed RAG classification pipeline using Python and FastAPI.\n"
        b"Education: BS Computer Science.\n"
    )
    unreadable_resume = b"TINY_CORRUPT"

    files = [
        ("files", ("Omar_Farooq_Resume.txt", valid_resume, "text/plain")),
        ("files", ("Broken_File.pdf", unreadable_resume, "application/pdf")),
    ]
    upload_res = client.post(f"/api/requisitions/{req_id}/resumes", files=files)
    assert upload_res.status_code == 200
    candidates = upload_res.json()["candidates"]
    assert len(candidates) == 2

    valid_cand = next(c for c in candidates if "Omar" in c["name"])
    broken_cand = next(c for c in candidates if c["resume_filename"] == "Broken_File.pdf")

    # AC-02: Broken file is flagged as 'Needs Manual Review'
    assert broken_cand["current_status"] == "Needs Manual Review"
    assert broken_cand["evaluation"] is None

    # AC-03: Valid file is scored with criterion breakdown, evidence, and missing/unclear items
    assert valid_cand["current_status"] == "Scored — HR Review"
    eval_data = valid_cand["evaluation"]
    assert eval_data is not None
    assert 0 <= eval_data["total_score"] <= 100
    assert "required_skills" in eval_data["criterion_scores"]
    assert len(eval_data["evidence"]) >= 1
    assert len(eval_data["missing_or_unclear_items"]) >= 1  # SQL was not mentioned in Omar's resume


def test_ac04_human_shortlist_gate_and_guardrail():
    """
    AC-04: The recruiter can approve or override the suggested shortlist;
    no candidate is contacted automatically based only on a score.
    """
    seed_res = client.post("/api/demo/reset?reseed=true")
    assert seed_res.status_code == 200
    req_id = seed_res.json()["requisition_id"]

    req_detail = client.get(f"/api/requisitions/{req_id}").json()
    scored_cand = next(c for c in req_detail["candidates"] if c["current_status"] == "Scored — HR Review")
    cand_id = scored_cand["candidate_id"]

    # Attempting to run Agent 2 (Screening Call) BEFORE Human Gate #1 approval must fail (400)
    premature_call = client.post(
        f"/api/candidates/{cand_id}/screening/run",
        json={"mode": "normal"},
    )
    assert premature_call.status_code == 400
    assert "Guardrail Violation" in premature_call.json()["detail"]

    # Now HR Recruiter approves at Gate #1
    gate1_res = client.post(
        f"/api/candidates/{cand_id}/shortlist-decision",
        json={
            "decision": "Approved",
            "actor": "HR Recruiter (Sarah)",
            "reason": "Strong verified Python and FastAPI evidence.",
        },
    )
    assert gate1_res.status_code == 200
    assert gate1_res.json()["current_status"] == "Approved for Screening"


def test_ac05_and_ac06_screening_consent_escalation_and_summary():
    """
    AC-05: The screening agent follows the approved questions, records answers accurately,
           handles consent, and supports escalation to a human.
    AC-06: Screening summaries distinguish candidate statements from uncertainty and are available for HR review.
    """
    req_id = client.get("/api/requisitions").json()[0]["requisition_id"]
    req_detail = client.get(f"/api/requisitions/{req_id}").json()
    scored_cands = [c for c in req_detail["candidates"] if c["current_status"] in ("Scored — HR Review", "Approved for Screening")]

    cand_normal = scored_cands[0]["candidate_id"]
    cand_escalate = scored_cands[1]["candidate_id"]

    # Approve both at Gate #1
    for cid in (cand_normal, cand_escalate):
        client.post(
            f"/api/candidates/{cid}/shortlist-decision",
            json={"decision": "Approved", "actor": "HR Recruiter", "reason": "Approved for screening test"},
        )

    # Test human escalation mode on cand_escalate
    esc_res = client.post(
        f"/api/candidates/{cand_escalate}/screening/run",
        json={"mode": "request_human"},
    )
    assert esc_res.status_code == 200
    assert esc_res.json()["screening"]["call_status"] == "Escalated to Human"
    assert esc_res.json()["current_status"] == "Needs Manual Review"

    # Test normal consent-granted mode on cand_normal
    norm_res = client.post(
        f"/api/candidates/{cand_normal}/screening/run",
        json={"mode": "normal"},
    )
    assert norm_res.status_code == 200
    scr = norm_res.json()["screening"]
    assert "Granted" in scr["consent_status"]
    assert len(scr["question_answer_pairs"]) >= 2
    assert "Candidate Statements" in scr["concise_summary"] or len(scr["concise_summary"]) > 20
    assert scr["agent_interpretation_notes"] != ""
    assert norm_res.json()["current_status"] == "Screening Completed — HR Review"


def test_ac07_ac08_ac09_ac10_ac11_end_to_end_scheduling_approval_idempotency_and_audit():
    """
    AC-07: The scheduling agent proposes only slots supported by the connected or mock availability source and respects time zones.
    AC-08: An invitation is not sent until required HR approval is recorded.
    AC-09: The dashboard displays current status and an audit/event history for each candidate.
    AC-10: Errors can be recovered from without losing state or sending duplicate calls/emails.
    AC-11: A test run using synthetic data demonstrates the complete flow from JD/resume intake to interview invitation.
    """
    req_id = client.get("/api/requisitions").json()[0]["requisition_id"]
    req_detail = client.get(f"/api/requisitions/{req_id}").json()
    cand = next(c for c in req_detail["candidates"] if c["current_status"] == "Screening Completed — HR Review")
    cid = cand["candidate_id"]

    # Attempting to propose slots BEFORE Gate #2 approval must fail
    premature_slots = client.post(
        f"/api/candidates/{cid}/scheduling/propose-slots",
        json={"interviewer_id": "INT-01"},
    )
    assert premature_slots.status_code == 400

    # Approve at Human Gate #2
    gate2_res = client.post(
        f"/api/candidates/{cid}/screening/review",
        json={
            "decision": "Approved for Interview",
            "actor": "HR Recruiter",
            "notes": "Candidate answered all technical screening questions clearly.",
        },
    )
    assert gate2_res.status_code == 200
    assert gate2_res.json()["current_status"] == "Approved for Interview"

    # Propose slots with timezone conversion (Candidate in Europe/London vs Interviewer INT-01 in Asia/Karachi)
    slots_res = client.post(
        f"/api/candidates/{cid}/scheduling/propose-slots",
        json={"interviewer_id": "INT-01", "duration_minutes": 45, "candidate_timezone": "Europe/London"},
    )
    assert slots_res.status_code == 200
    int_data = slots_res.json()["interview"]
    assert len(int_data["proposed_slots"]) >= 1
    first_slot = int_data["proposed_slots"][0]
    assert "GMT" in first_slot["candidate_local_time"]
    assert "PKT" in first_slot["interviewer_local_time"]

    # Draft invitation email for first_slot
    draft_res = client.post(
        f"/api/candidates/{cid}/scheduling/draft-invitation",
        json={"slot_id": first_slot["slot_id"]},
    )
    assert draft_res.status_code == 200
    assert draft_res.json()["interview"]["send_status"] == "Not Sent"
    assert "INTERVIEW DETAILS" in draft_res.json()["interview"]["email_draft"]

    # AC-08: Attempting to send without approval (approved=False) must fail
    unapproved_send = client.post(
        f"/api/candidates/{cid}/scheduling/send-invitation",
        json={"approved": False, "actor": "HR Recruiter"},
    )
    assert unapproved_send.status_code == 400

    # AC-10: Simulate email API failure -> state & draft retained, status NOT marked as Sent
    failed_send = client.post(
        f"/api/candidates/{cid}/scheduling/send-invitation",
        json={"approved": True, "actor": "HR Recruiter", "simulate_email_failure": True},
    )
    assert failed_send.status_code == 502

    # Retry safely after failure -> succeeds and transitions to 'Interview Scheduled'
    send_res = client.post(
        f"/api/candidates/{cid}/scheduling/send-invitation",
        json={"approved": True, "actor": "HR Recruiter", "idempotency_key": "TEST-IDEM-KEY-001"},
    )
    assert send_res.status_code == 200
    assert send_res.json()["idempotent_replay"] is False
    assert send_res.json()["candidate"]["current_status"] == "Interview Scheduled"

    # AC-10: Duplicate event with same idempotency_key is caught and prevents duplicate email
    dup_res = client.post(
        f"/api/candidates/{cid}/scheduling/send-invitation",
        json={"approved": True, "actor": "HR Recruiter", "idempotency_key": "TEST-IDEM-KEY-001"},
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["idempotent_replay"] is True

    # AC-09: Verify candidate has complete audit history
    events = dup_res.json()["candidate"]["audit_events"]
    assert len(events) >= 5

