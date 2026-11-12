import os
from typing import Tuple, Optional
import httpx
from dotenv import load_dotenv
from ..config import BASE_DIR, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID


def synthesize_speech_elevenlabs(text: str, voice_id: Optional[str] = None) -> Tuple[bool, bytes, str]:
    """
    Calls ElevenLabs Text-to-Speech API and returns (success, mp3_bytes, message).
    Reloads .env dynamically so adding ELEVENLABS_API_KEY takes effect immediately without restarting.
    """
    load_dotenv(BASE_DIR / ".env", override=True)
    api_key = os.getenv("ELEVENLABS_API_KEY", ELEVENLABS_API_KEY).strip()
    active_voice_id = (voice_id or os.getenv("ELEVENLABS_VOICE_ID", ELEVENLABS_VOICE_ID)).strip() or "EXAVITQu4vr4xnSDxMaL"
    model_id = os.getenv("ELEVENLABS_MODEL_ID", ELEVENLABS_MODEL_ID).strip() or "eleven_multilingual_v2"

    if not api_key:
        return False, b"", "ELEVENLABS_API_KEY is not configured in backend/.env"

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{active_voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.78,
            "style": 0.15,
            "use_speaker_boost": True,
        },
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200 and resp.content:
                return True, resp.content, "ElevenLabs MP3 stream generated"
            return False, b"", f"ElevenLabs API returned status {resp.status_code}: {resp.text[:200]}"
    except Exception as exc:
        return False, b"", f"ElevenLabs request failed: {exc}"

