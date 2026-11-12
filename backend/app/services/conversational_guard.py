import re
from typing import Dict, Any, Optional
from .gemini_client import generate_structured_json, is_gemini_configured


OFF_TOPIC_KNOWLEDGE_BASE = [
    {
        "category": "company_leadership",
        "patterns": [
            r"\b(ceo|founder|co-founder|chief executive|owner|director|boss|head of.*company|who.*(runs|leads|founded|owns)|leadership|management|who is.*ceo|whats.*ceo|what is.*ceo|name of.*ceo)\b",
        ],
        "answer": "Our CEO and founder at TalentSense is Muhammad Ahmed, leading our global AI team and vision.",
    },
    {
        "category": "salary_compensation",
        "patterns": [
            r"\b(salary|package|pay|compensation|stipend|ctc|rate|remuneration|how much.*pay|allowance|bonus|benefits|insurance|provident)\b",
        ],
        "answer": "Our compensation packages are competitive and will be discussed in detail by our HR team in the subsequent interview round.",
    },
    {
        "category": "location_office",
        "patterns": [
            r"\b(where.*office|location|address|which city|where.*located|lahore office|islamabad office|karachi office|headquarters)\b",
        ],
        "answer": "Our main engineering hubs are located in Lahore and Islamabad, with flexible hybrid and remote options.",
    },
    {
        "category": "company_product",
        "patterns": [
            r"\b(what.*company do|company background|talentsense|about.*company|products|what do you do|what does.*company|tell me about.*company|company.*work)\b",
        ],
        "answer": "TalentSense builds enterprise AI recruitment and intelligent workflow automation platforms for modern high-growth tech organizations.",
    },
    {
        "category": "tech_stack",
        "patterns": [
            r"\b(what.*tech.*(stack|use)|which.*technolog(y|ies)|what.*tools|cloud provider|frameworks.*use|what stack)\b",
        ],
        "answer": "Our stack is built with Python, FastAPI, React, PostgreSQL, Docker, and state-of-the-art LLM architectures.",
    },
    {
        "category": "hiring_process",
        "patterns": [
            r"\b(how many rounds|next round|interview process|steps.*hiring|what happens next|how long.*process|who will interview)\b",
        ],
        "answer": "This is a quick 3-minute preliminary voice screening, followed by an in-depth technical discussion with our engineering team lead.",
    },
    {
        "category": "timings_hours",
        "patterns": [
            r"\b(working hours|shift|office timings|work timing|what time.*work|flexible hours|overtime)\b",
        ],
        "answer": "Our core collaboration hours are Monday to Friday, 10:00 AM to 6:00 PM PKT, with flexible remote arrangements.",
    },
    {
        "category": "ai_bot_identity",
        "patterns": [
            r"\b(are you.*(robot|ai|bot|human|person|real)|who are you|your name|what are you|am i talking to a (bot|human|robot))\b",
        ],
        "answer": "I am Sarah Jenkins, the TalentSense AI Recruitment Assistant conducting preliminary screenings on behalf of our hiring team.",
    },
    {
        "category": "casual_chitchat",
        "patterns": [
            r"\b(weather|biryani|cricket|tea|chai|lunch|dinner|movie|song|joke|game|football|hot outside|cold outside|how are you|how do you do|what's up|whats up)\b",
        ],
        "answer": "I am doing great, thank you! But let's stay focused on your job application.",
    },
]


def is_candidate_asking_question(text: str) -> bool:
    """
    Checks if the candidate's response is actually an inquiry or question directed at the interviewer.
    """
    t = text.strip().lower()
    if not t:
        return False
    # Ends with a question mark
    if t.endswith("?"):
        return True
    # Starts with common question words or phrases
    question_starters = [
        r"^(what|whats|what's|who|who's|where|when|why|how|which|whose)\b",
        r"^(can you|could you|would you|will you|tell me|explain to me)\b",
        r"^(do you|does the|is there|are there|is it|is this|do we)\b",
        r"^(i have a question|one question|may i ask|can i ask)\b",
    ]
    for pattern in question_starters:
        if re.search(pattern, t):
            return True
    return False


