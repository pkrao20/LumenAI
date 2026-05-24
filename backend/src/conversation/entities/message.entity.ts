import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageStatus {
  STREAMING = 'STREAMING',
  COMPLETED = 'COMPLETED',
  INTERRUPTED = 'INTERRUPTED',
  FAILED = 'FAILED',
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'role', type: 'enum', enum: MessageRole })
  role: MessageRole;

  @Column({ name: 'status', type: 'enum', enum: MessageStatus, default: MessageStatus.COMPLETED })
  status: MessageStatus;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
