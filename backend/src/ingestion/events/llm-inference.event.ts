export const LLM_INFERENCE_EVENT = 'llm.inference';

export class LlmInferenceEvent {
  requestId: string;
  provider: string;
  model: string;
  status: 'completed' | 'failed';
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  inputPreview: string | null;
  outputPreview: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  startedAt: Date;
  completedAt: Date;
}
