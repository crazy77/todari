import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { socket } from '@/game/socket';
export function AdminDashboard() {
    const [connected, setConnected] = useState(false);
    const [roomId, setRoomId] = useState('');
    const [roomStatus, setRoomStatus] = useState('waiting');
    const [_online, _setOnlinee] = useState(0);
    const [rooms, setRooms] = useState([]);
    useEffect(() => {
        setConnected(socket.connected);
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);
    useEffect(() => {
        function onStatus({ roomId: id, status, }) {
            if (roomId && id !== roomId)
                return;
            setRoomStatus(status);
        }
        socket.on('room-status', onStatus);
        return () => {
            socket.off('room-status', onStatus);
        };
    }, [roomId]);
    return (_jsxs("div", { style: {
            position: 'fixed',
            inset: 0,
            padding: 16,
            background: '#0b0b0b',
            color: '#fff',
        }, children: [_jsx("h2", { style: { marginTop: 0 }, children: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC (\uC2A4\uCF08\uB808\uD1A4)" }), _jsxs("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))',
                    gap: 12,
                }, children: [_jsxs("section", { style: { background: '#151515', borderRadius: 8, padding: 12 }, children: [_jsx("h3", { children: "\uC5F0\uACB0 \uC0C1\uD0DC" }), _jsxs("div", { children: ["Socket: ", connected ? '연결됨' : '해제됨'] })] }), _jsxs("section", { style: { background: '#151515', borderRadius: 8, padding: 12 }, children: [_jsx("h3", { children: "\uAC8C\uC784\uBC29 \uC0C1\uD0DC" }), _jsx("input", { placeholder: "room id", value: roomId, onChange: (e) => setRoomId(e.target.value), style: { width: '100%', marginBottom: 6 } }), _jsxs("div", { children: ["\uC0C1\uD0DC: ", roomStatus] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { type: "button", onClick: () => socket.emit('game-start', { roomId }), children: "\uC2DC\uC791" }), _jsx("button", { type: "button", onClick: () => socket.emit('game-end', { roomId }), children: "\uC885\uB8CC" }), _jsx("button", { type: "button", onClick: () => socket.emit('leave-room', { roomId }), children: "\uD1F4\uC7A5" })] })] }), _jsxs("section", { style: { background: '#151515', borderRadius: 8, padding: 12 }, children: [_jsx("h3", { children: "\uAC8C\uC784\uBC29 \uBAA9\uB85D" }), _jsx("button", { type: "button", onClick: async () => {
                                    const res = await fetch('/api/admin/rooms');
                                    const data = await res.json();
                                    setRooms(data.rooms ?? []);
                                }, style: { marginBottom: 8 }, children: "\uBAA9\uB85D \uC0C8\uB85C\uACE0\uCE68" }), _jsx("div", { style: { display: 'grid', gap: 6 }, children: rooms.map((r) => (_jsxs("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        alignItems: 'center',
                                    }, children: [_jsxs("span", { children: ["#", r.id, " \u2014 ", r.status] }), _jsxs("span", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { type: "button", onClick: () => fetch(`/api/admin/rooms/${r.id}/status`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ status: 'playing' }),
                                                    }), children: "\uC2DC\uC791" }), _jsx("button", { type: "button", onClick: () => fetch(`/api/admin/rooms/${r.id}/status`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ status: 'ended' }),
                                                    }), children: "\uC885\uB8CC" }), _jsx("button", { type: "button", onClick: () => fetch(`/api/admin/rooms/${r.id}`, { method: 'DELETE' }), children: "\uC0AD\uC81C" })] })] }, r.id))) })] })] })] }));
}
