# AccessiblePath

**Accessibility-aware route comparator for Los Angeles**

#AccessiblePath compares walking routes and scores each one for accessibility friction based on your mobility profile (wheelchair, low-vision, or stroller). It uses Gemini to power friction scoring, a live camera+voice assistant, and spoken turn-by-turn navigation.

---

## Features

- **Route comparison** — up to 3 walking (or transit) routes scored for accessibility
- **Friction scoring** — each segment scored LOW / MEDIUM / HIGH using OpenStreetMap tags, Google Street View, and Gemini
- **Live assistant** — camera + microphone streamed to Gemini Live API; asks questions, sees your surroundings, warns about barriers, and can trigger a reroute
- **Turn-by-turn navigation** — GPS auto-advance, TTS voice instructions prefetched per step
- **Reroute on demand** — ask the live assistant to reroute and it calls the backend automatically
- **Profiles** — wheelchair, low-vision, stroller (each changes scoring thresholds and voice guidance)
- **Walk / transit toggle** — switch between walking-only and mixed transit routes

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React Native for Web (Vite), TypeScript |
| Backend | FastAPI (Python), uvicorn |
| Maps | Google Maps JavaScript API, Google Routes API, Google Street View |
| AI | Gemini (friction scoring, TTS, Live API with native audio) |
| Accessibility data | OpenStreetMap Overpass API, LA Metro GTFS-RT |

---

## Local Development

### Backend

```bash
cd backend

# Create and fill in env vars
cp .env.example .env
# Edit .env with your keys

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd mobile
npm install

# Create env file
echo "VITE_GOOGLE_MAPS_API_KEY=your_key_here" > .env
echo "VITE_BACKEND_URL=http://localhost:8000" >> .env

npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

### `backend/.env`

```env
GOOGLE_MAPS_API_KEY=...
GEMINI_API_KEY=...
GEMINI_SCORING_MODEL=gemini-3-flash-preview
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
```

### `mobile/.env`

```env
VITE_GOOGLE_MAPS_API_KEY=...
VITE_BACKEND_URL=http://localhost:8000
```
