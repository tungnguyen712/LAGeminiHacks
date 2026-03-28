import { AccessibilityProfile } from '../types/Profile';

export const ACCESSIBILITY_PROFILES: AccessibilityProfile[] = [
  {
    id: 'wheelchair',
    name: 'Wheelchair User',
    description: 'Prioritizes ramps, elevators, and smooth surfaces. Avoids steep slopes and curbs.',
    icon: 'accessibility',
    color: '#3b82f6',
  },
  {
    id: 'low-vision',
    name: 'Low-Vision User',
    description: 'Prioritizes audio signals, clear pedestrian paths, and simple junctions.',
    icon: 'eye',
    color: '#a855f7',
  },
  {
    id: 'stroller',
    name: 'Stroller User',
    description: 'Prioritizes step-free access and wide paths. Avoids narrow gates and cobbles.',
    icon: 'baby',
    color: '#10b981',
  },
];
