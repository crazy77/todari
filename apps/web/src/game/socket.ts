import { io, type Socket } from 'socket.io-client';

type ImportMetaEnvLike = { VITE_SOCKET_URL?: string } | undefined;
// Vite 환경 또는 글로벌 주입 모두 지원
const viteEnv = (import.meta as unknown as { env?: ImportMetaEnvLike })?.env;
const globalEnv = (globalThis as unknown as { VITE_SOCKET_URL?: string })
  ?.VITE_SOCKET_URL;
const SOCKET_URL =
  viteEnv?.VITE_SOCKET_URL || globalEnv || 'http://localhost:4000';

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
});

export function connectSocket(): void {
  if (!socket.connected) socket.connect();
}

export function joinRoom(
  roomId: string,
  info?: { userId?: string; nickname?: string; avatar?: string },
): void {
  connectSocket();
  socket.emit('join-room', { roomId, ...(info ?? {}) });
}

export function leaveRoom(roomId: string): void {
  if (!socket.connected) return;
  socket.emit('leave-room', { roomId });
}

export function disconnectSocket(): void {
  if (socket.connected) socket.disconnect();
}
