from fastapi import APIRouter, HTTPException
import httpx
import base64
from config import settings
from models import TTSRequest, TTSResponse

router = APIRouter()

GEMINI_TTS_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent?key={key}"
)


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(req: TTSRequest):
    """
    Calls Gemini TTS model and returns base64-encoded audio.
    TODO: Confirm exact TTS request schema when Gemini 3 TTS API is GA.
    """
    url = GEMINI_TTS_URL.format(
        model=settings.gemini_tts_model,
        key=settings.gemini_api_key,
    )
    payload = {
        "contents": [{"parts": [{"text": req.text}]}],
        "generationConfig": {
            "speechConfig": {"languageCode": req.language_tag}
        },
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, json=payload)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Gemini TTS error")
    # TODO: extract audio bytes from response (shape TBD by Gemini 3 TTS API)
    audio_bytes = b""  # placeholder
    return TTSResponse(audio_base64=base64.b64encode(audio_bytes).decode())
