"""WebSocket /api/live — Gemini Live API proxy for PathSense voice assistant.

Protocol (client ↔ backend)
----------------------------
1.  Client connects to  ws://.../api/live
2.  Client sends PathSense setup JSON as the FIRST message:
    {
      "setup": {
        "profile":            "wheelchair",   // required
        "languageCode":       "en",           // required — ISO 639-1
        "responseModalities": ["TEXT"],       // optional — ["TEXT"] | ["AUDIO"] | ["TEXT","AUDIO"]
        "routes": [...]                       // optional — output of POST /api/routes + /api/friction
      }
    }
3.  Backend → Gemini: BidiGenerateContentSetup with system instruction built from route context
4.  Backend ← Gemini: setupComplete
5.  Backend → Client: {"type": "setupComplete"}

After setup is complete the session is fully bidirectional:

Client → Backend (text turn):
    {"type": "text", "content": "Which route is safest for me?"}

Client → Backend (audio chunk — PCM 16 kHz mono):
    {"type": "audio", "data": "<base64 pcm>", "mimeType": "audio/pcm;rate=16000"}

Client → Backend (signal end of audio turn):
    {"type": "audioEnd"}

Backend → Client (Gemini text response part):
    {"type": "text", "content": "The low-friction route avoids the stairs..."}

Backend → Client (Gemini audio chunk — PCM 24 kHz):
    {"type": "audioChunk", "data": "<base64 pcm>", "mimeType": "audio/pcm;rate=24000"}

Backend → Client (Gemini turn complete):
    {"type": "turnComplete"}

Backend → Client (error):
    {"type": "error", "message": "..."}
"""
import asyncio
import base64
import json
import traceback

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings

router = APIRouter()

# Gemini Live API WebSocket endpoint.
# v1alpha is the stable namespace for BidiGenerateContent.
# Supported models: gemini-2.0-flash-live-001, gemini-2.5-flash-preview-native-audio-dialog
GEMINI_LIVE_WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1alpha"
    ".GenerativeService.BidiGenerateContent"
    "?key={key}"
)

PROFILE_DESCRIPTIONS: dict[str, str] = {
    "wheelchair": (
        "uses a manual wheelchair — needs smooth hard surfaces, kerb ramps, level crossings; "
        "cannot use stairs, steep slopes (>5%), or paths narrower than 0.9 m"
    ),
    "low-vision": (
        "has low vision — relies on tactile paving, audio signals at crossings, "
        "consistent surface texture, and well-lit paths; struggles with complex junctions "
        "and missing tactile guidance"
    ),
    "stroller": (
        "pushing a stroller — needs smooth surfaces, kerb ramps, passages ≥0.8 m wide; "
        "cannot use stairs or cobblestones"
    ),
}


# ---------------------------------------------------------------------------
# System instruction builder
# ---------------------------------------------------------------------------

def _build_system_instruction(
    profile: str,
    language_code: str,
    routes: list | None = None,
) -> str:
    profile_desc = PROFILE_DESCRIPTIONS.get(profile, profile)

    routes_section = ""
    if routes:
        lines: list[str] = []
        for r in routes[:5]:  # cap context size
            label = r.get("label", "route")
            mins = round(r.get("durationSeconds", 0) / 60)
            km = r.get("distanceMeters", 0) / 1000
            segs = r.get("segments", [])
            mode = r.get("mode", "walking")

            # Count friction levels if scores are embedded
            high = sum(1 for s in segs if s.get("friction", {}).get("level") == "HIGH")
            med  = sum(1 for s in segs if s.get("friction", {}).get("level") == "MEDIUM")
            low  = sum(1 for s in segs if s.get("friction", {}).get("level") == "LOW")

            # Collect HIGH-friction segment descriptions
            barriers = [
                s["description"][:60]
                for s in segs
                if s.get("friction", {}).get("level") == "HIGH"
            ][:3]

            line = (
                f"- {label.upper()} ({mode}, {mins} min, {km:.1f} km): "
                f"{low} LOW / {med} MEDIUM / {high} HIGH friction segments"
            )
            if barriers:
                line += f". Key barriers: {'; '.join(barriers)}"
            lines.append(line)

        routes_section = (
            "\n\nCurrent routes the user is comparing:\n" + "\n".join(lines)
        )

    return f"""You are PathSense, an intelligent accessibility navigation assistant built for Los Angeles.

User profile: {profile} — {profile_desc}
Response language: {language_code} (always respond in this language — adapt if user switches)
{routes_section}

Your role:
- Help the user choose the most accessible route for their profile
- Explain friction scores and barriers in plain, direct language
- Recommend the safest route and warn about HIGH-friction segments (stairs, narrow paths, etc.)
- Suggest when the reroute feature should be used
- If asked about transit, explain the profile-specific vehicle accessibility
- Keep responses SHORT (≤ 3 sentences) unless the user asks for detail — they are navigating

Tone: clear, confident, concise. Never say "I cannot" — always give your best accessibility assessment."""


