# PathSense — Implementation Plan

## Overview

PathSense is an accessibility-aware route comparator built for the LA Gemini Hackathon. It compares multiple routes to the same destination and scores each one for accessibility friction based on a user profile (wheelchair, low-vision, stroller). Gemini powers the scoring, voice interaction (Live API), and spoken summaries (TTS). Demo zone: **UCLA Campus**.

---

## Key Decisions

| Decision | Choice |
|---|---|
| Backend | FastAPI in `backend/` at repo root |
| Mobile framework | Expo + React Native + TypeScript + NativeWind |
| Gemini scoring | `gemini-3.0-flash` |
| Gemini Live API | `gemini-3.1-flash-live-001` |
| Gemini TTS | `gemini-3.0-flash-preview-tts` |
| Demo zone | UCLA Campus (pre-cached routes + friction scores) |
| Localization | English + Spanish + French (device language auto-detected) |
| Platforms | Expo Go on iOS + Android |
| Backend deployment | Google Cloud Run or Railway (Dockerfile included) |
| API keys | Placeholders only — fill in `.env` before running |
| Env strategy | `mobile/.env` for `EXPO_PUBLIC_*`; root `.env` for backend |

---

## Repo Structure

```
LAGeminiHacks/
  README.md
  PLAN.md                     ← this file
  .gitignore                  ← covers .env, node_modules, .expo, __pycache__, etc.
  .env                        ← backend env vars (never commit)
  .env.example                ← backend key placeholders (safe to commit)
  mobile/
    app.json                  ← Expo config (name, icons, permissions)
    babel.config.js           ← NativeWind + Reanimated transforms
    tsconfig.json
    tailwind.config.js        ← NativeWind config
    .env                      ← EXPO_PUBLIC_* keys (never commit)
    .env.example              ← mobile key placeholders (safe to commit)
    package.json
    app/
      _layout.tsx             ← LocaleProvider + ProfileProvider + RouteProvider
      index.tsx               ← Screen 1: Profile select (wheelchair / low-vision / stroller)
      search.tsx              ← Screen 2: Origin + destination input
      results.tsx             ← Screen 3: Map + route comparison cards
      segment.tsx             ← Screen 4: Segment drill-down (bottom sheet)
      navigate.tsx            ← Screen 5: Active navigation + voice
    components/
      map/
        RouteMap.tsx          ← react-native-maps, colored polylines per route
        SegmentPolyline.tsx   ← single segment, color = friction level
        FrictionMarker.tsx    ← callout pin on high-risk segment
      route/
        RouteCard.tsx         ← fastest / low-friction / balanced card
        FrictionBadge.tsx     ← LOW / MEDIUM / HIGH pill
        ConfidenceMeter.tsx   ← confidence % bar
        SegmentPanel.tsx      ← bottom sheet: Street View + Gemini explanation
      voice/
        VoiceButton.tsx       ← mic → Live API session
        VoiceSheet.tsx        ← transcript bottom sheet
        TTSAlert.tsx          ← plays spoken alert in detected language
      profile/
        ProfileCard.tsx       ← wheelchair / low-vision / stroller select card
        ProfileBadge.tsx      ← current profile chip in header
      SearchBar.tsx           ← origin + destination + Places autocomplete
    hooks/
      useLocale.ts            ← reads device language via expo-localization
      useRoutes.ts            ← fetch routes + friction scores (falls back to demo data)
      useLiveAPI.ts           ← WebSocket to /api/live + languageCode
      useTTS.ts               ← calls /api/tts, plays with expo-av
      useLocation.ts          ← GPS via expo-location
      useProfile.ts           ← read/write profile via AsyncStorage
    api/
      client.ts               ← axios instance → EXPO_PUBLIC_API_BASE_URL
      routes.ts               ← getRoutes(origin, dest, profile)
      friction.ts             ← getFriction(segments, profile, language)
      tts.ts                  ← speakSummary(text, languageTag)
      live.ts                 ← openLiveSession(routeCtx, languageCode)
    store/
      LocaleContext.tsx       ← languageCode + languageTag + isRTL globally
      ProfileContext.tsx      ← current accessibility profile
      RouteContext.tsx        ← active routes + selected segment
    constants/
      frictionColors.ts       ← green #81C995 / amber #FA7B17 / red #F28B82
      profiles.ts             ← wheelchair, low-vision, stroller definitions
      prompts.ts              ← Gemini friction prompt (parameterized by profile + language)
      supportedLanguages.ts   ← ['en-US', 'es-ES', 'fr-FR'] BCP-47 codes
    types/
      Route.ts                ← Route, Segment, FrictionScore
      Profile.ts              ← UserProfile, ProfileType
      API.ts                  ← request/response shapes including TTSRequest
      Locale.ts               ← LocaleInfo { languageCode, languageTag, isRTL }
    assets/
      icon.png
      splash.png
    demo/
      routes.json             ← pre-cached UCLA routes (offline fallback)
      friction.json           ← pre-cached Gemini friction scores (English)
      friction_es.json        ← Spanish variant
      friction_fr.json        ← French variant
  backend/
    main.py                   ← FastAPI app, CORS, lifespan, health check
    config.py                 ← pydantic-settings reads .env
    models.py                 ← Pydantic request/response models
    routers/
      routes.py               ← POST /api/routes → Google Maps Routes API
      friction.py             ← POST /api/friction → Gemini scoring → JSON
      tts.py                  ← POST /api/tts → Gemini TTS → audio bytes
      live.py                 ← WebSocket /api/live → Gemini Live API proxy
    requirements.txt
    .env                      ← not committed (symlink or copy of root .env)
    .env.example              ← backend key placeholders
    Dockerfile
    .dockerignore
```

