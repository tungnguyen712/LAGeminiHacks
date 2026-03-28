export type FrictionLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FrictionScore {
  frictionScore: number;      // 0.0–1.0
  confidence: number;         // 0.0–1.0
  reasons: string[];
  recommendation: string;
  level: FrictionLevel;       // derived: <0.35 LOW, <0.65 MEDIUM, >=0.65 HIGH
}

export interface Segment {
  id: string;
  description: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceMeters: number;
  friction?: FrictionScore;
}

export interface Route {
  id: string;
  label: 'fastest' | 'low-friction' | 'balanced';
  durationSeconds: number;
  distanceMeters: number;
  overallFriction: FrictionLevel;
  segments: Segment[];
  polylineEncoded: string;
}
