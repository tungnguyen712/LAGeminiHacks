# PathSense (LA Gemini Hacks)

Accessibility-aware walking routes with **Google Maps Routes API**, **Gemini** friction scoring, **TTS**, and **Live API** voice (see `PLAN.md`).

## API keys setup (required for live Maps + Gemini)

1. **Copy env file**

   ```bash
   cp .env.example .env
   ```

2. **Google Maps — Routes API**

   - Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Library**.
   - Enable **Routes API** (not only “Directions API” legacy).
   - **Credentials** → create an **API key**.
   - Set `GOOGLE_MAPS_API_KEY` in `.env` to that key.
   - Enable **billing** on the project if Google rejects the key.

3. **Gemini**

   - Open [Google AI Studio API keys](https://aistudio.google.com/apikey).
   - Create a key and set `GEMINI_API_KEY` in `.env`.

4. **Check without exposing secrets**

   ```bash
   cd backend && source .venv/bin/activate && python scripts/check_env.py
   ```

   Exit code **0** means keys are non-empty and not obvious placeholders; **1** means fix `.env` first.

5. **Verify against Google**

   ```bash
   cd backend && source .venv/bin/activate
   pip install -r requirements.txt
   pytest tests/ -v -m integration
   ```

   You want **9 passed** and **0 skipped**. If integration tests **skip** with “API_KEY_INVALID”, the key is wrong or the API (e.g. Routes API) is not enabled.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

## Mobile (Expo)

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL — use your computer's LAN IP for a physical device
npm install --legacy-peer-deps
npx expo start
```

## Tests

```bash
cd backend && source .venv/bin/activate && pytest tests/ -v
```

```bash
cd mobile && npx tsc --noEmit
```
