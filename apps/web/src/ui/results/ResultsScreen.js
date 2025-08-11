import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { socket } from '@/game/socket';
import { ShareButtons } from '@/ui/results/ShareButtons';
import { submitFinalScore } from '@/utils/scoreSubmit';
export function ResultsScreen({ open, onClose, roomId, }) {
    const [players, setPlayers] = useState([]);
    useEffect(() => {
        function onState({ state, }) {
            if (!state?.scoreBoard)
                return;
            const list = Object.entries(state.scoreBoard).map(([id, score]) => ({ id, score: Number(score) }));
            setPlayers(list);
        }
        socket.on('state-sync', onState);
        return () => {
            socket.off('state-sync', onState);
        };
    }, []);
    const sorted = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
    const mvp = sorted[0];
    useEffect(() => {
        if (!open || !mvp)
            return;
        // 임시: 최고 점수 제출. 추후 개인점수/개별 제출로 교체 가능
        void submitFinalScore(roomId, mvp.score);
    }, [open, mvp, roomId]);
    if (!open)
        return null;
    return (_jsx("div", { style: {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'grid',
            placeItems: 'center',
        }, children: _jsxs("div", { style: {
                background: '#1a1a1a',
                color: '#fff',
                borderRadius: 12,
                width: 320,
                maxHeight: '80vh',
                overflow: 'auto',
            }, children: [_jsxs("div", { style: { padding: 12, borderBottom: '1px solid #333' }, children: [_jsx("h3", { style: { margin: 0 }, children: "\uACB0\uACFC" }), _jsx("div", { style: { opacity: 0.7, fontSize: 12 }, children: dayjs().format('YYYY.MM.DD HH:mm') })] }), mvp && (_jsxs("div", { style: { padding: 12, borderBottom: '1px solid #333' }, children: [_jsx("strong", { children: "MVP" }), _jsxs("div", { style: { fontSize: 14, marginTop: 4 }, children: [mvp.nickname ?? mvp.id.slice(0, 4), " \u2014 ", mvp.score, "\uC810"] })] })), _jsxs("div", { style: { padding: 12 }, children: [_jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { textAlign: 'left', borderBottom: '1px solid #333' }, children: [_jsx("th", { children: "\uC21C\uC704" }), _jsx("th", { children: "\uD50C\uB808\uC774\uC5B4" }), _jsx("th", { children: "\uC810\uC218" })] }) }), _jsx("tbody", { children: sorted.map((p, idx) => (_jsxs("tr", { style: { borderBottom: '1px solid #222' }, children: [_jsx("td", { style: { padding: '6px 4px' }, children: idx + 1 }), _jsx("td", { style: { padding: '6px 4px' }, children: p.nickname ?? p.id.slice(0, 6) }), _jsx("td", { style: { padding: '6px 4px', textAlign: 'right' }, children: p.score })] }, p.id))) })] }), _jsx("div", { style: { marginTop: 12 }, children: _jsx(ShareButtons, { roomId: roomId, score: mvp?.score ?? 0 }) })] }), _jsxs("div", { style: {
                        padding: 12,
                        display: 'flex',
                        gap: 8,
                        borderTop: '1px solid #333',
                    }, children: [_jsx("button", { type: "button", onClick: () => socket.emit('game-start', { roomId }), style: { flex: 1 }, children: "\uC7AC\uAC8C\uC784" }), _jsx("button", { type: "button", onClick: onClose, style: { flex: 1 }, children: "\uB2EB\uAE30" })] })] }) }));
}
