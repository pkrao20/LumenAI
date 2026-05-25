import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { LLM_FACTORY } from './llm.constants';
import type { ILLMFactory } from './interfaces/llm-factory.interface';
import {
  ILLMProvider,
  ChatMessage,
  CompletionOptions,
  InferenceMetadata,
} from './interfaces/llm-provider.interface';
import { LLM_INFERENCE_EVENT, LlmInferenceEvent } from '../ingestion/events/llm-inference.event';

const PREVIEW_CHARS = 200;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: ILLMProvider;

  constructor(
    @Inject(LLM_FACTORY) factory: ILLMFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.provider = factory.createProvider();
    this.logger.log(
      `Active provider: ${this.provider.getProviderName()} / ${this.provider.getModel()}`,
    );
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    const requestId = randomUUID();
    const startedAt = new Date();
    const inputPreview = messages.at(-1)?.content.slice(0, PREVIEW_CHARS) ?? null;

    let output = '';
    let status: LlmInferenceEvent['status'] = 'completed';
    let errorMessage: string | null = null;
    let providerMeta: InferenceMetadata | null = null;

    try {
      output = await this.provider.complete(messages, {
        ...options,
        onMetadata: (meta) => { providerMeta = meta; },
      });
      return output;
    } catch (err) {
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      this.emitEvent({
        requestId,
        startedAt,
        completedAt: new Date(),
        status,
        inputPreview,
        outputPreview: output.slice(0, PREVIEW_CHARS) || null,
        errorMessage,
        providerMeta,
      });
    }
  }

  async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<string> {
    const requestId = randomUUID();
    const startedAt = new Date();
    const inputPreview = messages.at(-1)?.content.slice(0, PREVIEW_CHARS) ?? null;

    let output = '';
    let status: LlmInferenceEvent['status'] = 'completed';
    let errorMessage: string | null = null;
    let providerMeta: InferenceMetadata | null = null;

    try {
      for await (const chunk of this.provider.stream(messages, {
        ...options,
        onMetadata: (meta) => { providerMeta = meta; },
      })) {
        output += chunk;
        yield chunk;
      }
    } catch (err) {
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      this.emitEvent({
        requestId,
        startedAt,
        completedAt: new Date(),
        status,
        inputPreview,
        outputPreview: output.slice(0, PREVIEW_CHARS) || null,
        errorMessage,
        providerMeta,
      });
    }
  }

  getProviderInfo(): { provider: string; model: string } {
    return {
      provider: this.provider.getProviderName(),
      model: this.provider.getModel(),
    };
  }

  private emitEvent(partial: {
    requestId: string;
    startedAt: Date;
    completedAt: Date;
    status: LlmInferenceEvent['status'];
    inputPreview: string | null;
    outputPreview: string | null;
    errorMessage: string | null;
    providerMeta: InferenceMetadata | null;
  }): void {
    const meta = partial.providerMeta;
    const event: LlmInferenceEvent = {
      requestId: partial.requestId,
      provider: this.provider.getProviderName(),
      model: this.provider.getModel(),
      status: partial.status,
      latencyMs: partial.completedAt.getTime() - partial.startedAt.getTime(),
      promptTokens: meta?.promptTokens ?? null,
      completionTokens: meta?.completionTokens ?? null,
      totalTokens: meta?.totalTokens ?? null,
      inputPreview: partial.inputPreview,
      outputPreview: partial.outputPreview,
      errorMessage: partial.errorMessage,
      metadata: meta?.extras ? { ...meta.extras } : null,
      startedAt: partial.startedAt,
      completedAt: partial.completedAt,
    };

    this.logger.debug(
      `[inference] ${event.provider}/${event.model} ${event.status} ${event.latencyMs}ms ` +
      `tokens=${event.totalTokens ?? '?'}`,
    );
    this.eventEmitter.emit(LLM_INFERENCE_EVENT, event);
  }
}
