import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConversationDto } from './dtos/create-conversation.dto';
import { Conversation, ConversationStatus } from './entities/conversation.entity';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
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

  private findConversationById(id: string, userId: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({ where: { id, userId } });
  }

  private updateConversation(conversation: Conversation): Promise<Conversation> {
    return this.conversationRepository.save(conversation);
  }
}
