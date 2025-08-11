import { atom } from 'jotai';
export const appStateAtom = atom('auth');
export const selectedModeAtom = atom('solo');
export const currentRoundAtom = atom(1);
export const totalRoundsAtom = atom(3);
export const participantsAtom = atom(1); // 추후 소켓과 연동
export const waitingMembersAtom = atom([]);
export const lastRoundElapsedMsAtom = atom(0);
export const finalScoreAtom = atom(0);
export const lastRoundBreakdownAtom = atom(null);
