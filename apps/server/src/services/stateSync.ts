import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../socket/events';

export type GameState = {
  // 최소 스켈레톤: 라운드/점수 등 필요 시 확장
  round: number;
  scoreBoard: Record<string, number>;
};

const roomIntervals = new Map<string, NodeJS.Timeout>();
const roomStates = new Map<string, GameState>();

export function startSync(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomId: string,
  tickMs = 200,
) {
  if (roomIntervals.has(roomId)) return; // already running
  if (!roomStates.has(roomId)) roomStates.set(roomId, { round: 1, scoreBoard: {} });
  const handle = setInterval(() => {
    const state = roomStates.get(roomId)!;
    io.to(roomId).volatile.emit('state-sync', { ts: Date.now(), state });
  }, tickMs);
  roomIntervals.set(roomId, handle);
}

export function stopSync(roomId: string) {
  const handle = roomIntervals.get(roomId);
  if (handle) {
    clearInterval(handle);
    roomIntervals.delete(roomId);
  }
}

export function updateScore(roomId: string, clientId: string, delta: number) {
  const state = roomStates.get(roomId);
  if (!state) return;
  state.scoreBoard[clientId] = (state.scoreBoard[clientId] ?? 0) + delta;
}

export function resetRoom(roomId: string) {
  stopSync(roomId);
  roomStates.delete(roomId);
}
