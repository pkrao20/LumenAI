import type { Message } from '@/types/message';

function fmtTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const hasContent = Boolean(message.content);

  return (
    <div className={'msg ' + (isUser ? 'msg-user' : 'msg-assistant')}>
      <div className="msg-gutter">
        {isUser ? (
          <div className="avatar sm" aria-hidden>a</div>
        ) : (
          <span className="brand-mark" style={{ width: 22, height: 22 }} aria-hidden />
        )}
      </div>
      <div className="msg-bubble">
        <div className="msg-meta">
          <span className="mono">{isUser ? 'you' : 'assistant'}</span>
          {message.timestamp ? (
            <>
              <span style={{ color: 'var(--ink-4)' }}>·</span>
              <span>{fmtTime(message.timestamp)}</span>
            </>
          ) : null}
          {message.isStreaming && <span className="streaming-dot" aria-hidden />}
        </div>
        <div className="msg-content">
          {hasContent ? (
            <>
              {message.content}
              {message.isStreaming && <span className="caret" aria-hidden />}
            </>
          ) : message.isStreaming ? (
            <span className="typing-dots" aria-label="assistant is typing">
              <span />
              <span />
              <span />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
