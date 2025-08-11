import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { socket } from '@/game/socket';
const EMOJIS = [
    '😀',
    '🤣',
    '😎',
    '😍',
    '🤔',
    '😭',
    '😡',
    '👍',
    '👏',
    '🔥',
    '💯',
    '🎉',
];
export function EmojiPicker({ roomId, }) {
    const [open, setOpen] = useState(false);
    if (!roomId)
        return null;
    return (_jsxs("div", { style: { position: 'fixed', bottom: 220, left: 8 }, children: [_jsx("button", { type: "button", onClick: () => setOpen((v) => !v), style: {
                    background: '#444',
                    color: '#fff',
                    border: 0,
                    borderRadius: 6,
                    padding: '6px 10px',
                    cursor: 'pointer',
                }, children: "\uD83D\uDE42 \uC774\uBAA8\uC9C0" }), open && (_jsx("div", { style: {
                    marginTop: 8,
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333',
                    borderRadius: 8,
                    padding: 8,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 24px)',
                    gap: 6,
                }, children: EMOJIS.map((e) => (_jsx("button", { type: "button", onClick: () => {
                        socket.emit('chat-send', { roomId, emoji: e, ts: Date.now() });
                        setOpen(false);
                    }, style: {
                        background: 'transparent',
                        border: 0,
                        cursor: 'pointer',
                        fontSize: 18,
                    }, title: e, children: e }, e))) }))] }));
}
