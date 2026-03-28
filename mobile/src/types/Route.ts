export type FrictionLevel = 'low' | 'medium' | 'high';

export interface RouteSegment {
  id: string;
  instruction: string;
  distance: string;
  friction: FrictionLevel;
  confidence: number;
  type: string;
  details?: string;
}

export interface Route {
  id: string;
  name: string;
  totalDistance: string;
  estimatedTime: string;
  overallFriction: FrictionLevel;
  confidence: number;
  segments: RouteSegment[];
}
