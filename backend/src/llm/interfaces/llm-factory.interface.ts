import { ILLMProvider } from './llm-provider.interface';

export interface ILLMFactory {
  createProvider(): ILLMProvider;
}
