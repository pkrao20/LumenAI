import { ILLMFactory } from '../interfaces/llm-factory.interface';
import { ILLMProvider } from '../interfaces/llm-provider.interface';
import { OpenRouterProvider } from '../providers/openrouter.provider';

export class OpenRouterFactory implements ILLMFactory {
  constructor(
    private readonly apiKey: string,
    private readonly model?: string,
  ) {}

  createProvider(): ILLMProvider {
    return new OpenRouterProvider(this.apiKey, this.model);
  }
}
