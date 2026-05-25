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
      <main className="chat-main">
        <div className="chat-center-state">
          <div className="inner">
            <span className="eyebrow">welcome</span>
            <h2>Ask <em>anything</em>.</h2>
            <p>Select a conversation from the left, or start a new one to begin.</p>
          </div>
        </div>
      </main>
    );
  }

  const isPaused = activeConversation?.status === 'PAUSED';

  return (
    <main className="chat-main">
      <header className="chat-header">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            session · <span className="mono" style={{ textTransform: 'none' }}>{activeConversationId.slice(0, 12)}</span>
          </div>
          <h1 className="chat-title">{activeConversation?.title ?? 'Chat'}</h1>
          {isPaused && <p className="chat-subtitle">This conversation is paused.</p>}
        </div>
        <div className="chat-header-r">
          {isPaused ? (
            <span className="pill warn">paused</span>
          ) : state.isStreaming ? (
            <span className="pill warn">streaming</span>
          ) : (
            <span className="pill dot">idle</span>
          )}
          {activeConversation && (
            <button
              type="button"
              onClick={() =>
                isPaused
                  ? resumeConversation(activeConversation.id)
                  : pauseConversation(activeConversation.id)
              }
              disabled={state.isStreaming}
              className="btn btn-ghost btn-sm"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
      </header>

      {error && <div className="banner">{error}</div>}

      <MessageList conversationId={activeConversationId} />

      <div className="chat-input-wrap">
        {state.isStreaming && (
          <div className="cancel-row">
            <CancelButton />
          </div>
        )}
        <MessageInput />
      </div>
    </main>
  );
}
