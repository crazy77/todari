import { atom } from 'jotai';
import type { GameMode } from '@/stores/modeAtom';

export type AppState =
  | 'auth'
  | 'menu'
  | 'waiting'
  | 'playing'
  | 'round-clear'
  | 'game-over';

export const appStateAtom = atom<AppState>('auth');

export const selectedModeAtom = atom<GameMode>('solo');
export const currentRoundAtom = atom<number>(1);
export const totalRoundsAtom = atom<number>(3);
export const participantsAtom = atom<number>(1); // 추후 소켓과 연동
export const waitingMembersAtom = atom<
  Array<{ id: string; userId?: string; nickname?: string; avatar?: string }>
>([]);
export const lastRoundElapsedMsAtom = atom<number>(0);
export const finalScoreAtom = atom<number>(0);
export type RoundBreakdown = {
  matchPoints: number;
  wrongPoints: number; // 음수
  comboPoints: number;
  timePenalty: number; // 음수
  roundBonus: number;
  totalDelta: number;
};
export const lastRoundBreakdownAtom = atom<RoundBreakdown | null>(null);
