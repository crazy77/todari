import { atom } from 'jotai';
export const defaultSoloSettings = {
    mode: 'solo',
    rounds: 3,
    baseRoundMs: 5000,
    minRoundMs: 2000,
    baseScore: 10,
    timeBonusMax: 5,
};
export const defaultSpeedSettings = {
    mode: 'speed',
    rounds: 3,
    baseRoundMs: 2500,
    minRoundMs: 1200,
    baseScore: 8,
    timeBonusMax: 3,
};
export const gameSettingsAtom = atom(defaultSoloSettings);
