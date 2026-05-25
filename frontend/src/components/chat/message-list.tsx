'use client';

import { useEffect, useRef } from 'react';
import { useChatContext } from '@/context/chat.context';
import MessageItem from './message-item';

export default function MessageList({ conversationId }: { conversationId: string }) {
  const { state } = useChatContext();
  const messages = state.messagesByConversation[conversationId] ?? [];
  const isLoadingMessages = state.loadingMessagesFor === conversationId;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, state.streamingMessageId]);

  if (isLoadingMessages) {
    return (
      <div className="chat-scroller">
        <div className="chat-empty">
          <span className="eyebrow">loading</span>
          <p>Fetching messages…</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="chat-scroller">
        <div className="chat-empty">
          <span className="eyebrow">start here</span>
          <h3>
            Ask anything. Every call is <em>logged</em>.
          </h3>
          <p>
            Send a message to start the conversation. Each call is wrapped by the LumenAI SDK
            and shipped to the ingestion bus.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-scroller" ref={scrollerRef}>
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
