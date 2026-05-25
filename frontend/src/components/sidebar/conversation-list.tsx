'use client';

import { useState } from 'react';
import { useChatContext } from '@/context/chat.context';
import type { Conversation } from '@/types/conversation';

export default function ConversationList() {
  const { state, selectConversation, startNewConversation } = useChatContext();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await startNewConversation(title.trim());
      setTitle('');
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 p-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex w-full items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
        >
          <span className="text-base leading-none">+</span>
          New Chat
        </button>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-2 space-y-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Conversation title…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !title.trim()}
                className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setTitle(''); }}
                className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {state.isLoadingConversations ? (
          <p className="px-4 py-3 text-sm text-zinc-500">Loading…</p>
        ) : state.conversations.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-500">No conversations yet.</p>
        ) : (
          state.conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === state.activeConversationId}
              onClick={() => selectConversation(conv)}
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
      onClick={onClick}
      className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${
        isActive ? 'bg-zinc-800' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-zinc-100">{conversation.title}</span>
        {conversation.status === 'PAUSED' && (
          <span className="flex-shrink-0 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
            paused
          </span>
        )}
      </div>
      {conversation.lastMessageAt && (
        <p className="mt-0.5 text-xs text-zinc-500">
          {new Date(conversation.lastMessageAt).toLocaleDateString()}
        </p>
      )}
    </button>
  );
}