def evaluate_screening_response(
    job_title: str,
    current_question: str,
    step_index: int,
    candidate_input: str,
) -> Dict[str, Any]:
    """
    Evaluates whether the candidate answered the interview question or gave an off-topic / irrelevant
    response. If off-topic or asking a question, provides an informative answer to the candidate's query
    and gracefully redirects back to the original question that still needs an answer.
    """
    text = (candidate_input or "").strip()
    text_lower = text.lower()

    # Step 0: Recording Consent
    if step_index == 0:
        consent_positive = re.search(
            r"\b(yes|yeah|yep|agree|consent|sure|ok|okay|proceed|fine|definitely|alright|go ahead|i agree|i consent)\b",
            text_lower,
        )
        consent_negative = re.search(r"\b(no|never|decline|don't want|refuse|stop)\b", text_lower)

        if consent_negative:
            return {
                "is_relevant": False,
                "status": "redirect",
                "category": "consent_declined",
                "agent_reply": (
                    "I completely respect that. If you prefer not to be recorded, our human HR team can conduct a standard "
                    "unrecorded interview instead. Before we conclude, would you like to proceed or request a human recruiter?"
                ),
                "redirect_question": current_question,
            }

        # Check if candidate asked what the call is about
        if re.search(r"\b(why.*call|what.*call|what.*about|who is this|who are you)\b", text_lower):
            return {
                "is_relevant": False,
                "status": "redirect",
                "category": "call_inquiry",
                "agent_reply": (
                    f"This is a quick 3-minute preliminary call to review your application for the {job_title} position. "
                    "So before we dive in, is it okay if we record this short call for our HR notes?"
                ),
                "redirect_question": current_question,
            }

        if consent_positive:
            return {
                "is_relevant": True,
                "status": "valid",
                "category": "consent_granted",
                "agent_reply": "Thank you for confirming! Let's get started.",
                "redirect_question": None,
            }

        return {
            "is_relevant": False,
            "status": "redirect",
            "category": "consent_unclear",
            "agent_reply": (
                "Before we can begin the interview questions, I just need your quick confirmation: "
                "Is it okay for us to record and transcribe this 3-minute call for our HR team?"
            ),
            "redirect_question": current_question,
        }

    # If Gemini is configured, use LLM for semantic intent check
    if is_gemini_configured():
        system_prompt = (
            "You are Sarah Jenkins, an AI recruitment assistant. "
            "Analyze the candidate's response to the interview question. "
            "Determine if they actually answered the question, or if they asked an off-topic question / made irrelevant small talk. "
            "If off-topic or asking a question: answer their question politely in 1 sentence, then redirect back to the interview question. "
            "Set is_relevant to false whenever they asked a question or did not answer the prompt. "
            "Return JSON: {\"is_relevant\": bool, \"agent_reply\": str}"
        )
        user_prompt = f"Job Title: {job_title}\nInterview Question: {current_question}\nCandidate Response: {text}"
        llm_res = generate_structured_json(system_prompt, user_prompt)
        if llm_res and "is_relevant" in llm_res:
            return {
                "is_relevant": bool(llm_res.get("is_relevant")),
                "status": "valid" if llm_res.get("is_relevant") else "redirect",
                "agent_reply": llm_res.get("agent_reply", f"Coming back to our question: {current_question}"),
                "redirect_question": current_question if not llm_res.get("is_relevant") else None,
            }

    # 1. First Check: Did the candidate ask an off-topic question matching our Knowledge Base?
    for item in OFF_TOPIC_KNOWLEDGE_BASE:
        for pat in item["patterns"]:
            if re.search(pat, text_lower):
                answer_prefix = item["answer"]
                redirect = f"{answer_prefix} But coming back to my question: {current_question}"
                return {
                    "is_relevant": False,
                    "status": "redirect",
                    "category": item["category"],
                    "agent_reply": redirect,
                    "redirect_question": current_question,
                }

    # 2. Second Check: Did the candidate ask any other question (ends with ? or starts with question word)?
    if is_candidate_asking_question(text):
        redirect = (
            f"That's a great question! Our team lead will gladly answer that in the technical round. "
            f"Right now, coming back to my question: {current_question}"
        )
        return {
            "is_relevant": False,
            "status": "redirect",
            "category": "general_candidate_question",
            "agent_reply": redirect,
            "redirect_question": current_question,
        }

    # 3. Third Check: Step-by-Step Substance & Content Validation

    # Step 1: Recent Projects & Technical Experience
    if step_index == 1:
        tech_keywords = r"\b(python|fastapi|react|django|flask|node|javascript|typescript|backend|frontend|fullstack|full-stack|api|apis|rest|database|databases|sql|postgres|postgresql|mysql|mongodb|redis|docker|aws|cloud|system|systems|built|developed|architected|engineered|designed|created|worked|project|projects|experience|service|services|app|apps|software|code|pipeline|machine learning|data)\b"
        has_tech_substance = bool(re.search(tech_keywords, text_lower))

        if not has_tech_substance:
            return {
                "is_relevant": False,
                "status": "redirect",
                "category": "tech_experience_missing",
                "agent_reply": (
                    "I'd love to learn a little bit about your hands-on engineering work! "
                    "Could you briefly share a project you worked on or the main technologies you use?"
                ),
                "redirect_question": current_question,
            }

        return {
            "is_relevant": True,
            "status": "valid",
            "category": "substantive_answer",
            "agent_reply": "That sounds great, thank you for sharing that!",
            "redirect_question": None,
        }

    # Step 2: Work Arrangement (Hybrid / Remote Collaboration)
    if step_index == 2:
        work_keywords = r"\b(hybrid|remote|onsite|office|comfortable|fine|yes|yep|yeah|agree|sure|flexible|prefer|adapt|collaborate|collaboration|work from home|wfh|in-person|schedule|team)\b"
        has_work_pref = bool(re.search(work_keywords, text_lower))

        if not has_work_pref:
            return {
                "is_relevant": False,
                "status": "redirect",
                "category": "work_setup_unclear",
                "agent_reply": (
                    "To make sure our logistics match: "
                    "Are you comfortable collaborating in a remote or hybrid engineering team setup?"
                ),
                "redirect_question": current_question,
            }

        return {
            "is_relevant": True,
            "status": "valid",
            "category": "work_setup_confirmed",
            "agent_reply": "Awesome, appreciate that!",
            "redirect_question": None,
        }

    # Step 3: Notice Period & Availability
    if step_index >= 3:
        timing_keywords = r"\b(immediate|immediately|notice|day|days|week|weeks|month|months|available|availability|join|joining|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|am|pm|pkt|time|times|schedule|flexible|anytime|next week)\b"
        has_timing = bool(re.search(timing_keywords, text_lower))

        if not has_timing:
            return {
                "is_relevant": False,
                "status": "redirect",
                "category": "timing_unclear",
                "agent_reply": (
                    "So our team lead can schedule your interview: "
                    "Could you please share your notice period and what days or times next week work best for you?"
                ),
                "redirect_question": current_question,
            }

        return {
            "is_relevant": True,
            "status": "valid",
            "category": "availability_confirmed",
            "agent_reply": "Perfect, got it!",
            "redirect_question": None,
        }

    return {
        "is_relevant": True,
        "status": "valid",
        "category": "general_answer",
        "agent_reply": "Thank you, that's really helpful!",
        "redirect_question": None,
    }
