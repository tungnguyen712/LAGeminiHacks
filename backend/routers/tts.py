import base64
import wave
import io
from fastapi import APIRouter, HTTPException
import httpx
from config import settings
from models import TTSRequest, TTSResponse

router = APIRouter()

GEMINI_TTS_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent?key={key}"
)


def _pcm_to_wav_bytes(pcm: bytes, sample_rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm)
    return buf.getvalue()


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(req: TTSRequest):
    if not settings.gemini_api_key.strip():
        raise HTTPException(
            status_code=503,
            detail="Set GEMINI_API_KEY in backend/.env or repo-root .env",
        )
    url = GEMINI_TTS_URL.format(
        model=settings.gemini_tts_model,
        key=settings.gemini_api_key,
    )
    payload = {
        "contents": [{"parts": [{"text": req.text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": "Kore",
                    }
                }
            },
        },
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload)
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini TTS error: {resp.text[:500]}",
        )
    try:
        body = resp.json()
        parts = body["candidates"][0]["content"]["parts"]
        part0 = parts[0]
        inline = part0.get("inlineData") or part0.get("inline_data") or {}
        b64 = inline.get("data")
        if not b64:
            raise KeyError("inlineData.data")
        pcm = base64.b64decode(b64)
    except (KeyError, IndexError, TypeError) as e:
        raise HTTPException(status_code=502, detail=f"TTS parse error: {e}")
    wav_bytes = _pcm_to_wav_bytes(pcm, sample_rate=24000)
    return TTSResponse(
        audio_base64=base64.b64encode(wav_bytes).decode(),
        mime_type="audio/wav",
    )
