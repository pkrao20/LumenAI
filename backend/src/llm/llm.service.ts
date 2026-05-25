import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_FACTORY } from './llm.constants';
import type { ILLMFactory } from './interfaces/llm-factory.interface';
import { ILLMProvider, ChatMessage, CompletionOptions } from './interfaces/llm-provider.interface';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: ILLMProvider;

  constructor(@Inject(LLM_FACTORY) factory: ILLMFactory) {
    this.provider = factory.createProvider();
    this.logger.log(
      `Active provider: ${this.provider.getProviderName()} / ${this.provider.getModel()}`,
    );
  }

  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    this.logger.debug(`complete() → ${this.provider.getProviderName()}/${this.provider.getModel()}`);
    return this.provider.complete(messages, options);
  }

  stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<string> {
    this.logger.debug(`stream() → ${this.provider.getProviderName()}/${this.provider.getModel()}`);
    return this.provider.stream(messages, options);
  }

  getProviderInfo(): { provider: string; model: string } {
    return {
      provider: this.provider.getProviderName(),
      model: this.provider.getModel(),
    };
  }
}
