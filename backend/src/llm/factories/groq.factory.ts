import { ILLMFactory } from '../interfaces/llm-factory.interface';
import { ILLMProvider } from '../interfaces/llm-provider.interface';
import { GroqProvider } from '../providers/groq.provider';

export class GroqFactory implements ILLMFactory {
  constructor(
    private readonly apiKey: string,
    private readonly model?: string,
  ) {}

  createProvider(): ILLMProvider {
    return new GroqProvider(this.apiKey, this.model);
  }
}
