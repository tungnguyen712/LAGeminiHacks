import type { Route, FrictionScore } from './Route';
import type { ProfileType } from './Profile';

export interface RoutesRequest {
  origin: string;
  destination: string;
  profile: ProfileType;
}

export interface RoutesResponse {
  routes: Route[];
}

export interface FrictionRequest {
  segments: Array<{
    id: string;
    description: string;
    distanceMeters: number;
  }>;
  profile: ProfileType;
  languageCode: string;
}

export interface FrictionResponse {
  scores: Record<string, FrictionScore>;
}

export interface TTSRequest {
  text: string;
  languageTag: string; // BCP-47, e.g. 'en-US'
}

export interface TTSResponse {
  audioBase64: string;
  mimeType: string;
}

export interface LiveSessionRequest {
  routeContext: string;
  languageCode: string;
}
