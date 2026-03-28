export type AccessibilityProfile = 'wheelchair' | 'low-vision' | 'stroller';

export interface Profile {
  id: AccessibilityProfile;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface RouteSegment {
  id: string;
  frictionScore: number; // 0-100
  confidence: number; // 0-100
  explanation: string;
  type: 'clear' | 'caution' | 'danger';
  coordinates: [number, number][];
  streetViewUrl?: string;
  locationName?: string;
}

export interface RouteOption {
  id: string;
  name: string;
  duration: string;
  distance: string;
  frictionScore: number;
  segments: RouteSegment[];
  type: 'fastest' | 'lowest-friction' | 'balanced';
}
