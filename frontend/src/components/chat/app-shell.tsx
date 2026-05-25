'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatContext } from '@/context/chat.context';
import TopNav from '@/components/common/top-nav';
import ConversationList from '@/components/sidebar/conversation-list';
import ChatWindow from '@/components/chat/chat-window';

export default function AppShell({ initialConversationId }: { initialConversationId?: string }) {
  const { state, selectConversation } = useChatContext();
  const router = useRouter();

  useEffect(() => {
    if (state.isAuthenticated === false) {
      router.replace('/login');
    }
  }, [state.isAuthenticated, router]);

  useEffect(() => {
    if (!initialConversationId) return;
    if (!state.isAuthenticated || state.isLoadingConversations) return;
    if (state.activeConversationId === initialConversationId) return;

    const conv = state.conversations.find((c) => c.id === initialConversationId);
    if (conv) {
      selectConversation(conv);
    } else if (state.conversations.length > 0) {
      router.replace('/');
    }
  }, [
    initialConversationId,
    state.isAuthenticated,
    state.isLoadingConversations,
    state.conversations,
    state.activeConversationId,
    selectConversation,
    router,
  ]);

  if (state.isAuthenticated === null || state.isAuthenticated === false) {
    return (
      <div className="chat-center-state">
        <div className="inner">
          <span className="eyebrow">authenticating</span>
          <h2>One <em>moment</em>.</h2>
          <p>Bringing you to your workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <TopNav />

      <div className="app-body">
        <div className="chat-shell">
          <ConversationList />
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
