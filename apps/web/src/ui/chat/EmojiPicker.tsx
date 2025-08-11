import { useState } from 'react';
import { socket } from '@/game/socket';

const EMOJIS = ['😀','🤣','😎','😍','🤔','😭','😡','👍','👏','🔥','💯','🎉'];

export function EmojiPicker({ roomId }: { roomId: string }): JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (!roomId) return null;

  return (
    <div style={{ position: 'fixed', bottom: 220, left: 8 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ background: '#444', color: '#fff', border: 0, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
        🙂 이모지
      </button>
      {open && (
        <div style={{ marginTop: 8, background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(6, 24px)', gap: 6 }}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => {
                socket.emit('chat-send', { roomId, emoji: e, ts: Date.now() });
                setOpen(false);
              }}
              style={{ background: 'transparent', border: 0, cursor: 'pointer', fontSize: 18 }}
              title={e}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
