import type { Summary, LatencyPoint, TokensPoint, RequestsResponse } from '@/types/ingestion';

export type Range = '1h' | '24h' | '7d' | '30d';

const BASE = 'http://localhost:8080/v1/ingestion/analytics';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Analytics request failed: ${res.status}`);
  return res.json();
}

export function getSummary(range: Range): Promise<Summary> {
  return get<Summary>(`/summary?range=${range}`);
}

export function getLatency(range: Range): Promise<LatencyPoint[]> {
  return get<LatencyPoint[]>(`/latency?range=${range}`);
}

export function getTokens(range: Range): Promise<TokensPoint[]> {
  return get<TokensPoint[]>(`/tokens?range=${range}`);
}

export function getRequests(page = 1, limit = 20): Promise<RequestsResponse> {
  return get<RequestsResponse>(`/requests?page=${page}&limit=${limit}`);
}
