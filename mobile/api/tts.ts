import { apiClient } from './client';
import type { TTSRequest, TTSResponse } from '../types/API';

export async function speakSummary(req: TTSRequest): Promise<TTSResponse> {
  const { data } = await apiClient.post<TTSResponse>('/api/tts', req);
  return data;
}
