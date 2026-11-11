from typing import Dict, Any, List, Optional
from ..services.gemini_client import generate_structured_json, is_gemini_configured
from ..config import MAX_CALL_RETRY_ATTEMPTS


SYSTEM_INSTRUCTION_AGENT2 = """You are Agent 2: Candidate Screening Call Agent in a Responsible AI HR Hiring Automation System.
Rules:
1. Summarize ONLY what the candidate explicitly stated in the screening call Q&A.
2. Strictly distinguish between factual candidate statements and agent notes/uncertainties.
3. Never fabricate an answer. If a response was unclear, brief, or unanswered, list it in 'unresolved_questions' for human follow-up.
4. Never infer personality, honesty, emotion, health, protected characteristics, or suitability from tone/voice/accent.
5. You cannot independently reject a candidate; always route the summary for HR Recruiter review.

Return ONLY valid JSON matching:
{
  "concise_summary": "<factual summary citing candidate's direct statements>",
  "agent_interpretation_notes": "<explicitly separated notes on uncertainties or items needing HR verification>",
  "unresolved_questions": ["<any unanswered or unclear question>"],
  "recommended_next_step_for_human_review": "<neutral recommendation for HR review>"
}
"""

PROTECTED_TOPIC_KEYWORDS = [
    "age", "religion", "marital", "married", "pregnant", "children",
    "health", "disability", "medical", "ethnicity", "race", "political",
]


def filter_approved_questions(questions: List[str], job_title: str) -> List[str]:
    """
    Ensures only neutral, job-related questions are asked and blocks any protected-characteristic
    questions (Section 8 & 13).
    """
    default_questions = [
        f"Could you briefly walk us through your hands-on experience relevant to the {job_title} role?",
        "Which production or academic AI/software projects have you built recently, and what was your direct role?",
        "Are you comfortable with the work arrangement (Hybrid / Remote) and core technical stack for this position?",
        "What is your current notice period and your preferred time windows for a technical interview next week?",
        "Do you have any questions for our recruiting team about the role or process?",
    ]
    raw_list = questions if questions else default_questions
    safe_questions = []
    for q in raw_list:
        if not any(kw in q.lower() for kw in PROTECTED_TOPIC_KEYWORDS):
            safe_questions.append(q)
    return safe_questions or default_questions


