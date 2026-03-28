import { Profile } from './types';

export const PROFILES: Profile[] = [
  {
    id: 'wheelchair',
    title: 'Wheelchair User',
    description: 'Prioritizes ramps, elevators, and smooth surfaces. Avoids steep slopes and curbs.',
    icon: 'Accessibility',
    color: 'from-blue-400 to-indigo-600',
  },
  {
    id: 'low-vision',
    title: 'Low-Vision User',
    description: 'Prioritizes audio signals, clear pedestrian paths, and simple junctions.',
    icon: 'Eye',
    color: 'from-purple-400 to-pink-600',
  },
  {
    id: 'stroller',
    title: 'Stroller User',
    description: 'Prioritizes step-free access and wide paths. Avoids narrow gates and cobbles.',
    icon: 'Baby',
    color: 'from-emerald-400 to-teal-600',
  },
];
