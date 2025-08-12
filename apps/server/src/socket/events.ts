import type { RoomStatus } from '../types/room';

type MemberInfo = {
  id: string;
  userId?: string;
  nickname?: string;
  avatar?: string;
  tableNumber?: string | null;
  score?: number;
  round?: number;
};

export type ServerToClientEvents = {
  joined: (payload: { roomId: string }) => void;
  'user-joined': (payload: MemberInfo) => void;
  'user-left': (payload: { id: string }) => void;
  'room-members': (payload: {
    roomId: string;
    members: Array<MemberInfo>;
  }) => void;
  'room-status': (payload: {
    roomId: string;
    status: RoomStatus;
    sessionId?: string;
  }) => void;
  'room-full': (payload: { roomId: string }) => void;
  'state-sync': (payload: { ts: number; state: unknown }) => void;
  'time-sync': (payload: { serverTs: number }) => void;
  'progress-top': (payload: { roomId: string; top: Array<MemberInfo> }) => void;
  'settings-updated': (payload: { settings: Record<string, unknown> }) => void;
  'current-room': (payload: { roomId: string }) => void;
  'room-closed': (payload: { roomId: string }) => void;
  'game-results': (payload: {
    roomId: string;
    sessionId?: string;
    results: Array<MemberInfo>;
    rewardName?: string | null;
  }) => void;
  'start-rejected': (payload: {
    reason: 'not_ready' | 'not_enough_members' | 'no_room';
  }) => void;
  'action-broadcast': (payload: {
    from: string;
    ts: number;
    type: string;
    data?: unknown;
  }) => void;
  'action-result': (payload: {
    ts: number;
    ok: boolean;
    reason?: string;
  }) => void;
  'chat-message': (payload: {
    roomId: string;
    senderId: string;
    nickname?: string;
    text?: string;
    emoji?: string;
    ts: number;
  }) => void;
  pong: (payload: { ts: number; rttMs: number }) => void;
};

export type ClientToServerEvents = {
  'join-room': (payload: { roomId: string; memberInfo: MemberInfo }) => void;
  'watch-room': (payload: { roomId: string }) => void;
  resume: (payload: { roomId: string }) => void;
  'leave-room': (payload: { roomId: string }) => void;
  'game-start': (payload: { roomId: string }) => void;
  'game-end': (payload: { roomId: string }) => void;
  'game-finished': (payload: {
    roomId: string;
    memberInfo: MemberInfo;
  }) => void;
  'progress-update': (payload: {
    roomId: string;
    memberInfo: MemberInfo;
  }) => void;
  action: (payload: {
    roomId: string;
    ts: number;
    type: string;
    data?: unknown;
  }) => void;
  ping: (payload: { ts: number }) => void;
  'chat-send': (payload: {
    roomId: string;
    nickname?: string;
    text?: string;
    emoji?: string;
    ts: number;
  }) => void;
};

export type InterServerEvents = Record<string, never>;
export type SocketData = { roomId?: string };