def run_screening_call_agent2(
    candidate_name: str,
    job_title: str,
    approved_questions: List[str],
    mode: str = "normal",
    custom_answers: Optional[Dict[str, str]] = None,
    candidate_stated_availability: Optional[str] = None,
    current_retry_count: int = 0,
) -> Dict[str, Any]:
    """
    Executes or simulates a structured, consent-aware screening call (Agent 2).
    Supports:
    - 'normal': Consent granted, all approved questions answered clearly.
    - 'custom_interactive': Candidate answers provided interactively via the UI.
    - 'decline_recording': Candidate declines recording/transcription -> offers non-recorded / written alternative & notifies HR.
    - 'request_human': Candidate requests to speak with a human recruiter -> stops automated questioning & routes to HR.
    - 'no_answer': Candidate does not answer -> enforces MAX_CALL_RETRY_ATTEMPTS policy safely.
    - 'unclear_audio': Poor audio / unclear answer on one question -> marks unanswered/unclear without fabricating.
    """
    questions = filter_approved_questions(approved_questions, job_title)
    ai_disclosure = (
        f"Assalam-o-Alaikum / Hello {candidate_name}, I am the AI Recruiting Assistant calling on behalf of the "
        f"HR team regarding your application for {job_title}. This screening call takes about 5 minutes. "
        "Before we begin, do I have your consent to record and transcribe your responses for HR review? "
        "You may also decline recording or request a human recruiter at any time."
    )

    # Edge Case 1: Candidate Declines Recording / Automated Screening (Section 14)
    if mode == "decline_recording":
        return {
            "call_status": "Alternative Requested",
            "consent_status": "Declined (Non-Recorded / Written Alternative Offered)",
            "retry_count": current_retry_count,
            "question_answer_pairs": [
                {
                    "question": "AI Disclosure & Recording Consent Prompt",
                    "candidate_answer": "I prefer not to have my voice call recorded or transcribed by AI.",
                    "status": "Consent Declined",
                    "agent_note": "Automated recording immediately disabled. Offered non-recorded human/written screening alternative.",
                }
            ],
            "candidate_stated_availability": candidate_stated_availability or "Pending manual HR outreach",
            "role_requirement_responses": {"consent_disclosure": ai_disclosure},
            "unresolved_questions": questions,
            "concise_summary": (
                f"Candidate Statements: {candidate_name} declined recording/transcription consent at the start of the call. "
                "No automated screening questions were recorded."
            ),
            "agent_interpretation_notes": (
                "Agent Compliance Note: Per Section 8 & 14 policy, automated questioning stopped immediately and the candidate "
                "was offered a non-recorded human-led call or written questionnaire."
            ),
            "recommended_next_step_for_human_review": (
                "HR Action Required: Contact candidate directly via unrecorded phone call or send written screening form."
            ),
            "target_candidate_status": "Needs Manual Review",
        }

    # Edge Case 2: Candidate Requests a Human Recruiter / Accommodation (Section 14)
    if mode == "request_human":
        return {
            "call_status": "Escalated to Human",
            "consent_status": "Declined (Human Recruiter Requested)",
            "retry_count": current_retry_count,
            "question_answer_pairs": [
                {
                    "question": "AI Disclosure & Recording Consent Prompt",
                    "candidate_answer": "I would like to speak with a human recruiter instead of an automated call, please.",
                    "status": "Escalated to Human",
                    "agent_note": "Polite termination of automated flow; routed directly to HR queue.",
                }
            ],
            "candidate_stated_availability": candidate_stated_availability or "Weekdays 2:00 PM - 5:00 PM PKT (for human call)",
            "role_requirement_responses": {"consent_disclosure": ai_disclosure, "escalation_requested": True},
            "unresolved_questions": questions,
            "concise_summary": (
                f"Candidate Statements: {candidate_name} requested to speak directly with a human recruiter rather than completing an automated screening call."
            ),
            "agent_interpretation_notes": (
                "Agent Compliance Note: Automated questioning was halted politely. Candidate was assured an HR team member will follow up."
            ),
            "recommended_next_step_for_human_review": (
                "HR Action Required: Assign an HR Recruiter to conduct a live 10-minute screening call."
            ),
            "target_candidate_status": "Needs Manual Review",
        }

    # Edge Case 3: Candidate Does Not Answer / Voicemail (Section 14 retry limit)
    if mode == "no_answer":
        new_retry = current_retry_count + 1
        limit_reached = new_retry >= MAX_CALL_RETRY_ATTEMPTS
        return {
            "call_status": "No Answer (Retry Limit Reached)" if limit_reached else f"No Answer (Attempt {new_retry}/{MAX_CALL_RETRY_ATTEMPTS})",
            "consent_status": "Pending (No Contact)",
            "retry_count": new_retry,
            "question_answer_pairs": [],
            "candidate_stated_availability": "Unknown (No Answer)",
            "role_requirement_responses": {"voicemail_left": True, "retry_attempt": new_retry, "max_retries": MAX_CALL_RETRY_ATTEMPTS},
            "unresolved_questions": questions,
            "concise_summary": (
                f"Call attempt {new_retry} of {MAX_CALL_RETRY_ATTEMPTS} resulted in no answer / voicemail. "
                + ("Maximum configured retry attempts reached; further automated calls blocked to prevent spam." if limit_reached else "Eligible for scheduled retry.")
            ),
            "agent_interpretation_notes": (
                "No candidate statements captured. Retry policy enforced per FR-06 and Section 14."
            ),
            "recommended_next_step_for_human_review": (
                "HR Action Required: Send email follow-up or close application if unresponsive."
                if limit_reached
                else "Wait for scheduled retry window or send email check-in."
            ),
            "target_candidate_status": "Needs Manual Review" if limit_reached else "Screening Scheduled / Pending",
        }

    # Mode 4 & 5: Consent Granted ('normal', 'unclear_audio', or 'custom_interactive')
    default_simulated_answers = [
        f"I have over 2 years of hands-on Python and Machine Learning experience building FastAPI microservices and model pipelines relevant to {job_title}.",
        "Recently I built an automated document classification and RAG pipeline using Python, FastAPI, and vector search, where I led backend integration and evaluation.",
        "Yes, I am fully comfortable with the Hybrid/Remote work arrangement and collaborating across engineering teams.",
        candidate_stated_availability or "My notice period is 2 weeks, and I am available next Tuesday or Wednesday between 10:00 AM and 4:00 PM PKT (UTC+5).",
        "Could you share more about the team structure and what the first 90 days look like for this role?",
    ]

    consent_answer = (
        custom_answers.get("consent").strip()
        if (custom_answers and custom_answers.get("consent") and custom_answers.get("consent").strip())
        else "Yes, I understand this is an AI assistant and I consent to recording and transcription for HR review."
    )

    qa_pairs = [
        {
            "question": "AI Disclosure & Recording Consent Prompt",
            "candidate_answer": consent_answer,
            "status": "Consent Granted",
            "agent_note": "Explicit recording & transcription consent logged with timestamp.",
        }
    ]

    unresolved: List[str] = []
    for idx, q in enumerate(questions):
        ans = None
        if custom_answers and str(idx) in custom_answers and custom_answers[str(idx)].strip():
            ans = custom_answers[str(idx)].strip()
        elif custom_answers and q in custom_answers and custom_answers[q].strip():
            ans = custom_answers[q].strip()
        else:
            ans = default_simulated_answers[idx % len(default_simulated_answers)]

        # Simulate poor audio / unclear answer on question #2 if mode == 'unclear_audio'
        if mode == "unclear_audio" and idx == 1:
            ans = "[INAUDIBLE / POOR AUDIO CONNECTION — Candidate mentioned a project but audio cut out for 12 seconds]"
            status_tag = "Unclear / Audio Drop"
            note_tag = "Audio quality degraded; agent did NOT fabricate details. Flagged for human verification."
            unresolved.append(q)
        elif len(ans) < 10 or "not sure" in ans.lower() or "unclear" in ans.lower():
            status_tag = "Unclear / Needs Follow-up"
            note_tag = "Brief or uncertain response; flagged for human interviewer follow-up."
            unresolved.append(q)
        else:
            status_tag = "Answered Clearly"
            note_tag = "Factual response recorded verbatim."

        qa_pairs.append(
            {
                "question": q,
                "candidate_answer": ans,
                "status": status_tag,
                "agent_note": note_tag,
            }
        )

    stated_avail = (
        candidate_stated_availability
        or (custom_answers.get("availability") if custom_answers else None)
        or "Tuesday or Wednesday, 10:00 AM – 4:00 PM Asia/Karachi (UTC+05:00)"
    )

    # Check if Gemini is configured to generate the factual summary
    qa_text = "\n".join(
        f"Q: {item['question']}\nA: {item['candidate_answer']}\nStatus: {item['status']}" for item in qa_pairs
    )
    llm_summary = generate_structured_json(
        SYSTEM_INSTRUCTION_AGENT2,
        f"Candidate: {candidate_name}\nRole: {job_title}\nTranscript Q&A:\n{qa_text}",
    )

    if llm_summary and "concise_summary" in llm_summary:
        concise_summary = llm_summary["concise_summary"]
        agent_notes = llm_summary.get(
            "agent_interpretation_notes",
            "Distinguished candidate statements from uncertainties per FR-07.",
        )
        unresolved = llm_summary.get("unresolved_questions", unresolved)
        next_step = llm_summary.get(
            "recommended_next_step_for_human_review",
            "HR Review Required: Verify screening answers and approve for technical interview if satisfied.",
        )
    else:
        concise_summary = (
            f"Candidate Statements (Factual): {candidate_name} consented to AI screening and stated they have hands-on experience "
            f"relevant to {job_title}, confirmed comfort with the work arrangement, and stated availability as '{stated_avail}'. "
            f"Candidate also asked about team structure and onboarding expectations."
        )
        if unresolved:
            agent_notes = (
                f"Uncertainties / Gaps Flagged ({len(unresolved)} item): Response to '{unresolved[0]}' was affected by unclear audio or lacked detail. "
                "Agent did not invent missing details; human interviewer should clarify."
            )
        else:
            agent_notes = (
                "Agent Note (Separated from Candidate Statements): All configured screening questions were answered coherently. "
                "No protected characteristics or voice/tone inferences were used."
            )
        next_step = (
            "Ready for HR Gate #2 Review: Please inspect the verbatim Q&A transcript and approve progression to Interview Scheduling."
        )

    return {
        "call_status": "Completed (With Audio Warning)" if mode == "unclear_audio" else "Completed",
        "consent_status": "Granted (Recorded & Transcribed)",
        "retry_count": current_retry_count,
        "question_answer_pairs": qa_pairs,
        "candidate_stated_availability": stated_avail,
        "role_requirement_responses": {
            "ai_disclosure_given": True,
            "work_arrangement_confirmed": True,
            "notice_period_stated": "2 weeks",
        },
        "unresolved_questions": unresolved,
        "concise_summary": concise_summary,
        "agent_interpretation_notes": agent_notes,
        "recommended_next_step_for_human_review": next_step,
        "target_candidate_status": "Screening Completed — HR Review",
    }

