# PathSense — Deployment Guide

Two options: **Local network** (laptop + phone on same WiFi, fast setup) or **Cloud** (Railway + Vercel, no laptop needed in the field).

---

## Option A — Local Network (same WiFi)

Best for: testing while staying close to your laptop.

### 1. Find your laptop's LAN IP

```bash
# Windows
ipconfig
# Look for IPv4 Address under your WiFi adapter, e.g. 192.168.1.42
```

### 2. Configure frontend

In `mobile/.env`:
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_BACKEND_URL=http://192.168.1.42:8000
```

### 3. Start the backend

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

> If Windows Firewall blocks the phone: open **Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule → Port → TCP 8000 → Allow**.

### 4. Start the frontend

```bash
cd mobile
npm run dev -- --host
```

Vite prints a `Network:` URL like `http://192.168.1.42:5173`.

### 5. Open on phone

Open **Chrome** (Android) or **Safari** (iOS) and go to `http://192.168.1.42:5173`.

Grant camera and microphone permissions when prompted — Chrome allows both over plain HTTP on `192.168.x.x` addresses (treated as secure origins).

---

## Option B — Cloud Deployment (no laptop needed)

Best for: demo day, walking around without carrying a laptop.

### Backend → Railway

Railway detects the `Dockerfile` automatically.

1. Push the repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
3. Select the repo, set the **Root Directory** to `backend`
4. Add environment variables under **Variables**:

```
GOOGLE_MAPS_API_KEY=...
GEMINI_API_KEY=...
GEMINI_SCORING_MODEL=gemini-3-flash-preview
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
```

5. Railway assigns a public URL like `https://pathsense-backend.up.railway.app`
6. Verify: open `https://pathsense-backend.up.railway.app/api/health` — should return `{"status":"ok"}`

> **WebSocket note:** Railway supports WebSocket connections natively — the Live API (`/api/live`) works without any extra config.

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project → Import Git Repository**
2. Select the same repo, set **Root Directory** to `mobile`
3. Framework preset: **Vite**
4. Add environment variables:

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_BACKEND_URL=https://pathsense-backend.up.railway.app
```

5. Click **Deploy** — Vercel assigns a URL like `https://pathsense.vercel.app`

> **WebSocket URL:** The frontend auto-converts `https://` → `wss://` for the Live API connection, so no extra config is needed.

---

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Yes | Server-side key — Routes API, Street View, Geocoding |
| `GEMINI_API_KEY` | Yes | From [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_SCORING_MODEL` | No | Default: `gemini-2.0-flash` |
| `GEMINI_LIVE_MODEL` | No | Default: `gemini-2.0-flash-live-001` |
| `GEMINI_TTS_MODEL` | No | Default: `gemini-2.5-flash-preview-tts` |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Browser-side key — Maps JS API, Places, Directions |
| `VITE_BACKEND_URL` | Yes | Full URL to the backend, no trailing slash |

---

## Google Maps API Key Setup

The frontend key needs these APIs enabled in [Google Cloud Console](https://console.cloud.google.com):

- Maps JavaScript API
- Places API
- Directions API

The backend key needs:

- Routes API
- Street View Static API
- Geocoding API

Both keys should have appropriate **HTTP referrer** (frontend) and **IP** (backend) restrictions set before going public.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Live assistant "Connection failed" | Wrong `GEMINI_LIVE_MODEL` or key issue | Check backend logs; use `gemini-2.0-flash-live-001` |
| Friction scores all 0.12 / LOW | OSM data sparse for that area | Expected — no-evidence clamp is working correctly |
| TTS no sound | Browser autoplay policy blocked first play | Tap something on the page first, then enable TTS |
| Camera not showing in Live | Permission denied | In Chrome → address bar lock icon → reset permissions |
| Railway deploy fails | Dockerfile path wrong | Set Root Directory to `backend` in Railway settings |
| Vercel build fails | Missing env vars | Add all `VITE_*` variables in Vercel project settings |
| Phone can't reach local backend | Firewall blocking port 8000 | Add inbound rule for TCP 8000 in Windows Firewall |
