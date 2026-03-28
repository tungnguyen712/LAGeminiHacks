import type { ProfileType } from '../types/Profile';

interface PromptParams {
  profile: ProfileType;
  profileDescription: string;
  languageCode: string;
  segmentDescription: string;
  evidenceList: string;
}

export function buildFrictionPrompt(params: PromptParams): string {
  return `You are an accessibility expert. Given route segment data and a user profile, return a JSON friction assessment.

Profile: ${params.profile} (${params.profileDescription})
Language: ${params.languageCode}
Segment: ${params.segmentDescription}
Evidence: ${params.evidenceList}

Respond ONLY with valid JSON:
{
  "frictionScore": <0.0–1.0>,
  "confidence": <0.0–1.0>,
  "reasons": ["..."],
  "recommendation": "..."
}`;
}
