import React, { createContext, useContext, useState } from 'react';
import type { Route, Segment } from '../types/Route';

interface RouteContextValue {
  routes: Route[];
  setRoutes: (r: Route[]) => void;
  selectedRoute: Route | null;
  setSelectedRoute: (r: Route | null) => void;
  selectedSegment: Segment | null;
  setSelectedSegment: (s: Segment | null) => void;
}

const RouteContext = createContext<RouteContextValue>({
  routes: [],
  setRoutes: () => {},
  selectedRoute: null,
  setSelectedRoute: () => {},
  selectedSegment: null,
  setSelectedSegment: () => {},
});

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  return (
    <RouteContext.Provider
      value={{ routes, setRoutes, selectedRoute, setSelectedRoute, selectedSegment, setSelectedSegment }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRouteContext() {
  return useContext(RouteContext);
}
