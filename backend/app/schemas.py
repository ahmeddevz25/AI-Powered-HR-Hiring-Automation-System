from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, model_validator


class RubricWeights(BaseModel):
    required_skills: float = Field(40.0, ge=0, le=100)
    relevant_experience: float = Field(25.0, ge=0, le=100)
    role_related_projects: float = Field(20.0, ge=0, le=100)
    education_certifications: float = Field(10.0, ge=0, le=100)
    other_job_related_evidence: float = Field(5.0, ge=0, le=100)
    justification: str = Field(
        default="Weighted toward core technical skills and hands-on ML/engineering experience for this role."
    )

    @model_validator(mode="after")
    def check_total_100(self):
        total = (
            self.required_skills
            + self.relevant_experience
            + self.role_related_projects
            + self.education_certifications
            + self.other_job_related_evidence
        )
        if abs(total - 100.0) > 0.5:
            raise ValueError(f"Rubric weights must sum to 100% (currently {total}%).")
        return self


class RequisitionCreate(BaseModel):
    title: str
    department: str = "Engineering & AI"
    location_work_arrangement: str = "Hybrid (Lahore / Remote)"
    min_experience_years: float = 1.0
    job_description: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    screening_questions: List[str] = Field(default_factory=list)
    rubric: RubricWeights = Field(default_factory=RubricWeights)
    created_by: str = "HR Recruiter"


class CriterionBreakdown(BaseModel):
    score: float
    max_weight: float
    reasoning: str
    evidence_quote: str


class Agent1ScoringOutput(BaseModel):
    overall_score: float = Field(..., ge=0, le=100)
    criterion_scores: Dict[str, CriterionBreakdown]
    evidence: List[str]
    missing_or_unclear_items: List[str]
    parsing_warnings: List[str]
    recommendation_for_human_review: str
    model_version: str = "gemini-2.5-flash"


class ShortlistDecisionRequest(BaseModel):
    decision: str = Field(..., description="Approved | Declined | Overridden")
    actor: str = "HR Recruiter"
    actor_role: str = "HR Recruiter"
    reason: str = Field(..., min_length=3, description="Justification for shortlist approval, override, or closure")


class ScreeningSimulationRequest(BaseModel):
    mode: str = Field(
        default="normal",
        description="normal | decline_recording | request_human | no_answer | unclear_audio | custom_interactive",
    )
    custom_answers: Optional[Dict[str, str]] = None
    candidate_stated_availability: Optional[str] = None
    actor: str = "HR Recruiter"


class ScreeningReviewRequest(BaseModel):
    decision: str = Field(..., description="Approved for Interview | Closed")
    actor: str = "HR Recruiter"
    actor_role: str = "HR Recruiter"
    notes: str = Field(..., min_length=3)


class SlotProposalRequest(BaseModel):
    interviewer_id: str = "INT-01"
    duration_minutes: int = 45
    candidate_timezone: Optional[str] = None
    simulate_api_failure: bool = False
    actor: str = "HR Recruiter"


class InvitationDraftRequest(BaseModel):
    slot_id: str
    custom_email_body: Optional[str] = None
    actor: str = "HR Recruiter"


class SendInvitationApprovalRequest(BaseModel):
    approved: bool = True
    actor: str = "HR Recruiter"
    actor_role: str = "HR Recruiter"
    idempotency_key: Optional[str] = None
    custom_email_body: Optional[str] = None
    simulate_email_failure: bool = False

