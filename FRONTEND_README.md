# LAGeminiHacks — Frontend README

> **Person 1 — Frontend**
> Screens · UI · Map · Navigation

---

## Overview

This document covers the full frontend scope for the LAGeminiHacks project. The frontend is built with **Expo (React Native)** and is responsible for all user-facing screens, the map/route UI, navigation flow, and voice interaction layer.

---

## Project Structure

### Screens (`app/`)

| File | Purpose |
|---|---|
| `_layout.tsx` | Root layout — wraps all providers (context, navigation) |
| `index.tsx` | Onboarding screen + profile selector |
| `search.tsx` | Origin and destination input |
| `results.tsx` | Map view + route cards |
| `segment.tsx` | Drill-down bottom sheet for a single route segment |
| `navigate.tsx` | Active turn-by-turn navigation screen |

---

### Components

#### `components/map/`
- `RouteMap` — base map component
- `Polylines` — renders colored route overlays
- `Markers` — origin, destination, and POI markers

#### `components/route/`
- `RouteCard` — summary card for a suggested route
- `FrictionBadge` — color-coded friction level indicator
- `ConfidenceMeter` — visual confidence score for route data
- `SegmentPanel` — expandable detail panel for a route segment

#### `components/profile/`
- `ProfileCard` — displays a selectable mobility profile
- `ProfileBadge` — compact badge showing active profile

#### `components/voice/`
- `VoiceButton` — mic trigger for voice input
- `VoiceSheet` — bottom sheet UI for voice interaction
- `TTSAlert` — text-to-speech alert overlay

#### Root-level Components
- `SearchBar.tsx` — shared origin/destination search input

---

### State & Context (`store/`)

| File | Purpose |
|---|---|
| `store/ProfileContext.tsx` | Global state for the selected mobility profile |
| `store/RouteContext.tsx` | Global state for fetched and active routes |

---

### Constants

| File | Purpose |
|---|---|
| `constants/frictionColors.ts` | Color mapping for friction severity levels |
| `constants/profiles.ts` | Static definitions for mobility profiles |

---

### Types

| File | Purpose |
|---|---|
| `types/Route.ts` | TypeScript types for route and segment data |
| `types/Profile.ts` | TypeScript types for mobility profiles |

---

## Build Milestones

| Hours | Goal |
|---|---|
| **0–3h** | Expo project setup, runs on phone via Expo Go |
| **3–6h** | Onboarding screen — profile selector working, saves to AsyncStorage |
| **6–10h** | Results screen — map renders with hardcoded colored polylines |
| **10–14h** | Route cards + friction badges wired to real data from Person 2 |
| **14–18h** | Segment drill-down sheet + navigate screen |
| **18–22h** | VoiceButton + TTSAlert wired to Person 2's hooks |
| **22–24h** | Polish, demo zone test, Expo Go QR ready for judges |

---

## Integration Points (Person 2 — Backend/Data)

The following frontend components depend on data or hooks provided by Person 2:

- `RouteCard` + `FrictionBadge` — require route + friction data (milestone 10–14h)
- `VoiceButton` + `TTSAlert` — require voice/TTS hooks (milestone 18–22h)
- `ConfidenceMeter` — requires confidence scores per segment

Coordinate on shared types in `types/Route.ts` and `types/Profile.ts` early to avoid integration friction.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Scan QR with Expo Go on your phone
```

---

## Notes

- Target: **Expo Go** (no custom native modules unless necessary)
- State management via React Context — no Redux
- All profile selections persist via **AsyncStorage**
