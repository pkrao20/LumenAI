import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LlmService } from './llm.service';
import { LLM_FACTORY } from './llm.constants';

import { OllamaFactory } from './factories/ollama.factory';
import { OllamaProvider } from './providers/ollama.provider';
import { FallbackProvider } from './providers/fallback.provider';
import type { ILLMFactory } from './interfaces/llm-factory.interface';
import type { ILLMProvider } from './interfaces/llm-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLM_FACTORY,
      useFactory: (config: ConfigService): ILLMFactory => {
        const baseUrl = config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
        const primary = config.get<string>('OLLAMA_MODEL', 'qwen2.5:3b');

        // OLLAMA_FALLBACK_MODELS=llama3.2:3b,mistral:7b  (comma-separated, tried in order)
        const fallbackRaw = config.get<string>('OLLAMA_FALLBACK_MODELS', '');
        const fallbackModels = fallbackRaw
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean);

        if (fallbackModels.length === 0) {
          return new OllamaFactory(baseUrl, primary);
        }

        const providers: ILLMProvider[] = [primary, ...fallbackModels].map(
          (model) => new OllamaProvider(baseUrl, model),
        );

        return { createProvider: () => new FallbackProvider(providers) };
      },
      inject: [ConfigService],
    },
    LlmService,
  ],
  exports: [LlmService],
})
export class LlmModule {}