import type { FrictionLevel } from '../types/Route';

export const FRICTION_COLORS: Record<FrictionLevel, string> = {
  LOW: '#81C995',
  MEDIUM: '#FA7B17',
  HIGH: '#F28B82',
};

export const FRICTION_THRESHOLDS = {
  LOW_MAX: 0.35,
  MEDIUM_MAX: 0.65,
} as const;

export function scoreToLevel(score: number): FrictionLevel {
  if (score < FRICTION_THRESHOLDS.LOW_MAX) return 'LOW';
  if (score < FRICTION_THRESHOLDS.MEDIUM_MAX) return 'MEDIUM';
  return 'HIGH';
}