---

## Environment Variables

### Backend — root `.env` / `backend/.env.example`

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_SCORING_MODEL=gemini-3.0-flash
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-001
GEMINI_TTS_MODEL=gemini-3.0-flash-preview-tts
```

### Mobile — `mobile/.env` / `mobile/.env.example`

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_sdk_key_here
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## Packages

### Mobile (`mobile/package.json`)

| Package | Purpose |
|---|---|
| `expo` | Core Expo SDK — manages build, permissions, native modules |
| `expo-router` | File-based navigation — `app/` folder = screens automatically |
| `react-native-maps` | Google Maps on iOS + Android, polyline support for routes |
| `expo-location` | GPS coordinates for current position and live navigation |
| `expo-av` | Audio playback for TTS responses |
| `expo-camera` | Live camera feed for Live API visual input |
| `axios` | HTTP client for all backend API calls |
| `@react-native-async-storage/async-storage` | Persist user profile between sessions |
| `react-native-bottom-sheet` | Segment drill-down sheet that slides up on tap |
| `react-native-reanimated` | Required by bottom-sheet, smooth animations |
| `nativewind` | Tailwind CSS for React Native — same class names as web |
| `expo-constants` | Read `EXPO_PUBLIC_` env vars safely at runtime |
| `expo-localization` | Detect device language for TTS + friction language |

### Backend (`backend/requirements.txt`)

| Package | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn[standard]` | ASGI server |
| `pydantic-settings` | Typed config from `.env` |
| `httpx` | Async HTTP client for Google Maps + Gemini calls |
| `websockets` | Live API WebSocket proxy |
| `python-dotenv` | Load `.env` for local dev |

---

## Implementation Phases

### Phase 1 — Scaffold
> Steps 1a–1c can run in parallel.

- **1a** — Init Expo TypeScript app in `mobile/` (`create-expo-app --template expo-template-blank-typescript`), install all packages listed above, configure `babel.config.js` and `tailwind.config.js` for NativeWind
- **1b** — Create `backend/` skeleton: `main.py`, `config.py`, `models.py`, empty router files, `requirements.txt`, `Dockerfile`
- **1c** — Update root `.gitignore`; create `mobile/.env` + `mobile/.env.example`; populate root `.env.example` with all backend key placeholders

### Phase 2 — Types + Constants
> Depends on Phase 1a.

Define all TypeScript types and constants:
- `types/Route.ts`, `types/Profile.ts`, `types/API.ts`, `types/Locale.ts`
- `constants/frictionColors.ts`, `constants/profiles.ts`, `constants/prompts.ts`, `constants/supportedLanguages.ts`

### Phase 3 — Store + Contexts
> Depends on Phase 2.

- `LocaleContext.tsx` — wraps `expo-localization`, exposes `{ languageCode, languageTag, isRTL }`
- `ProfileContext.tsx` — reads/writes profile via `AsyncStorage`
- `RouteContext.tsx` — holds active routes array + selected segment
- `_layout.tsx` — wraps all three providers around `<Slot />`

### Phase 4 — API Layer
> Steps 4a and 4b can run in parallel; both depend on Phase 1.

- **4a** Backend routers:
  - `routes.py` — calls Google Maps Routes API, returns up to 3 candidate routes
  - `friction.py` — calls Gemini with the scoring prompt, returns `FrictionScore` JSON
  - `tts.py` — calls Gemini TTS, streams back audio bytes
  - `live.py` — proxies WebSocket frames between mobile and Gemini Live API
