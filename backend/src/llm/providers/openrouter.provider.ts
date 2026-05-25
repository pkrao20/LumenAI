import OpenAI from 'openai';
import { ILLMProvider, ChatMessage, CompletionOptions } from '../interfaces/llm-provider.interface';

export class OpenRouterProvider implements ILLMProvider {
  private readonly client: OpenAI;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'meta-llama/llama-3.3-70b-instruct:free',
  ) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  getProviderName(): string {
    return 'openrouter';
  }

  getModel(): string {
    return this.model;
  }
}
