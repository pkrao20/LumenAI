import { Logger } from '@nestjs/common';
import type { ILLMProvider, ChatMessage, CompletionOptions } from '../interfaces/llm-provider.interface';

export class FallbackProvider implements ILLMProvider {
  private readonly logger = new Logger(FallbackProvider.name);

  constructor(private readonly providers: ILLMProvider[]) {
    if (providers.length === 0) throw new Error('FallbackProvider requires at least one provider');
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    let lastError: Error | undefined;

    for (const provider of this.providers) {
      try {
        return await provider.complete(messages, options);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `Provider ${provider.getProviderName()}/${provider.getModel()} failed: ${lastError.message} — trying next`,
        );
      }
    }

    throw lastError ?? new Error('All providers failed');
  }

  async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<string> {
    let lastError: Error | undefined;

    for (const provider of this.providers) {
      let yieldedAny = false;
      try {
        for await (const chunk of provider.stream(messages, options)) {
          yieldedAny = true;
          yield chunk;
        }
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (yieldedAny) {
          // Partial output already sent to client — can't restart with another provider
          throw lastError;
        }
        this.logger.warn(
          `Provider ${provider.getProviderName()}/${provider.getModel()} stream failed: ${lastError.message} — trying next`,
        );
      }
    }

    throw lastError ?? new Error('All providers failed');
  }

  getProviderName(): string {
    return this.providers.map((p) => p.getProviderName()).join('+');
  }

  getModel(): string {
    return this.providers.map((p) => `${p.getProviderName()}/${p.getModel()}`).join(' → ');
  }
}
