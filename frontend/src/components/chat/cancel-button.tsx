'use client';

import { useChatContext } from '@/context/chat.context';

export default function CancelButton() {
  const { cancelStreaming } = useChatContext();

  return (
    <button
      type="button"
      onClick={cancelStreaming}
      className="btn btn-ghost btn-sm"
    >
      <span className="cancel-square" aria-hidden />
      Stop generating
    </button>
  );
}
