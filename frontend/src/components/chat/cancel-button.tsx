'use client';

import { useChatContext } from '@/context/chat.context';

export default function CancelButton() {
  const { cancelStreaming } = useChatContext();

  return (
    <div className="mb-3 flex justify-center">
      <button
        onClick={cancelStreaming}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50"
      >
        <span className="h-2 w-2 rounded-sm bg-zinc-500" />
        Stop generating
      </button>
    </div>
  );
}
