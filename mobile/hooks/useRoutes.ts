import { useState, useCallback } from 'react';
import { getRoutes } from '../api/routes';
import { getFriction } from '../api/friction';
import type { Route } from '../types/Route';
import type { ProfileType } from '../types/Profile';
import demoRoutes from '../demo/routes.json';
import demoFriction from '../demo/friction.json';

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(
    async (origin: string, destination: string, profile: ProfileType, languageCode: string) => {
      setLoading(true);
      setError(null);
      try {
        const routesRes = await getRoutes({ origin, destination, profile });
        // TODO: fetch friction for each route's segments
        setRoutes(routesRes.routes);
      } catch (err) {
        console.warn('Backend unavailable, falling back to demo data', err);
        setRoutes(demoRoutes.routes as Route[]);
        setError(null); // silent fallback
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { routes, loading, error, fetchRoutes };
}
