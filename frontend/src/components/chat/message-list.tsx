'use client';

import { useEffect, useRef } from 'react';
import { useChatContext } from '@/context/chat.context';
import MessageItem from './message-item';

export default function MessageList({ conversationId }: { conversationId: string }) {
  const { state } = useChatContext();
  const messages = state.messagesByConversation[conversationId] ?? [];
  const isLoadingMessages = state.loadingMessagesFor === conversationId;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, state.streamingMessageId]);

  if (isLoadingMessages) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-zinc-400">Loading messages…</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-zinc-400">Send a message to start the conversation.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
