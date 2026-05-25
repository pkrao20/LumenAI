export type ConversationStatus =
  | 'ACTIVE'
  | 'STREAMING'
  | 'PAUSED'
  | 'ARCHIVED'
  | 'DELETED'
  | 'ERROR';

export interface Conversation {
  id: string;
  title: string;
  status: ConversationStatus;
  model: string;
  userId: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationResponse {
  id: string;
  title: string;
}
