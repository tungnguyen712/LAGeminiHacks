import { apiClient } from './client';
import type { RoutesRequest, RoutesResponse } from '../types/API';

export async function getRoutes(req: RoutesRequest): Promise<RoutesResponse> {
  const { data } = await apiClient.post<RoutesResponse>('/api/routes', req);
  return data;
}
