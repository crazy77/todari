import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { connectSocket, socket } from '@/game/socket';
import { blockedUsersAtom, logsAtom, logsLevelAtom, logsLimitAtom, roomsAtom, settingsAtom, } from '@/stores/adminAtoms';
import { cn } from '@/utils/cn';
export function AdminDashboard() {
    const [connected, setConnected] = useState(false);
    const [roomId, setRoomId] = useState('');
    const [roomStatus, setRoomStatus] = useState('waiting');
    const [rooms, setRooms] = useAtom(roomsAtom);
    const [settings, setSettings] = useAtom(settingsAtom);
    const [logs, setLogs] = useAtom(logsAtom);
    const [logLevel, setLogLevel] = useAtom(logsLevelAtom);
    const [logLimit, setLogLimit] = useAtom(logsLimitAtom);
    const [blocked, setBlocked] = useAtom(blockedUsersAtom);
    useEffect(() => {
        // 관리자 화면 진입 시 소켓 연결 보장
        connectSocket();
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
    return (_jsxs("div", { className: "min-h-[100svh] w-full p-4 sm:p-6", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "font-extrabold text-slate-800 text-xl", children: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), _jsx("span", { className: cn('chip', connected ? 'ring-emerald-300' : 'ring-rose-300'), children: connected ? '소켓 연결됨' : '소켓 해제됨' })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [_jsxs("section", { className: "card p-4", children: [_jsx("div", { className: "mb-2 font-bold text-base text-slate-700", children: "\uAC8C\uC784\uBC29 \uC0C1\uD0DC" }), _jsx("input", { className: "mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary", placeholder: "room id", value: roomId, onChange: (e) => setRoomId(e.target.value) }), _jsxs("div", { className: "text-slate-600 text-sm", children: ["\uC0C1\uD0DC: ", roomStatus] }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("button", { type: "button", className: "btn-primary", onClick: () => socket.emit('game-start', { roomId }), children: "\uC2DC\uC791" }), _jsx("button", { type: "button", className: "btn-ghost", onClick: () => socket.emit('game-end', { roomId }), children: "\uC885\uB8CC" }), _jsx("button", { type: "button", className: "btn-ghost", onClick: () => socket.emit('leave-room', { roomId }), children: "\uD1F4\uC7A5" })] })] }), _jsxs("section", { className: "card p-4", children: [_jsx("div", { className: "mb-2 font-bold text-base text-slate-700", children: "\uAC8C\uC784 \uC124\uC815" }), _jsxs("form", { className: "grid grid-cols-2 gap-3", onSubmit: async (e) => {
                                    e.preventDefault();
                                    const res = await fetch('/api/admin/settings', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(settings),
                                    });
                                    const data = await res.json();
                                    if (data?.settings)
                                        setSettings(data.settings);
                                }, children: [[
                                        ['roundTimeSeconds', '라운드 시간(s)'],
                                        ['maxRounds', '최대 라운드'],
                                        ['baseScore', '기본 점수'],
                                        ['timeBonus', '시간 보너스'],
                                        ['rewardName', '보상(메뉴명/직접입력, 빈값=보상없음)'],
                                        ['minParticipants', '최소 참여 인원'],
                                    ].map(([k, label]) => (_jsxs("label", { className: "text-sm", children: [_jsx("span", { className: "mb-1 block text-slate-600", children: label }), _jsx("input", { type: k === 'rewardName' ? 'text' : 'number', value: k === 'rewardName'
                                                    ? (settings[k] ??
                                                        '')
                                                    : (settings[k] ??
                                                        ''), onChange: (e) => {
                                                    const val = k === 'rewardName'
                                                        ? e.target.value
                                                        : Number(e.target.value);
                                                    setSettings((s) => ({ ...s, [k]: val }));
                                                }, className: "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" })] }, k))), _jsx("div", { className: "col-span-2", children: _jsx("button", { type: "submit", className: "btn-primary", children: "\uC800\uC7A5" }) })] })] }), _jsxs("section", { className: "card p-4", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("div", { className: "font-bold text-base text-slate-700", children: "\uAC8C\uC784\uBC29 \uBAA9\uB85D" }), _jsx("button", { type: "button", className: "btn-ghost", onClick: async () => {
                                            const res = await fetch('/api/admin/rooms');
                                            const data = await res.json();
                                            setRooms((data.rooms ?? []));
                                        }, children: "\uC0C8\uB85C\uACE0\uCE68" })] }), _jsx("div", { className: "grid gap-2", children: rooms.map((r) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm", children: [_jsxs("span", { className: "text-slate-700", children: ["#", r.id, " \u2014 ", r.status] }), _jsxs("span", { className: "flex gap-2", children: [_jsx("button", { type: "button", className: "btn-ghost", onClick: () => fetch(`/api/admin/rooms/${r.id}/status`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ status: 'playing' }),
                                                    }), children: "\uC2DC\uC791" }), _jsx("button", { type: "button", className: "btn-ghost", onClick: () => fetch(`/api/admin/rooms/${r.id}/status`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ status: 'ended' }),
                                                    }), children: "\uC885\uB8CC" }), _jsx("button", { type: "button", className: "btn-ghost", onClick: () => fetch(`/api/admin/rooms/${r.id}`, { method: 'DELETE' }), children: "\uC0AD\uC81C" })] })] }, r.id))) })] }), _jsxs("section", { className: "card p-4", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("div", { className: "font-bold text-base text-slate-700", children: "\uC11C\uBC84 \uB85C\uADF8" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { className: "rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm", value: logLevel, onChange: (e) => setLogLevel(e.target.value), children: [_jsx("option", { value: "all", children: "all" }), _jsx("option", { value: "info", children: "info" }), _jsx("option", { value: "warn", children: "warn" }), _jsx("option", { value: "error", children: "error" })] }), _jsx("input", { className: "w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm", type: "number", value: logLimit, onChange: (e) => setLogLimit(Number(e.target.value)) }), _jsx("button", { type: "button", className: "btn-ghost", onClick: async () => {
                                                    const q = new URLSearchParams();
                                                    if (logLevel !== 'all')
                                                        q.set('level', logLevel);
                                                    q.set('limit', String(logLimit));
                                                    const res = await fetch(`/api/admin/logs?${q.toString()}`);
                                                    const data = await res.json();
                                                    setLogs((data.logs ?? []));
                                                }, children: "\uBD88\uB7EC\uC624\uAE30" })] })] }), _jsx("div", { className: "grid max-h-64 gap-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs", children: logs.map((l) => (_jsxs("div", { className: cn('rounded-md px-2 py-1', l.level === 'error'
                                        ? 'bg-rose-50 text-rose-700'
                                        : l.level === 'warn'
                                            ? 'bg-amber-50 text-amber-700'
                                            : 'bg-slate-50 text-slate-700'), children: [_jsx("span", { className: "mr-2 inline-block w-12 font-bold text-[11px] uppercase", children: l.level }), _jsx("span", { className: "text-[11px] text-slate-500", children: new Date(l.ts).toLocaleTimeString() }), _jsx("span", { className: "ml-2", children: l.message })] }, `${l.ts}-${l.message}`))) })] }), _jsxs("section", { className: "card p-4", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("div", { className: "font-bold text-base text-slate-700", children: "\uCC28\uB2E8 \uAD00\uB9AC" }), _jsx("button", { type: "button", className: "btn-ghost", onClick: async () => {
                                            const res = await fetch('/api/admin/moderation/blocked');
                                            const data = await res.json();
                                            setBlocked((data.users ?? []));
                                        }, children: "\uBD88\uB7EC\uC624\uAE30" })] }), _jsxs("div", { className: "grid gap-2", children: [_jsxs("form", { className: "flex gap-2", onSubmit: async (e) => {
                                            e.preventDefault();
                                            const el = e.currentTarget.elements.namedItem('uid');
                                            const input = el instanceof HTMLInputElement ? el : null;
                                            const userId = (input?.value ?? '').trim();
                                            if (!userId)
                                                return;
                                            await fetch('/api/admin/moderation/block', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ userId }),
                                            });
                                            if (input)
                                                input.value = '';
                                            const res = await fetch('/api/admin/moderation/blocked');
                                            const data = await res.json();
                                            setBlocked((data.users ?? []));
                                        }, children: [_jsx("input", { name: "uid", placeholder: "user id", className: "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" }), _jsx("button", { type: "submit", className: "btn-primary", children: "\uCC28\uB2E8" })] }), _jsx("div", { className: "grid gap-1", children: blocked.map((u) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 text-sm", children: [_jsx("span", { children: u }), _jsx("button", { type: "button", className: "btn-ghost", onClick: async () => {
                                                        await fetch('/api/admin/moderation/unblock', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ userId: u }),
                                                        });
                                                        const res = await fetch('/api/admin/moderation/blocked');
                                                        const data = await res.json();
                                                        setBlocked((data.users ?? []));
                                                    }, children: "\uD574\uC81C" })] }, u))) })] })] })] })] }));
}
