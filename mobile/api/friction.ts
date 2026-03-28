import { apiClient } from './client';
import type { FrictionRequest, FrictionResponse } from '../types/API';

export async function getFriction(req: FrictionRequest): Promise<FrictionResponse> {
  const { data } = await apiClient.post<FrictionResponse>('/api/friction', req);
  return data;
}
