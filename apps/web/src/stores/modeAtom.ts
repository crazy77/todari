import { atom } from 'jotai';

export type GameMode = 'solo' | 'speed';

export type GameSettings = {
  mode: GameMode;
  rounds: number;
  baseRoundMs: number;
  minRoundMs: number;
  baseScore: number;
  timeBonusMax: number;
};

export const defaultSoloSettings: GameSettings = {
  mode: 'solo',
  rounds: 10,
  baseRoundMs: 5000,
  minRoundMs: 2000,
  baseScore: 10,
  timeBonusMax: 5,
};

export const defaultSpeedSettings: GameSettings = {
  mode: 'speed',
  rounds: 5,
  baseRoundMs: 2500,
  minRoundMs: 1200,
  baseScore: 8,
  timeBonusMax: 3,
};

export const gameSettingsAtom = atom<GameSettings>(defaultSoloSettings);
