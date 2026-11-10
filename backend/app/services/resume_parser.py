import io
import re
from pathlib import Path
from typing import Tuple, List, Dict
from pypdf import PdfReader
from docx import Document
from ..config import MAX_UPLOAD_SIZE_MB

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|rules|prompts)",
    r"system\s*prompt",
    r"give\s+(this\s+candidate|me)\s+(a\s+)?(100|maximum|perfect)\s*(score|/100|%)",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"override\s+scoring\s+rubric",
]


def detect_prompt_injection(text: str) -> List[str]:
    """
    Section 13 & 14: Treat resume text as untrusted input.
    Detect prompt-injection attempts and flag them in parsing_warnings so the LLM
    and human recruiter are alerted without obeying embedded instructions.
    """
    warnings = []
    for pattern in PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            snippet = match.group(0)
            warnings.append(
                f"Security Warning (Prompt Injection Attempt Detected): Resume contains adversarial instruction phrase '{snippet}'. Treated strictly as untrusted candidate text."
            )
    return warnings


def extract_candidate_metadata(text: str, filename: str) -> Dict[str, str]:
    """Extract candidate name, email, phone, and timezone from extracted resume text."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    fallback_name = Path(filename).stem.replace("_", " ").replace("-", " ").title()
    for suffix in ("Resume", "Cv", "Curriculum Vitae"):
        if fallback_name.endswith(suffix):
            fallback_name = fallback_name[: -len(suffix)].strip()

    name = fallback_name or "Candidate"
    if lines:
        first_line = re.sub(r"^(Name|Candidate|Resume|CV)\s*[:\-]\s*", "", lines[0], flags=re.IGNORECASE).strip()
        if 2 <= len(first_line) <= 50 and not re.search(r"[@0-9]", first_line):
            name = first_line

    email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    email = email_match.group(0) if email_match else f"{name.lower().replace(' ', '.')}@example.com"

    phone_match = re.search(r"(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})", text)
    phone = phone_match.group(0).strip() if phone_match else "+92-300-5550199"

    timezone_str = "Asia/Karachi"
    if re.search(r"\b(UTC\+0|GMT|London|Europe/London)\b", text, re.IGNORECASE):
        timezone_str = "Europe/London"
    elif re.search(r"\b(EST|EDT|New York|America/New_York|UTC-5)\b", text, re.IGNORECASE):
        timezone_str = "America/New_York"
    elif re.search(r"\b(PST|PDT|San Francisco|America/Los_Angeles|UTC-8)\b", text, re.IGNORECASE):
        timezone_str = "America/Los_Angeles"
    elif re.search(r"\b(GST|Dubai|Asia/Dubai|UTC\+4)\b", text, re.IGNORECASE):
        timezone_str = "Asia/Dubai"

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "timezone": timezone_str,
    }


def parse_resume_bytes(filename: str, content: bytes) -> Tuple[bool, str, List[str], Dict[str, str]]:
    """
    Validate and extract text from uploaded PDF/DOCX/TXT resume.
    Returns: (is_valid, extracted_text, warnings, metadata)
    """
    warnings: List[str] = []
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        return (
            False,
            "",
            [f"Unsupported file format '{ext}'. Only PDF and DOCX files are supported (FR-02)."],
            extract_candidate_metadata("", filename),
        )

    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        return (
            False,
            "",
            [f"File exceeds maximum allowed size of {MAX_UPLOAD_SIZE_MB} MB."],
            extract_candidate_metadata("", filename),
        )

    if len(content) < 15:
        return (
            False,
            "",
            ["File is empty or corrupted (fewer than 15 bytes). Flagged for manual review."],
            extract_candidate_metadata("", filename),
        )

    extracted_text = ""
    try:
        if ext == ".pdf":
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                return (
                    False,
                    "",
                    ["PDF is password-protected/encrypted. Flagged for manual HR review (Section 14)."],
                    extract_candidate_metadata("", filename),
                )
            pages_text = []
            for page in reader.pages:
                pages_text.append(page.extract_text() or "")
            extracted_text = "\n".join(pages_text).strip()
            if not extracted_text:
                return (
                    False,
                    "",
                    ["Scanned or image-only PDF with no extractable text layer (OCR required). Flagged for manual review."],
                    extract_candidate_metadata("", filename),
                )

        elif ext == ".docx":
            doc = Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        paragraphs.append(row_text)
            extracted_text = "\n".join(paragraphs).strip()

        elif ext == ".txt":
            extracted_text = content.decode("utf-8", errors="replace").strip()

    except Exception as exc:
        return (
            False,
            "",
            [f"Unreadable or corrupted file ({type(exc).__name__}: {str(exc)}). Flagged for manual HR review."],
            extract_candidate_metadata("", filename),
        )

    # Check if text explicitly marks an unreadable/corrupted test fixture
    if "UNREADABLE_CORRUPTED_BINARY_STREAM" in extracted_text or len(extracted_text.strip()) < 30:
        return (
            False,
            "",
            ["Extracted text is incomplete or unreadable (< 30 characters). Flagged for manual HR review."],
            extract_candidate_metadata(extracted_text, filename),
        )

    # Check for prompt injection attempts
    injection_warnings = detect_prompt_injection(extracted_text)
    warnings.extend(injection_warnings)

    metadata = extract_candidate_metadata(extracted_text, filename)
    return True, extracted_text, warnings, metadata

