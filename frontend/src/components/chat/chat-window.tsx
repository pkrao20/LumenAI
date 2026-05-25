'use client';

import { useChatContext } from '@/context/chat.context';
import MessageList from './message-list';
import MessageInput from './message-input';
import CancelButton from './cancel-button';

export default function ChatWindow() {
  const { state, pauseConversation, resumeConversation } = useChatContext();
  const { activeConversationId, conversations, error } = state;

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  if (!activeConversationId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-800">Welcome</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Select a conversation or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  const isPaused = activeConversation?.status === 'PAUSED';

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-zinc-100 px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-zinc-900">
            {activeConversation?.title ?? 'Chat'}
          </h1>
          {isPaused && <p className="text-xs text-zinc-400">This conversation is paused.</p>}
        </div>
        {activeConversation && (
          <button
            onClick={() =>
              isPaused
                ? resumeConversation(activeConversation.id)
                : pauseConversation(activeConversation.id)
            }
            disabled={state.isStreaming}
            className="flex-shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </header>

      {error && (
        <div className="mx-6 mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <MessageList conversationId={activeConversationId} />

      <footer className="flex-shrink-0 border-t border-zinc-100 px-6 py-4">
        {state.isStreaming && <CancelButton />}
        <MessageInput />
      </footer>
    </div>
  );
}
