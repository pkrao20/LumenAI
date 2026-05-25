export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMProvider {
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
  stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<string>;
  getProviderName(): string;
  getModel(): string;
}
