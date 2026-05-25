import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConversationDto } from './dtos/create-conversation.dto';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { Message, MessageRole, MessageStatus } from './entities/message.entity';
import { LlmService } from '../llm/llm.service';
import type { ChatMessage } from '../llm/interfaces/llm-provider.interface';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly activeStreams = new Map<string, AbortController>();

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly llmService: LlmService,
  ) {}

  async getMessages(
    conversationId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Message[]; total: number; page: number; limit: number; totalPages: number }> {
    const conversation = await this.findConversationById(conversationId, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    const [data, total] = await this.messageRepository.findAndCount({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: data.reverse(), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getAllConversation(userId: string): Promise<Conversation[]> {
    this.logger.log(`Fetching all conversations for user ${userId}`);
    return this.conversationRepository.find({ where: { userId } });
  }

  async createConversation(dto: CreateConversationDto, userId: string): Promise<Pick<Conversation, 'id' | 'title'>> {
    const conversation = this.conversationRepository.create({
      ...dto,
      userId,
      status: ConversationStatus.ACTIVE,
    });
    const saved = await this.conversationRepository.save(conversation);
    this.logger.log(`Created conversation ${saved.id} for user ${userId}`);
    return { id: saved.id, title: saved.title };
  }

  async pauseConversation(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.findConversationById(id, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    this.activeStreams.get(id)?.abort();

    conversation.status = ConversationStatus.PAUSED;
    this.logger.log(`Paused conversation ${id} for user ${userId}`);
    return this.updateConversation(conversation);
  }

  async resumeStreamToResponse(id: string, userId: string, res: any): Promise<void> {
    const conversation = await this.findConversationById(id, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    const interruptedMsg = await this.messageRepository.findOne({
      where: { conversationId: id, status: MessageStatus.INTERRUPTED },
      order: { createdAt: 'DESC' },
    });

    conversation.status = ConversationStatus.ACTIVE;
    await this.updateConversation(conversation);

    if (!interruptedMsg) {
      res.json({ resumed: true });
      return;
    }

    const controller = new AbortController();
    this.activeStreams.set(id, controller);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.on('close', () => controller.abort());

    const partialContent = interruptedMsg.content;
    let continuation = '';
    let interrupted = false;

    try {
      const history = await this.messageRepository.find({
        where: { conversationId: id },
        order: { createdAt: 'ASC' },
      });

      // Build history excluding the interrupted message, then append it as
      // an assistant prefill so the LLM continues from exactly that point
      const chatMessages: ChatMessage[] = history
        .filter((m) => m.id !== interruptedMsg.id)
        .map((m) => ({
          role: m.role === MessageRole.USER ? ('user' as const) : ('assistant' as const),
          content: m.content,
        }));
      chatMessages.push({ role: 'assistant', content: partialContent });

      for await (const chunk of this.llmService.stream(chatMessages)) {
        if (controller.signal.aborted) {
          interrupted = true;
          break;
        }
        continuation += chunk;
        res.write(chunk);
      }

      interruptedMsg.content = partialContent + continuation;
      interruptedMsg.status = interrupted ? MessageStatus.INTERRUPTED : MessageStatus.COMPLETED;
    } catch (err) {
      this.logger.error('Resume streaming error', err);
      interruptedMsg.status = MessageStatus.FAILED;
    } finally {
      await this.messageRepository.save(interruptedMsg);
      this.activeStreams.delete(id);
      res.end();
    }
  }

  async streamMessageToResponse(conversationId: string, text: string, userId: string, res: any): Promise<void> {
    const controller = new AbortController();
    this.activeStreams.set(conversationId, controller);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // client closes connection (e.g. browser tab closed) → abort the stream
    res.on('close', () => controller.abort());

    try {
      for await (const chunk of this.streamMessageChunks(conversationId, text, userId, controller.signal)) {
        res.write(chunk);
      }
    } catch (err) {
      this.logger.error('Streaming error', err);
    } finally {
      this.activeStreams.delete(conversationId);
      res.end();
    }
  }

  async *streamMessageChunks(conversationId: string, text: string, userId: string, signal?: AbortSignal): AsyncGenerator<string> {
    const conversation = await this.findConversationById(conversationId, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    await this.saveUserMessage(conversationId, text);
    const chatMessages = await this.buildChatHistory(conversationId);
    const assistantMsg = await this.createStreamingAssistantMessage(conversationId);

    let fullContent = '';
    let interrupted = false;
    try {
      for await (const chunk of this.llmService.stream(chatMessages)) {
        if (signal?.aborted) {
          interrupted = true;
          break;
        }
        fullContent += chunk;
        yield chunk;
      }
      assistantMsg.content = fullContent;
      assistantMsg.status = interrupted ? MessageStatus.INTERRUPTED : MessageStatus.COMPLETED;
    } catch (err) {
      assistantMsg.content = fullContent;
      assistantMsg.status = MessageStatus.FAILED;
      throw err;
    } finally {
      await this.messageRepository.save(assistantMsg);
    }
  }

  private async saveUserMessage(conversationId: string, text: string): Promise<Message> {
    const userMsg = this.messageRepository.create({
      content: text,
      role: MessageRole.USER,
      status: MessageStatus.COMPLETED,
      conversationId,
    });
    return this.messageRepository.save(userMsg);
  }

  private async buildChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const history = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: 6,
    });
    history.reverse();
    return history.map((m) => ({
      role: m.role === MessageRole.USER ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  private async createStreamingAssistantMessage(conversationId: string): Promise<Message> {
    const assistantMsg = this.messageRepository.create({
      content: '',
      role: MessageRole.ASSISTANT,
      status: MessageStatus.STREAMING,
      conversationId,
    });
    return this.messageRepository.save(assistantMsg);
  }

  private findConversationById(id: string, userId: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({ where: { id, userId } });
  }

  private updateConversation(conversation: Conversation): Promise<Conversation> {
    return this.conversationRepository.save(conversation);
  }
}
