export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface InferenceMetadata {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  extras?: Record<string, unknown>;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  onMetadata?: (meta: InferenceMetadata) => void;
}

export interface ILLMProvider {
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
  stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<string>;
  getProviderName(): string;
  getModel(): string;
}
