import { io } from 'socket.io-client';
// Vite 환경 또는 글로벌 주입 모두 지원
const viteEnv = import.meta?.env;
const globalEnv = globalThis
    ?.VITE_SOCKET_URL;
const SOCKET_URL = viteEnv?.VITE_SOCKET_URL || globalEnv || 'http://localhost:4000';
export const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false,
});
export function connectSocket() {
    if (!socket.connected)
        socket.connect();
}
export function joinRoom(roomId, info) {
    connectSocket();
    socket.emit('join-room', { roomId, ...(info ?? {}) });
}
export function leaveRoom(roomId) {
    if (!socket.connected)
        return;
    socket.emit('leave-room', { roomId });
}
export function disconnectSocket() {
    if (socket.connected)
        socket.disconnect();
}
