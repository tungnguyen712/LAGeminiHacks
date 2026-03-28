# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

"""
PathSense Live API — interactive terminal demo.

Connects to the /api/live WebSocket endpoint, sends route context, and lets
you have a real-time text or voice conversation with the Gemini accessibility
assistant.

Camera: the terminal demo does NOT use a camera — that is a mobile-app feature
(expo-camera sends frames via the React Native client to the same WebSocket).

Microphone: optional — requires  pip install sounddevice numpy
  - Without sounddevice:  text-only mode (always works)
  - With sounddevice:     add --voice flag to speak instead of typing

Prerequisites
-------------
  1. Fill in backend/.env  (GEMINI_API_KEY, GEMINI_LIVE_MODEL)
     GEMINI_LIVE_MODEL must be a Live-capable model, e.g.:
       gemini-2.0-flash-live-001          <- default, stable
       gemini-live-2.5-flash-preview      <- newer preview
  2. Start the server:   uvicorn main:app --reload
  3. Run this script:    python live_demo.py

Usage
-----
  # Default — text mode, wheelchair profile, built-in UCLA context
  python live_demo.py

  # Voice mode (requires sounddevice):  press Enter to record, Enter to send
  python live_demo.py --voice

  # With real routes fetched live from the server
  python live_demo.py --fetch-routes
  python live_demo.py --fetch-routes --origin "Union Station, Los Angeles" --dest "Grand Park, Los Angeles"

  # Different profiles / languages
  python live_demo.py --profile stroller
  python live_demo.py --profile low-vision --language es
  python live_demo.py --fetch-routes --profile wheelchair --language fr --voice

Example questions to try
-------------------------
  Which route is safest for me?
  Tell me about the HIGH friction segments on the fastest route.
  Should I take the balanced route instead?
  What should I watch out for at the stairs?
  Is this route accessible for a manual wheelchair?
  What does HIGH friction mean?
  Explain the low-friction route.
"""
import argparse
import asyncio
import base64
import json
import queue
import sys
import time
import threading

import httpx
import websockets

# ── Optional mic support via sounddevice ──────────────────────────────────────
try:
    import sounddevice as sd   # pip install sounddevice
    import numpy as np
    _MIC_AVAILABLE = True
except ImportError:
    _MIC_AVAILABLE = False

# ── Optional camera support via opencv ────────────────────────────────────────
try:
    import cv2  # pip install opencv-python
    _CAM_AVAILABLE = True
except ImportError:
    _CAM_AVAILABLE = False

CAM_FPS        = 1      # frames per second sent to Gemini (low = less bandwidth)
CAM_JPEG_QUALITY = 80   # JPEG quality (0-100)

MIC_SAMPLE_RATE   = 16000   # Hz — Gemini Live requires 16 kHz PCM input
MIC_CHANNELS      = 1       # mono
MIC_DTYPE         = "int16"
MIC_CHUNK_FRAMES  = 1600    # 100 ms per chunk → low latency

# ── ANSI colours ──────────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
WHITE  = "\033[97m"
BLUE   = "\033[94m"


def color(text: str, *codes: str) -> str:
    return "".join(codes) + str(text) + RESET


def hr(char: str = "-", width: int = 60) -> str:
    return color(char * width, DIM)


BASE_URL      = "http://localhost:8000"
WS_LIVE_URL   = "ws://localhost:8000/api/live"


# ── Canned UCLA route context (used when --fetch-routes is not set) ────────────

