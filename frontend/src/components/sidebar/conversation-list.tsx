'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatContext } from '@/context/chat.context';
import type { Conversation } from '@/types/conversation';

function formatRel(dateIso: string | null): string {
  if (!dateIso) return '';
  const ts = new Date(dateIso).getTime();
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

export default function ConversationList() {
  const { state, selectConversation, startNewConversation } = useChatContext();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const id = await startNewConversation(title.trim());
      setTitle('');
      setShowForm(false);
      router.push('/' + id);
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (conv: Conversation) => {
    selectConversation(conv);
    router.push('/' + conv.id);
  };

  return (
    <aside className="chat-side">
      <div className="chat-side-h" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span className="eyebrow">Conversations</span>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn btn-ghost btn-sm"
          >
            + New
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="side-form">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Conversation title…"
              className="side-input"
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="submit"
                disabled={creating || !title.trim()}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setTitle(''); }}
                className="btn btn-ghost btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="chat-side-list">
        {state.isLoadingConversations ? (
          <div className="side-empty">Loading…</div>
        ) : state.conversations.length === 0 ? (
          <div className="side-empty">No conversations yet.</div>
        ) : (
          state.conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === state.activeConversationId}
              onClick={() => handleSelect(conv)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={'conv-item' + (isActive ? ' active' : '')}
    >
      <div className="conv-item-title">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{conversation.title}</span>
        {conversation.status === 'PAUSED' && (
          <span className="conv-item-tag">paused</span>
        )}
      </div>
      <div className="conv-item-meta">
        <span className="mono">{conversation.id.slice(0, 8)}</span>
        {conversation.lastMessageAt && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span>{formatRel(conversation.lastMessageAt)}</span>
          </>
        )}
      </div>
    </button>
  );
}
