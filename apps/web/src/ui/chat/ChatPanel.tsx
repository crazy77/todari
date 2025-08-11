import { useEffect, useMemo, useRef, useState } from 'react';
import { socket } from '@/game/socket';

export type ChatMessage = {
  roomId: string;
  senderId: string;
  nickname?: string;
  text?: string;
  emoji?: string;
  ts: number;
};

export function ChatPanel({ roomId }: { roomId: string }): JSX.Element | null {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onMsg(msg: ChatMessage) {
      if (msg.roomId !== roomId) return;
      setMessages((prev) => [...prev.slice(-99), msg]);
    }
    socket.on('chat-message', onMsg);
    return () => {
      socket.off('chat-message', onMsg);
    };
  }, [roomId]);

  useEffect(() => {
    if (!open) return;
    const last = listRef.current;
    if (!last) return;
    last.scrollTop = last.scrollHeight;
  }, [messages, open]);

  const canSend = useMemo(() => text.trim().length > 0, [text]);

  function send() {
    if (!canSend) return;
    socket.emit('chat-send', { roomId, text: text.trim(), ts: Date.now() });
    setText('');
  }

  if (!roomId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        width: 280,
        background: '#1a1a1a',
        color: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          background: '#222',
          borderBottom: '1px solid #333',
        }}
      >
        <strong style={{ flex: 1 }}>Chat</strong>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            color: '#ccc',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
        >
          {open ? '−' : '+'}
        </button>
      </div>
      {open && (
        <>
          <div
            ref={listRef}
            style={{ maxHeight: 160, overflowY: 'auto', padding: 8 }}
          >
            {messages.map((m, _i) => (
              <div
                key={`${m?.nickname ?? m?.senderId}${m?.text ?? ''}${m?.ts}`}
                style={{ marginBottom: 6, fontSize: 12 }}
              >
                <span style={{ opacity: 0.7 }}>
                  {m.nickname ?? m.senderId.slice(0, 4)}
                </span>
                : {m.emoji ? `:${m.emoji}:` : m.text}
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: 8,
              borderTop: '1px solid #333',
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 140))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder="메시지 입력..."
              style={{
                flex: 1,
                background: '#111',
                border: '1px solid #333',
                color: '#fff',
                borderRadius: 6,
                padding: '6px 8px',
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              style={{
                background: '#444',
                color: '#fff',
                border: 0,
                borderRadius: 6,
                padding: '6px 10px',
                cursor: canSend ? 'pointer' : 'default',
                opacity: canSend ? 1 : 0.5,
              }}
            >
              전송
            </button>
          </div>
        </>
      )}
    </div>
  );
}
