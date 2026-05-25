import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmService } from './llm.service';
import { LLM_FACTORY, LLMProviderName, SUPPORTED_PROVIDERS } from './llm.constants';
import { GroqFactory } from './factories/groq.factory';
import { GeminiFactory } from './factories/gemini.factory';
import { OpenRouterFactory } from './factories/openrouter.factory';
import { OllamaFactory } from './factories/ollama.factory';
import type { ILLMFactory } from './interfaces/llm-factory.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLM_FACTORY,
      useFactory: (config: ConfigService): ILLMFactory => {
        const name = config.get<string>('LLM_PROVIDER', 'groq').toLowerCase() as LLMProviderName;

        if (!SUPPORTED_PROVIDERS.includes(name)) {
          throw new Error(
            `Unknown LLM provider: "${name}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
          );
        }

        if (name === 'ollama') {
          const baseUrl = config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
          const model = config.get<string>('OLLAMA_MODEL');
          return new OllamaFactory(baseUrl, model);
        }

        const apiKeyMap: Record<Exclude<LLMProviderName, 'ollama'>, string> = {
          groq: config.get<string>('GROQ_API_KEY', ''),
          gemini: config.get<string>('GEMINI_API_KEY', ''),
          openrouter: config.get<string>('OPENROUTER_API_KEY', ''),
        };

        const modelMap: Record<Exclude<LLMProviderName, 'ollama'>, string | undefined> = {
          groq: config.get<string>('GROQ_MODEL'),
          gemini: config.get<string>('GEMINI_MODEL'),
          openrouter: config.get<string>('OPENROUTER_MODEL'),
        };

        const apiKey = apiKeyMap[name];
        const model = modelMap[name];

        if (!apiKey) {
          throw new Error(`Missing API key env var for provider "${name}"`);
        }

        switch (name) {
          case 'groq':
            return new GroqFactory(apiKey, model);
          case 'gemini':
            return new GeminiFactory(apiKey, model);
          case 'openrouter':
            return new OpenRouterFactory(apiKey, model);
        }
      },
      inject: [ConfigService],
    },
    LlmService,
  ],
  exports: [LlmService],
})
export class LlmModule {}
