/**
 * PathSense backend API client.
 * Calls the FastAPI backend at EXPO_PUBLIC_API_BASE_URL (default: http://localhost:8000).
 */
import axios from 'axios';
import { Route, RouteSegment, FrictionLevel } from '../types/Route';


const BASE = (process.env.BACKEND_URL as string) || 'http://localhost:8000';

// ── Backend response types ────────────────────────────────────────────────────

interface BackendFriction {
  frictionScore: number;
  confidence: number;
  reasons: string[];
  recommendation: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface BackendSegment {
  id: string;
  description: string;
  segmentType: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceMeters: number;
  friction?: BackendFriction | null;
}

interface BackendRoute {
  id: string;
  label: string;
  mode: string;
  durationSeconds: number;
  distanceMeters: number;
  overallFriction: 'LOW' | 'MEDIUM' | 'HIGH';
  segments: BackendSegment[];
  polylineEncoded: string;
}

// ── Adapters ──────────────────────────────────────────────────────────────────

function fmtDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function toAppSegment(s: BackendSegment): RouteSegment {
  const f = s.friction;
  return {
    id: s.id,
    instruction: s.description,
    distance: fmtDistance(s.distanceMeters),
    friction: (f?.level?.toLowerCase() ?? 'low') as FrictionLevel,
    confidence: f?.confidence ?? 0.5,
    type: s.segmentType,
    details: f?.recommendation || (f?.reasons?.length ? f.reasons.join('; ') : undefined),
    startLat: s.startLat,
    startLng: s.startLng,
    endLat: s.endLat,
    endLng: s.endLng,
  };
}

function toAppRoute(r: BackendRoute): Route {
  const mins = Math.round(r.durationSeconds / 60);
  const segs = r.segments.map(toAppSegment);
  const avgConf = segs.length
    ? segs.reduce((sum, s) => sum + s.confidence, 0) / segs.length
    : 0.5;

  return {
    id: r.id,
    name: r.label.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    totalDistance: fmtDistance(r.distanceMeters),
    estimatedTime: `${mins} min`,
    overallFriction: r.overallFriction.toLowerCase() as FrictionLevel,
    confidence: Math.round(avgConf * 100) / 100,
    mode: r.mode ?? 'walking',
    segments: segs,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch routes from the backend, score friction, and return app-ready Route[].
 * Calls POST /api/routes then POST /api/friction and merges the results.
 */
export async function fetchRoutes(
  origin: string,
  destination: string,
  profile: string,
  languageCode = 'en',
  mode: 'walk' | 'all' = 'walk',
): Promise<Route[]> {
  // Step 1 — get routes
  const routesRes = await axios.post<{ routes: BackendRoute[] }>(`${BASE}/api/routes`, {
    origin,
    destination,
    profile,
    mode: mode === 'walk' ? 'walking' : 'all',
  });
  const backendRoutes = routesRes.data.routes ?? [];
  if (!backendRoutes.length) return [];

  // Step 2 — collect all walk segments for friction scoring
  const allSegments = backendRoutes.flatMap(r =>
    r.segments.map(s => ({
      id: s.id,
      description: s.description,
      distanceMeters: s.distanceMeters,
      segmentType: s.segmentType,
      startLat: s.startLat,
      startLng: s.startLng,
      endLat: s.endLat,
      endLng: s.endLng,
    }))
  );

  // Step 3 — score friction
  const frictionRes = await axios.post<{ scores: Record<string, BackendFriction> }>(
    `${BASE}/api/friction`,
    { segments: allSegments, profile, languageCode },
  );
  const scores = frictionRes.data.scores ?? {};

  // Step 4 — embed scores into segments
  const enriched = backendRoutes.map(route => ({
    ...route,
    segments: route.segments.map(seg => ({
      ...seg,
      friction: scores[seg.id] ?? seg.friction ?? null,
    })),
  }));

  return enriched.map(toAppRoute);
}

/**
 * Request a local detour around a HIGH-friction segment.
 * Returns replacement RouteSegment[] (not yet friction-scored).
 */
export async function rerouteSegment(
  segment: RouteSegment,
  profile: string,
): Promise<RouteSegment[]> {
  const res = await axios.post<{
    segmentId: string;
    replacementSegments: BackendSegment[];
  }>(`${BASE}/api/reroute`, {
    segmentId: segment.id,
    startLat: segment.startLat,
    startLng: segment.startLng,
    endLat: segment.endLat,
    endLng: segment.endLng,
    profile,
  });
  return (res.data.replacementSegments ?? []).map(toAppSegment);
}
