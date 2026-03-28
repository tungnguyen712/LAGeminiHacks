import type { UserProfile } from '../types/Profile';

export const PROFILES: UserProfile[] = [
  {
    type: 'wheelchair',
    label: 'Wheelchair',
    description: 'Avoids stairs, steep slopes, and unpaved surfaces',
    icon: '♿',
  },
  {
    type: 'low-vision',
    label: 'Low Vision',
    description: 'Prefers well-lit paths with tactile indicators',
    icon: '👁️',
  },
  {
    type: 'stroller',
    label: 'Stroller',
    description: 'Avoids stairs and narrow passages',
    icon: '🍼',
  },
];
