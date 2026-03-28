import asyncio
import json
from urllib.parse import unquote

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

from config import settings

router = APIRouter()

GEMINI_LIVE_URL = (
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta"
    ".GenerativeService.BidiGenerateContent?key={key}"
)


def _model_path() -> str:
    m = settings.gemini_live_model.strip()
    if m.startswith("models/"):
        return m
    return f"models/{m}"


async def _forward_client_to_gemini(ws: WebSocket, gemini_ws) -> None:
    while True:
        try:
            data = await ws.receive_text()
        except WebSocketDisconnect:
            break
        try:
            msg = json.loads(data)
        except json.JSONDecodeError:
            continue
        mtype = msg.get("type")
        if mtype == "context":
            continue
        if mtype == "audio":
            b64 = msg.get("data") or ""
            out = {
                "realtimeInput": {
                    "audio": {
                        "data": b64,
                        "mimeType": "audio/pcm;rate=16000",
                    }
                }
            }
            await gemini_ws.send(json.dumps(out))
        elif mtype == "text":
            text = msg.get("text") or ""
            out = {"realtimeInput": {"text": text}}
            await gemini_ws.send(json.dumps(out))


async def _forward_gemini_to_client(ws: WebSocket, gemini_ws) -> None:
    async for raw in gemini_ws:
        text = raw if isinstance(raw, str) else raw.decode()
        try:
            obj = json.loads(text)
        except json.JSONDecodeError:
            await ws.send_text(text)
            continue
        sc = obj.get("serverContent") or {}
        if "outputTranscription" in sc:
            t = (sc["outputTranscription"] or {}).get("text")
            if t:
                await ws.send_text(
                    json.dumps({"type": "transcript", "text": t, "role": "model"})
                )
        if "inputTranscription" in sc:
            t = (sc["inputTranscription"] or {}).get("text")
            if t:
                await ws.send_text(
                    json.dumps({"type": "transcript", "text": t, "role": "user"})
                )


@router.websocket("/live")
async def live_proxy(ws: WebSocket) -> None:
    await ws.accept()
    if not settings.gemini_api_key.strip():
        await ws.close(code=4403, reason="Set GEMINI_API_KEY in .env")
        return
    lang = ws.query_params.get("languageCode") or "en-US"
    lang = unquote(lang)
    route_context = ""
    try:
        first = await ws.receive_text()
        first_obj = json.loads(first)
        if first_obj.get("type") == "context":
            route_context = str(first_obj.get("routeContext") or "")
    except (WebSocketDisconnect, json.JSONDecodeError):
        await ws.close(code=4400)
        return

    system_text = (
        "You are PathSense, an accessibility-aware walking navigation assistant. "
        "Help the user compare routes, understand risky segments, and answer "
        "questions like which route is safest and why a segment is marked high friction. "
        "Be concise and actionable.\n\n"
        f"Route and segment context:\n{route_context}\n\n"
        f"Prefer responding in the user's locale when possible (hint: {lang})."
    )

    config_message = {
        "config": {
            "model": _model_path(),
            "responseModalities": ["AUDIO"],
            "systemInstruction": {
                "parts": [{"text": system_text}],
            },
        }
    }

    gemini_url = GEMINI_LIVE_URL.format(key=settings.gemini_api_key)
    try:
        async with websockets.connect(gemini_url) as gemini_ws:
            await gemini_ws.send(json.dumps(config_message))
            await asyncio.gather(
                _forward_client_to_gemini(ws, gemini_ws),
                _forward_gemini_to_client(ws, gemini_ws),
            )
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.close(code=1011, reason=str(e)[:120])
        except Exception:
            pass
