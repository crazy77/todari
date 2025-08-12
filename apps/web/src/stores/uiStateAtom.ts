import { atom } from 'jotai';

export type AppState =
  | 'auth'
  | 'menu'
  | 'waiting'
  | 'playing'
  | 'round-clear'
  | 'game-over';

export type GameMode = 'solo' | 'speed' | 'waiting';

export const appStateAtom = atom<AppState>('auth');

export const selectedModeAtom = atom<GameMode>('waiting');
export const currentRoundAtom = atom<number>(1);
export const totalRoundsAtom = atom<number>(3);
export const participantsAtom = atom<number>(1); // 추후 소켓과 연동
export const waitingMembersAtom = atom<
  Array<{ id: string; userId?: string; nickname?: string; avatar?: string }>
>([]);
export const currentRoomIdAtom = atom<string | null>(null);
export const lastRoundElapsedMsAtom = atom<number>(0);
export const finalScoreAtom = atom<number>(0);
export const speedSettingsAtom = atom<{
  rewardName?: string | null;
  minParticipants?: number;
  speedReady?: boolean;
}>({});
export type RoundBreakdown = {
  matchPoints: number;
  wrongPoints: number; // 음수
  comboPoints: number;
  timePenalty: number; // 음수
  roundBonus: number;
  totalDelta: number;
};
export const lastRoundBreakdownAtom = atom<RoundBreakdown | null>(null);
