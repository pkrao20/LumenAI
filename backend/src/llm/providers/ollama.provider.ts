import { ILLMProvider, ChatMessage, CompletionOptions } from '../interfaces/llm-provider.interface';

interface OllamaChatChunk {
  model: string;
  message?: { role: string; content: string };
  done: boolean;
}

export class OllamaProvider implements ILLMProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string = 'qwen2.5:3b',
  ) {}

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as OllamaChatChunk;
    return data.message?.content ?? '';
  }

  async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      try {
        const parsed: OllamaChatChunk = JSON.parse(chunk);
        const content = parsed.message?.content;
        if (content) yield content;
      } catch {
        // partial chunk — skip
      }
    }
  }

  getProviderName(): string {
    return 'ollama';
  }

  getModel(): string {
    return this.model;
  }
}
