import { ILLMFactory } from '../interfaces/llm-factory.interface';
import { ILLMProvider } from '../interfaces/llm-provider.interface';
import { OllamaProvider } from '../providers/ollama.provider';

export class OllamaFactory implements ILLMFactory {
  constructor(
    private readonly baseUrl: string,
    private readonly model?: string,
  ) {}

  createProvider(): ILLMProvider {
    return new OllamaProvider(this.baseUrl, this.model);
  }
}
