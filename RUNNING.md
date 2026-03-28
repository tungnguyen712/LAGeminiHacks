# PathSense — Running the App

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm

---

## 1. Backend

### Setup (first time only)

```bash
cd LAGeminiHacks/backend
pip install -r requirements.txt
```

### Environment — `backend/.env`

```
GOOGLE_MAPS_API_KEY=<your key>
GEMINI_API_KEY=<your key>
GEMINI_SCORING_MODEL=gemini-3-flash-preview
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
```

### Start the server

```bash
cd LAGeminiHacks/backend
uvicorn main:app --reload
```

Server runs at **http://localhost:8000**

Health check: http://localhost:8000/api/health

---

## 2. Mobile (web app)

### Setup (first time only)

```bash
cd LAGeminiHacks/mobile
npm install
```

### Environment — `mobile/.env`

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your key>
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Start the app

```bash
cd LAGeminiHacks/mobile
npm run dev
```

App runs at **http://localhost:5173**

> The backend must be running before opening the results screen.

---

## 3. Live API terminal demo (optional)

Tests the Gemini Live voice assistant from the terminal.

### Setup (first time only)

```bash
pip install sounddevice numpy opencv-python
```

### Run

```bash
cd LAGeminiHacks/backend

# Text mode
python live_demo.py --profile wheelchair

# Voice mode (mic required)
python live_demo.py --voice --profile wheelchair

# Voice + camera
python live_demo.py --voice --camera --profile wheelchair

# With real routes fetched from backend
python live_demo.py --voice --fetch-routes --origin "Union Station, LA" --dest "Grand Park, LA"
```

> The backend must be running before starting the demo.

---

## Typical startup order

```
Terminal 1:  cd LAGeminiHacks/backend && uvicorn main:app --reload
Terminal 2:  cd LAGeminiHacks/mobile  && npm run dev
```

Then open http://localhost:5173 in your browser.