UCLA_CONTEXT = [
    {
        "id": "route-0", "label": "fastest", "mode": "walking",
        "durationSeconds": 720, "distanceMeters": 950,
        "segments": [
            {"id": "r0s0", "description": "Head north on Bruin Walk",
             "segmentType": "walk", "distanceMeters": 320,
             "friction": {"level": "LOW",  "frictionScore": 0.12, "confidence": 0.85,
                          "reasons": [], "recommendation": ""}},
            {"id": "r0s1", "description": "Turn right — Take the stairs to Powell Library",
             "segmentType": "walk", "distanceMeters": 230,
             "friction": {"level": "HIGH", "frictionScore": 0.95, "confidence": 0.98,
                          "reasons": ["12 concrete stairs, no ramp visible"],
                          "recommendation": "Avoid — use the ramp on Westwood Plaza instead"}},
            {"id": "r0s2", "description": "Continue on Charles E. Young Drive",
             "segmentType": "walk", "distanceMeters": 400,
             "friction": {"level": "LOW",  "frictionScore": 0.15, "confidence": 0.80,
                          "reasons": [], "recommendation": ""}},
        ],
    },
    {
        "id": "route-1", "label": "low-friction", "mode": "walking",
        "durationSeconds": 960, "distanceMeters": 1200,
        "segments": [
            {"id": "r1s0", "description": "Head south via accessible ramp on Westwood Plaza",
             "segmentType": "walk", "distanceMeters": 400,
             "friction": {"level": "LOW",  "frictionScore": 0.10, "confidence": 0.90,
                          "reasons": ["Lowered kerb, smooth asphalt"], "recommendation": ""}},
            {"id": "r1s1", "description": "Continue on Campus Drive East",
             "segmentType": "walk", "distanceMeters": 800,
             "friction": {"level": "MEDIUM", "frictionScore": 0.40, "confidence": 0.70,
                          "reasons": ["Brick surface increases rolling resistance"],
                          "recommendation": "Manageable but expect extra effort"}},
        ],
    },
]


# ── Server helpers ─────────────────────────────────────────────────────────────

def wait_for_server(timeout: int = 5) -> bool:
    for _ in range(timeout):
        try:
            httpx.get(f"{BASE_URL}/api/health", timeout=1)
            return True
        except Exception:
            time.sleep(1)
    return False


def fetch_routes(origin: str, destination: str, profile: str) -> list:
    """Fetch real route + friction data from the running server."""
    print(color(f"  Fetching routes: {origin} -> {destination}", DIM))
    try:
        resp = httpx.post(
            f"{BASE_URL}/api/routes",
            json={"origin": origin, "destination": destination, "profile": profile, "mode": "walking"},
            timeout=30,
        )
        resp.raise_for_status()
        routes = resp.json()["routes"]
    except Exception as exc:
        print(color(f"  Route fetch failed: {exc} — using canned UCLA context", YELLOW))
        return UCLA_CONTEXT

    # Fetch friction scores
    all_segments = [
        {"id": s["id"], "description": s["description"],
         "distanceMeters": s["distanceMeters"], "segmentType": s.get("segmentType", "walk"),
         "startLat": s["startLat"], "startLng": s["startLng"],
         "endLat": s["endLat"], "endLng": s["endLng"]}
        for r in routes for s in r["segments"]
    ]
    try:
        resp = httpx.post(
            f"{BASE_URL}/api/friction",
            json={"segments": all_segments, "profile": profile, "languageCode": "en"},
            timeout=60,
        )
        resp.raise_for_status()
        scores = resp.json()["scores"]
    except Exception as exc:
        print(color(f"  Friction fetch failed: {exc} — routes loaded without scores", YELLOW))
        return routes

    # Embed friction into segment objects
    for route in routes:
        for seg in route["segments"]:
            sc = scores.get(seg["id"])
            if sc:
                seg["friction"] = sc
    return routes


# ── Print route context summary ────────────────────────────────────────────────

def print_context(routes: list) -> None:
    print(hr())
    print(color("  Route context loaded into assistant:", BOLD))
    for r in routes:
        segs   = r.get("segments", [])
        high   = sum(1 for s in segs if s.get("friction", {}).get("level") == "HIGH")
        med    = sum(1 for s in segs if s.get("friction", {}).get("level") == "MEDIUM")
        low    = sum(1 for s in segs if s.get("friction", {}).get("level") == "LOW")
        mins   = round(r.get("durationSeconds", 0) / 60)
        km     = r.get("distanceMeters", 0) / 1000
        mode_c = CYAN if r.get("mode") == "transit" else WHITE
        print(
            f"  {color(r['label'].upper(), BOLD, mode_c):<22}"
            f"  {mins} min  {km:.1f} km  "
            f"{color(f'{low}L', GREEN)} {color(f'{med}M', YELLOW)} {color(f'{high}H', RED)}"
        )
    print(hr())


