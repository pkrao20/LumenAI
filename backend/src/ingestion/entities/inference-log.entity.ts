import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum InferenceLogStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('inference_logs')
export class InferenceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar' })
  requestId: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'provider', length: 50 })
  provider: string;

  @Column({ name: 'model', length: 100 })
  model: string;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs: number | null;

  @Column({ name: 'prompt_tokens', type: 'int', nullable: true })
  promptTokens: number | null;

  @Column({ name: 'completion_tokens', type: 'int', nullable: true })
  completionTokens: number | null;

  @Column({ name: 'total_tokens', type: 'int', nullable: true })
  totalTokens: number | null;

  @Column({ name: 'input_preview', type: 'text', nullable: true })
  inputPreview: string | null;

  @Column({ name: 'output_preview', type: 'text', nullable: true })
  outputPreview: string | null;

  @Column({ name: 'status', type: 'enum', enum: InferenceLogStatus, nullable: true })
  status: InferenceLogStatus | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
