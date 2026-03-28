import { createContext, useContext, useState, ReactNode } from 'react';
import { Route } from '../types/Route';
import { fetchRoutes as apiFetchRoutes } from '../services/api';

interface RouteContextType {
  origin: string;
  setOrigin: (origin: string) => void;
  destination: string;
  setDestination: (destination: string) => void;
  activeRoute: Route | null;
  setActiveRoute: (route: Route | null) => void;
  routes: Route[];
  isLoading: boolean;
  error: string | null;
  transitMode: 'walk' | 'all';
  setTransitMode: (mode: 'walk' | 'all') => void;
  loadRoutes: (profile: string, languageCode?: string, modeOverride?: 'walk' | 'all') => Promise<void>;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const RouteProvider = ({ children }: { children: ReactNode }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitMode, setTransitMode] = useState<'walk' | 'all'>('walk');

  const loadRoutes = async (profile: string, languageCode = 'en', modeOverride?: 'walk' | 'all') => {
    if (!origin || !destination) return;
    setIsLoading(true);
    setError(null);
    setRoutes([]);
    setActiveRoute(null);
    try {
      const fetched = await apiFetchRoutes(origin, destination, profile, languageCode, modeOverride ?? transitMode);
      setRoutes(fetched);
      if (fetched.length > 0) setActiveRoute(fetched[0]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch routes';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RouteContext.Provider value={{
      origin, setOrigin,
      destination, setDestination,
      activeRoute, setActiveRoute,
      routes, isLoading, error,
      transitMode, setTransitMode,
      loadRoutes,
    }}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRoute = () => {
  const context = useContext(RouteContext);
  if (context === undefined) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
};
