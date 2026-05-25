'use client';

import { useRef, useState } from 'react';
import { useChatContext } from '@/context/chat.context';

export default function MessageInput() {
  const { state, sendMessage } = useChatContext();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeConversation = state.conversations.find((c) => c.id === state.activeConversationId);
  const isPaused = activeConversation?.status === 'PAUSED';
  const disabled = state.isStreaming || !state.activeConversationId || isPaused;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText('');
    resetHeight();
    await sendMessage(trimmed);
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = isPaused
    ? 'Conversation paused — resume to continue'
    : state.isStreaming
      ? 'Generating…'
      : !state.activeConversationId
        ? 'Select a conversation to begin'
        : 'Send a message — Enter to send, Shift+Enter for newline';

  return (
    <div className="chat-input">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
      />
      <div className="chat-input-bar">
        <div className="chat-input-meta">
          {text.length} chars · ~{Math.ceil(text.length / 4)} tokens
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="btn btn-primary btn-sm"
        >
          Send →
        </button>
      </div>
    </div>
  );
}
