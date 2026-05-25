import type { Conversation } from '@/types/conversation';
import type { Message } from '@/types/message';

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messagesByConversation: Record<string, Message[]>;
  streamingMessageId: string | null;
  isStreaming: boolean;
  isLoadingConversations: boolean;
  loadingMessagesFor: string | null;
  isAuthenticated: boolean | null;
  error: string | null;
}

export type ChatAction =
  | { type: 'SET_AUTH'; payload: boolean }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'START_STREAMING'; payload: { conversationId: string; messageId: string } }
  | { type: 'APPEND_CHUNK'; payload: { conversationId: string; messageId: string; text: string } }
  | { type: 'FINISH_STREAMING'; payload: { conversationId: string; messageId: string } }
  | { type: 'SET_LOADING_CONVERSATIONS'; payload: boolean }
  | { type: 'SET_LOADING_MESSAGES'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null };

export const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messagesByConversation: {},
  streamingMessageId: null,
  isStreaming: false,
  isLoadingConversations: false,
  loadingMessagesFor: null,
  isAuthenticated: null,
  error: null,
};

function withUpdatedMessages(
  state: ChatState,
  conversationId: string,
  updater: (msgs: Message[]) => Message[],
): ChatState {
  return {
    ...state,
    messagesByConversation: {
      ...state.messagesByConversation,
      [conversationId]: updater(state.messagesByConversation[conversationId] ?? []),
    },
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, isAuthenticated: action.payload };

    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'ADD_CONVERSATION':
      return { ...state, conversations: [action.payload, ...state.conversations] };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };

    case 'SET_MESSAGES':
      return withUpdatedMessages(state, action.payload.conversationId, () => action.payload.messages);

    case 'ADD_MESSAGE':
      return withUpdatedMessages(state, action.payload.conversationId, (msgs) => [
        ...msgs,
        action.payload.message,
      ]);

    case 'START_STREAMING': {
      const { conversationId, messageId } = action.payload;
      const placeholder: Message = {
        id: messageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: Date.now(),
      };
      return {
        ...withUpdatedMessages(state, conversationId, (msgs) => [...msgs, placeholder]),
        isStreaming: true,
        streamingMessageId: messageId,
      };
    }

    case 'APPEND_CHUNK':
      return withUpdatedMessages(state, action.payload.conversationId, (msgs) =>
        msgs.map((m) =>
          m.id === action.payload.messageId
            ? { ...m, content: m.content + action.payload.text }
            : m
        )
      );

    case 'FINISH_STREAMING': {
      const { conversationId, messageId } = action.payload;
      return {
        ...withUpdatedMessages(state, conversationId, (msgs) =>
          msgs.map((m) => (m.id === messageId ? { ...m, isStreaming: false } : m))
        ),
        isStreaming: false,
        streamingMessageId: null,
      };
    }

    case 'SET_LOADING_CONVERSATIONS':
      return { ...state, isLoadingConversations: action.payload };

    case 'SET_LOADING_MESSAGES':
      return { ...state, loadingMessagesFor: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}
