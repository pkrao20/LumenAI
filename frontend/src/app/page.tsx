'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatContext } from '@/context/chat.context';
import ConversationList from '@/components/sidebar/conversation-list';
import ChatWindow from '@/components/chat/chat-window';

export default function Page() {
  const { state } = useChatContext();
  const router = useRouter();

  useEffect(() => {
    if (state.isAuthenticated === false) {
      router.replace('/login');
    }
  }, [state.isAuthenticated, router]);

  if (state.isAuthenticated === null || state.isAuthenticated === false) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-zinc-400">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList />
      <main className="flex flex-1 overflow-hidden">
        <ChatWindow />
      </main>
    </div>
  );
}
