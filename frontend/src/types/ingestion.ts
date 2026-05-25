export interface Summary {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalTokens: number;
  avgTokensPerRequest: number;
}

export interface LatencyPoint {
  time: string;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  requestCount: number;
}

export interface TokensPoint {
  time: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface InferenceLog {
  id: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: 'completed' | 'failed' | 'cancelled';
  inputPreview: string | null;
  outputPreview: string | null;
  createdAt: string;
}

export interface RequestsResponse {
  data: InferenceLog[];
  total: number;
  page: number;
  limit: number;
}
