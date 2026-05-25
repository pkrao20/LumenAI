import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, ChatMessage, CompletionOptions } from '../interfaces/llm-provider.interface';

export class GeminiProvider implements ILLMProvider {
  private readonly client: GoogleGenerativeAI;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gemini-2.0-flash',
  ) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private parseMessages(messages: ChatMessage[]) {
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');
    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const lastMessage = chatMessages[chatMessages.length - 1]?.content ?? '';
    return { systemInstruction: systemMsg?.content, history, lastMessage };
  }

  async complete(messages: ChatMessage[], _options?: CompletionOptions): Promise<string> {
    const { systemInstruction, history, lastMessage } = this.parseMessages(messages);
    const genModel = this.client.getGenerativeModel({ model: this.model, systemInstruction });
    const chat = genModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    return result.response.text();
  }

  async *stream(messages: ChatMessage[], _options?: CompletionOptions): AsyncIterable<string> {
    const { systemInstruction, history, lastMessage } = this.parseMessages(messages);
    const genModel = this.client.getGenerativeModel({ model: this.model, systemInstruction });
    const chat = genModel.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  getProviderName(): string {
    return 'gemini';
  }

  getModel(): string {
    return this.model;
  }
}
