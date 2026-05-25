import type { Conversation, CreateConversationResponse } from '@/types/conversation';
import type { MessagesResponse } from '@/types/message';

const BASE = 'http://localhost:8080/v1';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error ?? `Request failed: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }

  return res.json();
}

export function getConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>('/conversation');
}

export function createConversation(title: string): Promise<CreateConversationResponse> {
  return apiFetch<CreateConversationResponse>('/conversation', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function getMessages(conversationId: string, page = 1, limit = 50): Promise<MessagesResponse> {
  return apiFetch<MessagesResponse>(`/conversation/${conversationId}/messages?page=${page}&limit=${limit}`);
}

export function pauseConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/conversation/${id}/pause`, { method: 'PATCH' });
}

export function resumeConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/conversation/${id}/resume`, { method: 'PATCH' });
}

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/users/signin`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Sign in failed');
  }
}
