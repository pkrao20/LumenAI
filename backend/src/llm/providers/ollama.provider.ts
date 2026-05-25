import { ILLMProvider, ChatMessage, CompletionOptions } from '../interfaces/llm-provider.interface';

interface OllamaChatChunk {
  model: string;
  created_at?: string;
  message?: { role: string; content: string };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

const NS_TO_MS = 1_000_000;

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

    options?.onMetadata?.({
      promptTokens: data.prompt_eval_count,
      completionTokens: data.eval_count,
      totalTokens:
        data.prompt_eval_count != null && data.eval_count != null
          ? data.prompt_eval_count + data.eval_count
          : undefined,
      extras: {
        doneReason: data.done_reason,
        totalDurationMs: data.total_duration != null ? data.total_duration / NS_TO_MS : undefined,
        loadDurationMs: data.load_duration != null ? data.load_duration / NS_TO_MS : undefined,
        promptEvalDurationMs: data.prompt_eval_duration != null ? data.prompt_eval_duration / NS_TO_MS : undefined,
        evalDurationMs: data.eval_duration != null ? data.eval_duration / NS_TO_MS : undefined,
      },
    });

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

        if (parsed.done) {
          options?.onMetadata?.({
            promptTokens: parsed.prompt_eval_count,
            completionTokens: parsed.eval_count,
            totalTokens:
              parsed.prompt_eval_count != null && parsed.eval_count != null
                ? parsed.prompt_eval_count + parsed.eval_count
                : undefined,
            extras: {
              doneReason: parsed.done_reason,
              totalDurationMs: parsed.total_duration != null ? parsed.total_duration / NS_TO_MS : undefined,
              loadDurationMs: parsed.load_duration != null ? parsed.load_duration / NS_TO_MS : undefined,
              promptEvalDurationMs: parsed.prompt_eval_duration != null ? parsed.prompt_eval_duration / NS_TO_MS : undefined,
              evalDurationMs: parsed.eval_duration != null ? parsed.eval_duration / NS_TO_MS : undefined,
            },
          });
        }

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
