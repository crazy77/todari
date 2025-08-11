import type { Server } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './events';

let IO: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

export function setIO(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
  IO = io;
}

export function getIO(): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null {
  return IO;
}


