import type { RoomStatus } from '../types/room';

export type ServerToClientEvents = {
  joined: (payload: { roomId: string }) => void;
  'user-joined': (payload: { id: string }) => void;
  'user-left': (payload: { id: string }) => void;
  'room-status': (payload: { roomId: string; status: RoomStatus }) => void;
  'room-full': (payload: { roomId: string }) => void;
  'state-sync': (payload: { ts: number; state: unknown }) => void;
  'time-sync': (payload: { serverTs: number }) => void;
  'action-broadcast': (payload: { from: string; ts: number; type: string; data?: unknown }) => void;
  'action-result': (payload: { ts: number; ok: boolean; reason?: string }) => void;
  pong: (payload: { ts: number; rttMs: number }) => void;
};

export type ClientToServerEvents = {
  'join-room': (payload: { roomId: string }) => void;
  'resume': (payload: { roomId: string }) => void;
  'leave-room': (payload: { roomId: string }) => void;
  'game-start': (payload: { roomId: string }) => void;
  'game-end': (payload: { roomId: string }) => void;
  action: (payload: { roomId: string; ts: number; type: string; data?: unknown }) => void;
  ping: (payload: { ts: number }) => void;
};

export type InterServerEvents = Record<string, never>;
export type SocketData = { roomId?: string };
