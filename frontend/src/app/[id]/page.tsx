'use client';

import { useParams } from 'next/navigation';
import AppShell from '@/components/chat/app-shell';

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  return <AppShell initialConversationId={id} />;
}
