from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import routes, friction, tts, live

app = FastAPI(title="PathSense API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")
app.include_router(friction.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(live.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