- **4b** Mobile API + hooks:
  - `api/client.ts` — axios base instance with `EXPO_PUBLIC_API_BASE_URL`
  - `api/routes.ts`, `api/friction.ts`, `api/tts.ts`, `api/live.ts` — typed API wrappers
  - `hooks/useRoutes.ts` — fetches routes + friction, falls back to `demo/` JSON if offline
  - `hooks/useTTS.ts`, `hooks/useLiveAPI.ts`, `hooks/useLocation.ts`, `hooks/useProfile.ts`, `hooks/useLocale.ts`

### Phase 5 — Components
> Depends on Phases 2–3. Steps 5a–5e can run in parallel.

- **5a** `ProfileCard`, `ProfileBadge`
- **5b** `RouteMap` (3 color-coded polylines), `SegmentPolyline`, `FrictionMarker`
- **5c** `RouteCard`, `FrictionBadge`, `ConfidenceMeter`, `SegmentPanel`
- **5d** `VoiceButton`, `VoiceSheet`, `TTSAlert`
- **5e** `SearchBar` (Places autocomplete via backend)

### Phase 6 — Screens
> Depends on Phases 4–5.

| Screen | File | Key deps |
|---|---|---|
| Profile select | `index.tsx` | `ProfileCard`, `useProfile` |
| Route search | `search.tsx` | `SearchBar`, `useLocation` |
| Results | `results.tsx` | `RouteMap`, `RouteCard`, `useRoutes` |
| Segment drill-down | `segment.tsx` | `SegmentPanel`, `VoiceButton` |
| Active navigation | `navigate.tsx` | `useLiveAPI`, `useTTS`, `TTSAlert` |

### Phase 7 — Demo Data
> Can run in parallel with Phase 6.

- Hardcode pre-cached UCLA Campus route data into `demo/routes.json`
- Pre-run Gemini scoring for each segment → `demo/friction.json` (EN), `friction_es.json`, `friction_fr.json`
- `useRoutes` falls back to demo data if the backend returns an error or is unreachable (critical for demo resilience)

### Phase 8 — UI Polish
> Depends on Phase 6.

- Apply Gemini dark theme via NativeWind: `bg-[#1C1C1E]`, blue `#8AB4F8`, green `#81C995`, amber `#FA7B17`, red `#F28B82`
- Reanimated smooth transitions for bottom sheet
- `ProfileBadge` in header on `results.tsx` and `navigate.tsx`

---

## Friction Scoring Prompt

`constants/prompts.ts` exports a template function parameterized by profile, language, segment, and evidence:

```
You are an accessibility expert. Given route segment data and a user profile,
return a JSON friction assessment.

Profile: {profile} ({profileDescription})
Language: {languageCode}
Segment: {segmentDescription}
Evidence: {evidenceList}

Respond ONLY with valid JSON:
{
  "frictionScore": <0.0–1.0>,
  "confidence": <0.0–1.0>,
  "reasons": ["..."],
  "recommendation": "..."
}
```

Thresholds: `frictionScore < 0.35` → LOW (green), `< 0.65` → MEDIUM (amber), `≥ 0.65` → HIGH (red).

---

## Backend API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check → `{"status":"ok"}` |
| `POST` | `/api/routes` | Returns 3 candidate routes from Google Maps |
| `POST` | `/api/friction` | Returns Gemini friction scores per segment |
| `POST` | `/api/tts` | Returns audio bytes from Gemini TTS |
| `WS` | `/api/live` | WebSocket proxy to Gemini Live API |

---

## Verification Checklist

- [ ] `npx expo start` in `mobile/` → Expo Go QR code opens on iOS + Android
- [ ] `uvicorn main:app --reload` in `backend/` → `GET /api/health` returns `{"status":"ok"}`
- [ ] Profile select → search → results works fully offline via `demo/` data
- [ ] `/api/routes` returns 3 route candidates for a UCLA origin/dest pair
- [ ] `/api/friction` returns valid `FrictionScore` JSON from Gemini
- [ ] TTS plays spoken route summary via `expo-av`
- [ ] Live API WebSocket responds to "Which route is safest for me?"
- [ ] Red segment tap → bottom sheet → VoiceButton → Live API explains segment
- [ ] Device language set to Spanish → `friction_es.json` loads + TTS speaks in Spanish
- [ ] Backend deployed → update `EXPO_PUBLIC_API_BASE_URL` → end-to-end test passes

---

## Out of Scope for MVP

- User-uploaded photos in segment drill-down
- GTFS real-time transit data
- EAS standalone build (Expo Go is sufficient for hackathon demo)
- Full RTL layout (`isRTL` is typed and available in context but not visually implemented)
- Custom `icon.png` / `splash.png` (Expo defaults are fine for demo)
