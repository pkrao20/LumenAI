const BASE = 'http://localhost:8080/v1';

export async function streamResume(
  conversationId: string,
  onStreamStart: () => void,
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`${BASE}/conversation/${conversationId}/resume`, {
    method: 'PATCH',
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to resume');
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/plain')) {
    // No interrupted message — backend returned JSON ack, nothing to stream.
    await response.json().catch(() => null);
    return;
  }

  if (!response.body) return;

  onStreamStart();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) onChunk(text);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function streamMessage(
  conversationId: string,
  message: string,
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`${BASE}/conversation/${conversationId}/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to send message');
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) onChunk(text);
    }
  } finally {
    reader.releaseLock();
  }
}