# ── Mic helpers ───────────────────────────────────────────────────────────────

class MicRecorder:
    """Records microphone audio into a queue as base64-encoded PCM chunks.

    Usage:
        recorder = MicRecorder()
        recorder.start()          # begin streaming mic → queue
        chunk = recorder.get()    # returns (base64_str | None)
        recorder.stop()           # stop recording
    """
    def __init__(self) -> None:
        self._q: queue.Queue[bytes | None] = queue.Queue()
        self._stream: "sd.InputStream | None" = None

    def start(self) -> None:
        def _callback(indata: "np.ndarray", frames: int, time_info: object, status: object) -> None:
            self._q.put(indata.tobytes())

        self._stream = sd.InputStream(
            samplerate=MIC_SAMPLE_RATE,
            channels=MIC_CHANNELS,
            dtype=MIC_DTYPE,
            blocksize=MIC_CHUNK_FRAMES,
            callback=_callback,
        )
        self._stream.start()

    def stop(self) -> None:
        if self._stream:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        self._q.put(None)  # sentinel

    def get_nowait(self) -> bytes | None:
        """Return the next PCM chunk or None if the queue is empty."""
        try:
            return self._q.get_nowait()
        except queue.Empty:
            return None

    def drain(self) -> list[bytes]:
        """Drain all pending chunks from the queue."""
        chunks: list[bytes] = []
        while True:
            item = self.get_nowait()
            if item is None:
                break
            chunks.append(item)
        return chunks


# ── Camera streamer ────────────────────────────────────────────────────────────

class CameraStreamer:
    """Captures webcam frames and sends them to Gemini via the WebSocket.

    Usage:
        streamer = CameraStreamer(ws)
        await streamer.start()   # begins streaming in background
        await streamer.stop()    # stops and releases camera
    """
    def __init__(self, ws: "websockets.ClientConnection") -> None:
        self._ws = ws
        self._cap: "cv2.VideoCapture | None" = None
        self._task: asyncio.Task | None = None

    async def start(self) -> bool:
        """Open camera and begin streaming. Returns False if camera unavailable."""
        self._cap = cv2.VideoCapture(0)
        if not self._cap.isOpened():
            self._cap = None
            return False
        self._task = asyncio.create_task(self._stream())
        return True

    async def _stream(self) -> None:
        interval = 1.0 / CAM_FPS
        while self._cap and self._cap.isOpened():
            ret, frame = self._cap.read()
            if ret:
                _, buf = cv2.imencode(
                    ".jpg", frame,
                    [cv2.IMWRITE_JPEG_QUALITY, CAM_JPEG_QUALITY],
                )
                data = base64.b64encode(buf.tobytes()).decode()
                try:
                    await self._ws.send(json.dumps({
                        "type": "video",
                        "data": data,
                        "mimeType": "image/jpeg",
                    }))
                except Exception:
                    break
            await asyncio.sleep(interval)

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._cap:
            self._cap.release()
            self._cap = None


# ── Main interactive session ───────────────────────────────────────────────────

