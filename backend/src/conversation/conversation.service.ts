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

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly llmService: LlmService,
  ) {}

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

    conversation.status = ConversationStatus.PAUSED;
    this.logger.log(`Paused conversation ${id} for user ${userId}`);
    return this.updateConversation(conversation);
  }

  async resumeConversation(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.findConversationById(id, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    conversation.status = ConversationStatus.ACTIVE;
    this.logger.log(`Resumed conversation ${id} for user ${userId}`);
    return this.updateConversation(conversation);
  }

  async streamMessageToResponse(conversationId: string, text: string, userId: string, res: any): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.streamMessageChunks(conversationId, text, userId)) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }

  async *streamMessageChunks(conversationId: string, text: string, userId: string): AsyncGenerator<string> {
    const conversation = await this.findConversationById(conversationId, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    await this.saveUserMessage(conversationId, text);
    const chatMessages = await this.buildChatHistory(conversationId);
    const assistantMsg = await this.createStreamingAssistantMessage(conversationId);

    let fullContent = '';
    try {
      for await (const chunk of this.llmService.stream(chatMessages)) {
        fullContent += chunk;
        yield chunk;
      }
      assistantMsg.content = fullContent;
      assistantMsg.status = MessageStatus.COMPLETED;
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
      order: { createdAt: 'ASC' },
    });
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
