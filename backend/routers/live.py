from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
import asyncio
import json
from config import settings

router = APIRouter()

GEMINI_LIVE_URL = (
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta"
    ".GenerativeService.BidiGenerateContent?key={key}"
)


@router.websocket("/live")
async def live_proxy(ws: WebSocket):
    """
    Bidirectional WebSocket proxy between mobile client and Gemini Live API.
    TODO: Confirm Gemini 3.1 Flash Live WebSocket protocol details.
    """
    await ws.accept()
    gemini_url = GEMINI_LIVE_URL.format(key=settings.gemini_api_key)

    try:
        async with websockets.connect(gemini_url) as gemini_ws:
            async def client_to_gemini():
                while True:
                    data = await ws.receive_text()
                    await gemini_ws.send(data)

            async def gemini_to_client():
                async for msg in gemini_ws:
                    await ws.send_text(msg if isinstance(msg, str) else msg.decode())

            await asyncio.gather(client_to_gemini(), gemini_to_client())
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await ws.close(code=1011, reason=str(e))