async def run_live_session(
    profile: str,
    language: str,
    routes: list,
    voice_mode: bool = False,
    camera_mode: bool = False,
) -> None:
    print()
    print(color("  PathSense — Live API demo  ", BOLD, CYAN))
    print(hr())
    print(f"  {color('Profile', BOLD)}    {profile}")
    print(f"  {color('Language', BOLD)}   {language}")
    input_desc = ("voice (mic)" if voice_mode else "text (keyboard)")
    if camera_mode:
        input_desc += " + camera"
    print(f"  {color('Input', BOLD)}      {input_desc}")
    print_context(routes)

    # Native audio models only accept ["AUDIO"]; text-only sessions use ["TEXT"]
    modalities = ["AUDIO"] if voice_mode else ["TEXT"]
    print(f"\n  {color('Connecting to ' + WS_LIVE_URL, DIM)} ...")

    setup_frame = json.dumps({
        "setup": {
            "profile": profile,
            "languageCode": language,
            "responseModalities": modalities,
            "routes": routes,
        }
    })

    try:
        async with websockets.connect(WS_LIVE_URL) as ws:
            # Send PathSense setup
            await ws.send(setup_frame)

            # Wait for setupComplete
            while True:
                raw = await ws.recv()
                msg = json.loads(raw)
                if msg.get("type") == "setupComplete":
                    print(color("  Connected! Assistant is ready.\n", GREEN))
                    break
                if msg.get("type") == "error":
                    print(color(f"\n  Setup error: {msg.get('message')}", RED))
                    return

            # ── Start camera streamer if requested ─────────────────────────
            camera: CameraStreamer | None = None
            if camera_mode:
                camera = CameraStreamer(ws)
                ok = await camera.start()
                if ok:
                    print(color("  Camera streaming started (1 fps).", GREEN))
                else:
                    print(color("  Camera not found — continuing without video.", YELLOW))
                    camera = None

            # Print usage tips
            print(hr())
            if voice_mode:
                print(color("  Voice mode: press Enter to START recording, Enter again to SEND.", DIM))
                print(color("  Type  exit  or  quit  to end the session.", DIM))
            else:
                print(color("  Ask anything about your routes. Try:", DIM))
                print(color('    "Which route is safest for me?"', DIM))
                print(color('    "Tell me about the HIGH friction segments."', DIM))
                print(color('    "Should I take the balanced route instead?"', DIM))
                print(color('    Type  exit  or  quit  to end the session.', DIM))
            print(hr())

            # ── Receive loop (shared by text + voice) ──────────────────────
            _audio_buf: list[bytes] = []   # accumulate chunks before playing

            async def recv_loop() -> None:
                nonlocal _audio_buf
                in_response = False
                try:
                    async for raw in ws:
                        msg = json.loads(raw)
                        t = msg.get("type")

                        if t == "text":
                            if not in_response:
                                print(f"\n{color('PathSense', BOLD, GREEN)}: ", end="", flush=True)
                                in_response = True
                            print(msg.get("content", ""), end="", flush=True)

                        elif t == "turnComplete":
                            if in_response:
                                print()
                                in_response = False
                            # Play accumulated audio when the turn is done
                            if _audio_buf and _MIC_AVAILABLE:
                                pcm = b"".join(_audio_buf)
                                arr = np.frombuffer(pcm, dtype=np.int16)
                                sd.play(arr, samplerate=24000, blocking=False)
                            _audio_buf = []

                        elif t == "audioChunk":
                            if not in_response:
                                print(color("\n  [PathSense speaking...]", DIM))
                                in_response = True
                            raw_pcm = base64.b64decode(msg.get("data", ""))
                            _audio_buf.append(raw_pcm)

                        elif t == "error":
                            print(color(f"\n  Error: {msg.get('message')}", RED))
                            return
                except Exception:
                    pass   # connection closed — exit cleanly

            recv_task = asyncio.create_task(recv_loop())

            # ── Text send loop ─────────────────────────────────────────────
            if not voice_mode:
                loop = asyncio.get_running_loop()
                while True:
                    try:
                        text = await loop.run_in_executor(
                            None,
                            lambda: input(f"\n{color('You', BOLD, BLUE)}: ").strip()
                        )
                    except (EOFError, KeyboardInterrupt):
                        break

                    if text.lower() in ("exit", "quit", "q", "bye"):
                        print(color("\n  Session ended. Safe travels!", CYAN))
                        break
                    if not text:
                        continue

                    await ws.send(json.dumps({"type": "text", "content": text}))

            # ── Voice send loop ────────────────────────────────────────────
            else:
                recorder = MicRecorder()
                loop = asyncio.get_running_loop()
                recording = False

                while True:
                    try:
                        prompt = (
                            f"\n{color('[REC]', RED, BOLD)} Press Enter to STOP  "
                            if recording else
                            f"\n{color('You', BOLD, BLUE)} Press Enter to SPEAK (or type to send text): "
                        )
                        raw_input = await loop.run_in_executor(None, lambda: input(prompt))
                    except (EOFError, KeyboardInterrupt):
                        break

                    if raw_input.lower() in ("exit", "quit", "q", "bye"):
                        print(color("\n  Session ended. Safe travels!", CYAN))
                        break

                    if not recording:
                        if raw_input.strip():
                            # User typed something instead of recording — send as text
                            await ws.send(json.dumps({"type": "text", "content": raw_input.strip()}))
                            continue

                        # Start recording
                        recorder.start()
                        recording = True
                        print(color("  Recording... (press Enter to stop)", RED), flush=True)
                    else:
                        # Stop recording and send all accumulated audio chunks
                        recorder.stop()
                        recording = False
                        chunks = recorder.drain()

                        if not chunks:
                            print(color("  No audio captured.", YELLOW))
                            recorder = MicRecorder()
                            continue

                        print(color(f"  Sending {len(chunks)} audio chunks ...", DIM))
                        for chunk in chunks:
                            await ws.send(json.dumps({
                                "type": "audio",
                                "data": base64.b64encode(chunk).decode(),
                                "mimeType": f"audio/pcm;rate={MIC_SAMPLE_RATE}",
                            }))
                        # Signal end of turn
                        await ws.send(json.dumps({"type": "audioEnd"}))
                        recorder = MicRecorder()

                if recording:
                    recorder.stop()

            if camera:
                await camera.stop()

            recv_task.cancel()
            try:
                await recv_task
            except asyncio.CancelledError:
                pass

    except ConnectionRefusedError:
        print(color("  Connection refused — is the server running?", RED))
        print(color("  Start it with:  uvicorn main:app --reload", DIM))
    except websockets.WebSocketException as exc:
        print(color(f"  WebSocket error: {exc}", RED))
    except Exception as exc:
        print(color(f"  Unexpected error: {exc}", RED))


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="PathSense Live API — interactive terminal demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--profile", default="wheelchair",
                        choices=["wheelchair", "low-vision", "stroller"],
                        help="Accessibility profile (default: wheelchair)")
    parser.add_argument("--language", default="en",
                        help="Response language code (default: en). Try: es, fr, zh")
    parser.add_argument("--fetch-routes", action="store_true",
                        help="Fetch real routes from the server before starting the session")
    parser.add_argument("--origin", default="Ackerman Union, UCLA",
                        help="Origin address (used with --fetch-routes)")
    parser.add_argument("--dest", default="Powell Library, UCLA",
                        help="Destination address (used with --fetch-routes)")
    parser.add_argument("--voice", action="store_true",
                        help="Use microphone input instead of keyboard (requires: pip install sounddevice numpy)")
    parser.add_argument("--camera", action="store_true",
                        help="Stream webcam frames to Gemini (requires: pip install opencv-python)")
    args = parser.parse_args()

    # Validate voice mode
    if args.voice and not _MIC_AVAILABLE:
        print(color("  --voice requires sounddevice: pip install sounddevice numpy", RED))
        sys.exit(1)

    # Validate camera mode
    if args.camera and not _CAM_AVAILABLE:
        print(color("  --camera requires opencv-python: pip install opencv-python", RED))
        sys.exit(1)

    # Check server
    print(color("\n  Checking server ...", DIM), end=" ", flush=True)
    if not wait_for_server():
        print(color("server not responding", RED))
        print(color("  Start it with:  uvicorn main:app --reload", DIM))
        sys.exit(1)
    print(color("online", GREEN))

    # Load route context
    if args.fetch_routes:
        routes = fetch_routes(args.origin, args.dest, args.profile)
    else:
        print(color("  Using built-in UCLA demo context (use --fetch-routes for real data)", DIM))
        routes = UCLA_CONTEXT

    asyncio.run(run_live_session(
        profile=args.profile,
        language=args.language,
        routes=routes,
        voice_mode=args.voice,
        camera_mode=args.camera,
    ))


if __name__ == "__main__":
    main()
