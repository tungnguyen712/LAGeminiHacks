import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Route } from '../types/Route';

interface RouteContextType {
  origin: string;
  setOrigin: (origin: string) => void;
  destination: string;
  setDestination: (destination: string) => void;
  activeRoute: Route | null;
  setActiveRoute: (route: Route | null) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const RouteProvider = ({ children }: { children: ReactNode }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);

  return (
    <RouteContext.Provider value={{ 
      origin, 
      setOrigin, 
      destination, 
      setDestination, 
      activeRoute, 
      setActiveRoute 
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
