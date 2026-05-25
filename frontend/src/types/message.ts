export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  timestamp: number;
}

export interface ApiMessage {
  id: string;
  content: string;
  role: 'USER' | 'ASSISTANT';
  status: 'STREAMING' | 'COMPLETED' | 'INTERRUPTED' | 'FAILED';
  conversationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesResponse {
  data: ApiMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
