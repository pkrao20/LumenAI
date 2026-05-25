'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { chatReducer, initialState, type ChatAction, type ChatState } from './chat.reducer';
import {
  createConversation as apiCreate,
  getConversations,
  getMessages,
  pauseConversation as apiPause,
  signIn as apiSignIn,
} from '@/services/conversation.service';
import { streamMessage, streamResume } from '@/services/chat.service';
import type { Conversation } from '@/types/conversation';
import type { Message } from '@/types/message';

interface ChatContextValue {
  state: ChatState;
  loadConversations: () => Promise<void>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  startNewConversation: (title: string) => Promise<string>;
  sendMessage: (content: string) => Promise<void>;
  cancelStreaming: () => void;
  pauseConversation: (id: string) => Promise<void>;
  resumeConversation: (id: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadConversations = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_CONVERSATIONS', payload: true });
    try {
      const conversations = await getConversations();
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      dispatch({ type: 'SET_AUTH', payload: true });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        dispatch({ type: 'SET_AUTH', payload: false });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversations' });
      }
    } finally {
      dispatch({ type: 'SET_LOADING_CONVERSATIONS', payload: false });
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectConversation = useCallback(async (conversation: Conversation) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });

    // Load message history if not already cached
    if (!stateRef.current.messagesByConversation[conversation.id]) {
      dispatch({ type: 'SET_LOADING_MESSAGES', payload: conversation.id });
      try {
        const result = await getMessages(conversation.id);
        const messages: Message[] = result.data.map((m) => ({
          id: m.id,
          role: m.role === 'USER' ? 'user' : 'assistant',
          content: m.content,
          timestamp: new Date(m.createdAt).getTime(),
        }));
        dispatch({ type: 'SET_MESSAGES', payload: { conversationId: conversation.id, messages } });
      } catch {
        dispatch({ type: 'SET_MESSAGES', payload: { conversationId: conversation.id, messages: [] } });
      } finally {
        dispatch({ type: 'SET_LOADING_MESSAGES', payload: null });
      }
    }
  }, []);

  const startNewConversation = useCallback(async (title: string): Promise<string> => {
    const created = await apiCreate(title);
    const conversation: Conversation = {
      id: created.id,
      title: created.title,
      status: 'ACTIVE',
      model: 'gpt-4o',
      userId: '',
      lastMessageAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: created.id });
    dispatch({ type: 'SET_MESSAGES', payload: { conversationId: created.id, messages: [] } });
    return created.id;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const { activeConversationId, isStreaming } = stateRef.current;
    if (!activeConversationId || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: activeConversationId, message: userMsg } });

    const streamId = crypto.randomUUID();
    dispatch({ type: 'START_STREAMING', payload: { conversationId: activeConversationId, messageId: streamId } });

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      await streamMessage(
        activeConversationId,
        content,
        (text) =>
          dispatch({
            type: 'APPEND_CHUNK',
            payload: { conversationId: activeConversationId, messageId: streamId, text },
          }),
        abortRef.current.signal,
      );
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: (err as Error).message ?? 'Failed to get response' });
      }
    } finally {
      dispatch({ type: 'FINISH_STREAMING', payload: { conversationId: activeConversationId, messageId: streamId } });
      abortRef.current = null;
    }
  }, []);

  const cancelStreaming = useCallback(async () => {
    abortRef.current?.abort();

    const { activeConversationId } = stateRef.current;
    if (!activeConversationId) return;

    try {
      const updated = await apiPause(activeConversationId);
      dispatch({ type: 'UPDATE_CONVERSATION', payload: updated });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to pause conversation' });
    }
  }, []);

  const pauseConversation = useCallback(async (id: string) => {
    try {
      const updated = await apiPause(id);
      dispatch({ type: 'UPDATE_CONVERSATION', payload: updated });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to pause conversation' });
    }
  }, []);

  const resumeConversation = useCallback(async (id: string) => {
    const messages = stateRef.current.messagesByConversation[id] ?? [];
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const messageId = lastAssistant?.id;

    const conv = stateRef.current.conversations.find((c) => c.id === id);
    if (conv) {
      dispatch({ type: 'UPDATE_CONVERSATION', payload: { ...conv, status: 'ACTIVE' } });
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      await streamResume(
        id,
        () => {
          if (messageId) {
            dispatch({
              type: 'RESUME_STREAMING',
              payload: { conversationId: id, messageId },
            });
          }
        },
        (text) => {
          if (messageId) {
            dispatch({
              type: 'APPEND_CHUNK',
              payload: { conversationId: id, messageId, text },
            });
          }
        },
        abortRef.current.signal,
      );
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to resume conversation' });
      }
    } finally {
      if (messageId && stateRef.current.streamingMessageId === messageId) {
        dispatch({
          type: 'FINISH_STREAMING',
          payload: { conversationId: id, messageId },
        });
      }
      abortRef.current = null;
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await apiSignIn(email, password);
      dispatch({ type: 'SET_AUTH', payload: true });
      await loadConversations();
    },
    [loadConversations],
  );

  return (
    <ChatContext.Provider
      value={{
        state,
        loadConversations,
        selectConversation,
        startNewConversation,
        sendMessage,
        cancelStreaming,
        pauseConversation,
        resumeConversation,
        signIn,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
