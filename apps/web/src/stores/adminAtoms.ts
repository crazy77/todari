import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export type AdminRoom = { id: string; status: 'waiting' | 'playing' | 'ended' };
export type AdminSettings = {
  roundTimeSeconds?: number;
  maxRounds?: number;
  baseScore?: number;
  timeBonus?: number;
  rewardName?: string | null;
  minParticipants?: number;
  speedReady?: boolean;
};
export type LogLevel = 'info' | 'warn' | 'error';
export type LogEntry = {
  level: LogLevel;
  message: string;
  ts: number;
  context?: Record<string, unknown>;
};

export const roomsAtom = atom<AdminRoom[]>([]);
export const settingsAtom = atomWithStorage<AdminSettings>(
  'todari:admin:settings',
  {},
);
export const logsAtom = atom<LogEntry[]>([]);
export const logsLevelAtom = atom<LogLevel | 'all'>('all');
export const logsLimitAtom = atom<number>(200);
export const blockedUsersAtom = atom<string[]>([]);
