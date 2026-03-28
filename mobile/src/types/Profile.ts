export type AccessibilityProfileID = 'wheelchair' | 'low-vision' | 'stroller';

export interface AccessibilityProfile {
  id: AccessibilityProfileID;
  name: string;
  description: string;
  icon: string;
  emoji: string;
  bgColor: string;
  color: string;
}
