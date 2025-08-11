import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { socket } from '@/game/socket';
export function Scoreboard({ roomId }) {
    const [scores, setScores] = useState({});
    useEffect(() => {
        function onState({ state, }) {
            if (!state?.scoreBoard)
                return;
            setScores(state.scoreBoard);
        }
        socket.on('state-sync', onState);
        return () => {
            socket.off('state-sync', onState);
        };
    }, [roomId]);
    const rows = useMemo(() => Object.entries(scores).sort((a, b) => b[1] - a[1]), [scores]);
    return (_jsxs("div", { style: {
            position: 'fixed',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            borderRadius: 8,
            padding: 8,
            width: 160,
        }, children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 6 }, children: "\uC21C\uC704\uD45C" }), rows.map(([id, score], idx) => (_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                }, children: [_jsxs("span", { children: ["#", idx + 1, " ", id.slice(0, 4)] }), _jsx("span", { children: score })] }, id)))] }));
}
