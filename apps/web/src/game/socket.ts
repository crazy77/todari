import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = process.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
});

export function connectSocket(): void {
  if (!socket.connected) socket.connect();
}

export function joinRoom(roomId: string): void {
  connectSocket();
  socket.emit('join-room', { roomId });
}

export function leaveRoom(roomId: string): void {
  if (!socket.connected) return;
  socket.emit('leave-room', { roomId });
}

export function disconnectSocket(): void {
  if (socket.connected) socket.disconnect();
}
