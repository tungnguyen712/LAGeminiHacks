from fastapi import APIRouter, HTTPException
import httpx
import base64
import io
import wave
from config import settings
from models import TTSRequest, TTSResponse

router = APIRouter()

GEMINI_TTS_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent?key={key}"
)

# Gemini TTS voice names per language
VOICE_MAP = {
    "en": "Kore",
    "es": "Puck",
    "fr": "Charon",
}


def pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit signed
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buf.getvalue()


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(req: TTSRequest):
    """Call Gemini TTS and return base64-encoded WAV audio."""
    url = GEMINI_TTS_URL.format(
        model=settings.gemini_tts_model,
        key=settings.gemini_api_key,
    )

    lang_prefix = req.language_tag.split("-")[0].lower()
    voice_name = VOICE_MAP.get(lang_prefix, "Kore")

    payload = {
        "contents": [{"parts": [{"text": req.text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice_name}
                }
            },
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini TTS error: {resp.text}")

    data = resp.json()
    try:
        inline = data["candidates"][0]["content"]["parts"][0]["inlineData"]
        pcm_b64: str = inline["data"]
        mime: str = inline.get("mimeType", "audio/pcm;rate=24000")

        # Extract sample rate from mime type (e.g. "audio/pcm;rate=24000")
        rate = 24000
        if "rate=" in mime:
            try:
                rate = int(mime.split("rate=")[1].split(";")[0])
            except Exception:
                pass

        pcm_bytes = base64.b64decode(pcm_b64)
        wav_bytes = pcm_to_wav(pcm_bytes, rate)
        return TTSResponse(
            audio_base64=base64.b64encode(wav_bytes).decode(),
            mime_type="audio/wav",
        )
    except (KeyError, IndexError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unexpected TTS response format: {exc}",
        )
