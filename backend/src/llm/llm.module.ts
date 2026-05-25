import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LlmService } from './llm.service';
import { LLM_FACTORY } from './llm.constants';

import { OllamaFactory } from './factories/ollama.factory';
import type { ILLMFactory } from './interfaces/llm-factory.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLM_FACTORY,
      useFactory: (config: ConfigService): ILLMFactory => {
        const baseUrl = config.get<string>(
          'OLLAMA_BASE_URL',
          'http://localhost:11434',
        );

        const model = config.get<string>(
          'OLLAMA_MODEL',
          'llama3',
        );

        return new OllamaFactory(baseUrl, model);
      },
      inject: [ConfigService],
    },
    LlmService,
  ],
  exports: [LlmService],
})
export class LlmModule {}