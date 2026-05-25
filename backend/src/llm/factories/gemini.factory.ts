import { ILLMFactory } from '../interfaces/llm-factory.interface';
import { ILLMProvider } from '../interfaces/llm-provider.interface';
import { GeminiProvider } from '../providers/gemini.provider';

export class GeminiFactory implements ILLMFactory {
  constructor(
    private readonly apiKey: string,
    private readonly model?: string,
  ) {}

  createProvider(): ILLMProvider {
    return new GeminiProvider(this.apiKey, this.model);
  }
}
