export type ProfileType = 'wheelchair' | 'low-vision' | 'stroller';

export interface UserProfile {
  type: ProfileType;
  label: string;
  description: string;
  icon: string; // emoji or asset key
}
