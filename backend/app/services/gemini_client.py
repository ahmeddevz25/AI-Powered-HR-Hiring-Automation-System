import json
from typing import Optional, Dict, Any
from ..config import GEMINI_API_KEY, GEMINI_MODEL


def is_gemini_configured() -> bool:
    return bool(GEMINI_API_KEY and len(GEMINI_API_KEY) > 10 and not GEMINI_API_KEY.startswith("your_"))


def generate_structured_json(system_instruction: str, user_prompt: str) -> Optional[Dict[str, Any]]:
    """
    Calls Google Gemini API (google-genai SDK) requesting JSON output.
    Returns parsed dictionary if successful, or None if API key is not set or call fails,
    allowing the caller to use the deterministic fallback engine seamlessly.
    """
    if not is_gemini_configured():
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        if response and response.text:
            return json.loads(response.text)
    except Exception as exc:
        print(f"[GeminiClient] Fallback triggered due to Gemini API error: {exc}")
        return None

    return None

