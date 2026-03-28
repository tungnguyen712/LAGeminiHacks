import { useState, useCallback } from 'react';
import { getRoutes } from '../api/routes';
import { getFriction } from '../api/friction';
import type { Route, FrictionLevel, FrictionScore, Segment } from '../types/Route';
import type { ProfileType } from '../types/Profile';
import demoRoutes from '../demo/routes.json';
import demoFrictionEn from '../demo/friction.json';
import demoFrictionEs from '../demo/friction_es.json';
import demoFrictionFr from '../demo/friction_fr.json';
import { useRouteContext } from '../store/RouteContext';
import { scoreToLevel } from '../constants/frictionColors';

const DEMO_FRICTION: Record<string, Record<string, FrictionScore>> = {
  en: (demoFrictionEn as { scores: Record<string, FrictionScore> }).scores,
  es: (demoFrictionEs as { scores: Record<string, FrictionScore> }).scores,
  fr: (demoFrictionFr as { scores: Record<string, FrictionScore> }).scores,
};

function overallFromSegments(segments: Segment[]): FrictionLevel {
  let max = 0;
  let any = false;
  for (const s of segments) {
    const fs = s.friction?.frictionScore;
    if (fs != null) {
      any = true;
      if (fs > max) max = fs;
    }
  }
  if (!any) return 'MEDIUM';
  return scoreToLevel(max);
}

function mergeFrictionIntoRoutes(
  routes: Route[],
  scores: Record<string, FrictionScore>
): Route[] {
  return routes.map((route) => {
    const segments = route.segments.map((seg) => ({
      ...seg,
      friction: scores[seg.id] ?? seg.friction,
    }));
    return {
      ...route,
      segments,
      overallFriction: overallFromSegments(segments),
    };
  });
}

export function useRoutes() {
  const { setRoutes } = useRouteContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(
    async (origin: string, destination: string, profile: ProfileType, languageCode: string) => {
      setLoading(true);
      setError(null);
      const demoScores = DEMO_FRICTION[languageCode] ?? DEMO_FRICTION.en;
      try {
        const routesRes = await getRoutes({ origin, destination, profile });
        let next = routesRes.routes as Route[];
        const segmentsPayload = next.flatMap((r) =>
          r.segments.map((s) => ({
            id: s.id,
            description: s.description,
            distanceMeters: s.distanceMeters,
          }))
        );
        try {
          const frictionRes = await getFriction({
            segments: segmentsPayload,
            profile,
            languageCode,
          });
          next = mergeFrictionIntoRoutes(next, frictionRes.scores as Record<string, FrictionScore>);
        } catch (fe) {
          console.warn('Friction API unavailable, using unscored segments', fe);
        }
        setRoutes(next);
      } catch (err) {
        console.warn('Backend unavailable, falling back to demo data', err);
        const merged = mergeFrictionIntoRoutes(
          demoRoutes.routes as Route[],
          demoScores
        );
        setRoutes(merged);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [setRoutes]
  );

  return { loading, error, fetchRoutes };
}
