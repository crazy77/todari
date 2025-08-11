import { atom } from 'jotai';

export type Session = {
  nickname?: string;
};

export const sessionAtom = atom<Session>({});
