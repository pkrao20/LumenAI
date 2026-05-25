import type { Message } from '@/types/message';

export default function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-blue-600 text-white'
            : 'rounded-bl-sm bg-zinc-100 text-zinc-900'
        }`}
      >
        {message.content ? (
          <>
            <span className="whitespace-pre-wrap">{message.content}</span>
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle bg-current opacity-75" />
            )}
          </>
        ) : message.isStreaming ? (
          <span className="flex h-5 items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