# ---------------------------------------------------------------------------
# Message transformers: client ↔ Gemini native format
# ---------------------------------------------------------------------------

def _client_msg_to_gemini(msg: dict) -> dict | None:
    """Transform a client-side PathSense message into a Gemini Live API frame."""
    t = msg.get("type")

    if t == "text":
        return {
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": msg.get("content", "")}]}],
                "turnComplete": True,
            }
        }

    if t == "audio":
        return {
            "realtimeInput": {
                "mediaChunks": [{
                    "mimeType": msg.get("mimeType", "audio/pcm;rate=16000"),
                    "data": msg.get("data", ""),
                }]
            }
        }

    if t == "audioEnd":
        # For native audio models (realtimeInput flow) the model uses VAD to detect
        # end-of-speech automatically — no explicit signal needed.
        # For text-turn models we could send clientContent.turnComplete, but omitting
        # it is safe for both: the model will respond once it detects silence.
        return None

    if t == "video":
        # Webcam frame — sent as realtimeInput alongside audio
        return {
            "realtimeInput": {
                "mediaChunks": [{
                    "mimeType": msg.get("mimeType", "image/jpeg"),
                    "data": msg.get("data", ""),
                }]
            }
        }

    return None   # unknown message type — ignore


def _gemini_msg_to_client(raw: dict) -> list[dict]:
    """Transform a Gemini Live API server frame into ≥0 client messages."""
    out: list[dict] = []

    # Setup acknowledgement
    if "setupComplete" in raw:
        out.append({"type": "setupComplete"})
        return out

    # Server content (text + audio parts)
    sc = raw.get("serverContent", {})
    if sc:
        model_turn = sc.get("modelTurn", {})
        for part in model_turn.get("parts", []):
            if "text" in part and part["text"]:
                out.append({"type": "text", "content": part["text"]})
            elif "inlineData" in part:
                d = part["inlineData"]
                out.append({
                    "type": "audioChunk",
                    "data": d.get("data", ""),
                    "mimeType": d.get("mimeType", "audio/pcm;rate=24000"),
                })
        if sc.get("turnComplete"):
            out.append({"type": "turnComplete"})

    # Tool calls (not used by PathSense but forwarded as-is for extensibility)
    if "toolCall" in raw:
        out.append({"type": "toolCall", "data": raw["toolCall"]})

    return out


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/live")
async def live_proxy(ws: WebSocket) -> None:
    """Bidirectional WebSocket proxy: mobile app ↔ Gemini Live API.

    The first client message MUST be a PathSense setup frame.
    After setup is acknowledged the session relays freely until disconnect.
    """
    await ws.accept()

    # ── Step 1: Read PathSense setup from client ──────────────────────────────
    try:
        raw_setup = await ws.receive_text()
        setup_msg = json.loads(raw_setup)
        ps_setup = setup_msg.get("setup", {})
    except Exception as exc:
        await ws.send_text(json.dumps({"type": "error", "message": f"Invalid setup frame: {exc}"}))
        await ws.close(code=1002)
        return

    profile       = ps_setup.get("profile", "wheelchair")
    language_code = ps_setup.get("languageCode", "en")
    modalities    = ps_setup.get("responseModalities", ["TEXT"])
    routes        = ps_setup.get("routes")

    # ── Step 2: Connect to Gemini Live API ────────────────────────────────────
    gemini_url = GEMINI_LIVE_WS_URL.format(key=settings.gemini_api_key)

    # Normalize model name — Gemini requires "models/" prefix
    model = settings.gemini_live_model
    if not model.startswith("models/"):
        model = f"models/{model}"

    # Build generationConfig.
    # Native audio models (e.g. gemini-2.5-flash-native-audio-*) only accept ["AUDIO"]
    # and don't use speechConfig (they generate audio natively, not via TTS).
    # Text-only sessions omit responseModalities entirely (server default = TEXT).
    generation_config: dict = {}
    if "AUDIO" in modalities:
        generation_config["responseModalities"] = ["AUDIO"]

    setup_body: dict = {
        "model": model,
        "systemInstruction": {
            "parts": [{"text": _build_system_instruction(profile, language_code, routes)}]
        },
    }
    if generation_config:
        setup_body["generationConfig"] = generation_config

    gemini_setup = {"setup": setup_body}

    print(f"[live] Connecting to Gemini: model={model}")
    print(f"[live] Setup payload: {json.dumps(gemini_setup, indent=2)[:800]}")

    try:
        async with websockets.connect(
            gemini_url,
            open_timeout=15,
        ) as gemini_ws:

            # Send setup to Gemini
            await gemini_ws.send(json.dumps(gemini_setup))
            print("[live] Setup sent, waiting for setupComplete ...")

            # ── Step 3: Wait for Gemini's setupComplete ───────────────────────
            setup_complete = False
            try:
                async for raw_msg in gemini_ws:
                    parsed = json.loads(raw_msg if isinstance(raw_msg, str) else bytes(raw_msg).decode())

                    # Gemini may return an error object before closing
                    if "error" in parsed:
                        err = parsed["error"]
                        code = err.get("code", "")
                        msg  = err.get("message", str(err))
                        status = err.get("status", "")
                        await ws.send_text(json.dumps({
                            "type": "error",
                            "message": f"Gemini error {code} ({status}): {msg}",
                        }))
                        await ws.close(code=1011)
                        return

                    if "setupComplete" in parsed:
                        setup_complete = True
                        await ws.send_text(json.dumps({"type": "setupComplete"}))
                        break

                    # Forward any early server content (rare but possible)
                    for out in _gemini_msg_to_client(parsed):
                        await ws.send_text(json.dumps(out))

            except websockets.ConnectionClosedError as cce:
                # Gemini closed the connection during setup — surface the close reason
                reason = cce.rcvd.reason if cce.rcvd else str(cce)
                print(f"[live] Gemini closed during setup: code={cce.rcvd.code if cce.rcvd else '?'} reason={reason}")
                await ws.send_text(json.dumps({
                    "type": "error",
                    "message": (
                        f"Gemini closed connection during setup (code {cce.rcvd.code if cce.rcvd else '?'}): "
                        f"{reason}. "
                        f"Check GEMINI_LIVE_MODEL in .env — current model: {settings.gemini_live_model}. "
                        f"Valid models: gemini-3.1-flash-live-preview, gemini-2.0-flash-live-001"
                    ),
                }))
                await ws.close(code=1011)
                return

            if not setup_complete:
                await ws.send_text(json.dumps({"type": "error", "message": "Gemini setup timed out"}))
                await ws.close(code=1011)
                return

            # ── Step 4: Bidirectional relay ───────────────────────────────────
            async def client_to_gemini() -> None:
                """Relay client messages → Gemini."""
                while True:
                    try:
                        data = await ws.receive_text()
                        msg = json.loads(data)
                        gemini_frame = _client_msg_to_gemini(msg)
                        if gemini_frame:
                            await gemini_ws.send(json.dumps(gemini_frame))
                    except WebSocketDisconnect:
                        return
                    except Exception:
                        return

            async def gemini_to_client() -> None:
                """Relay Gemini responses → client."""
                try:
                    async for raw_msg in gemini_ws:
                        parsed = json.loads(
                            raw_msg if isinstance(raw_msg, str) else bytes(raw_msg).decode()
                        )
                        for out in _gemini_msg_to_client(parsed):
                            await ws.send_text(json.dumps(out))
                except websockets.ConnectionClosed:
                    pass
                except Exception:
                    pass

            await asyncio.gather(client_to_gemini(), gemini_to_client())

    except WebSocketDisconnect:
        pass
    except websockets.InvalidURI as exc:
        await _safe_send(ws, {"type": "error", "message": f"Invalid Gemini URL: {exc}"})
    except websockets.WebSocketException as exc:
        hint = (
            f" | Check GEMINI_LIVE_MODEL in .env (current: {settings.gemini_live_model}). "
            "Valid: gemini-2.0-flash-live-001, gemini-live-2.5-flash-preview"
            if "1011" in str(exc) or "1002" in str(exc) else ""
        )
        await _safe_send(ws, {"type": "error", "message": f"Gemini connection error: {exc}{hint}"})
    except Exception as exc:
        tb = traceback.format_exc()
        print(f"[live] Unexpected error:\n{tb}")
        await _safe_send(ws, {"type": "error", "message": str(exc)})


async def _safe_send(ws: WebSocket, msg: dict) -> None:
    try:
        await ws.send_text(json.dumps(msg))
        await ws.close(code=1011)
    except Exception:
        pass
