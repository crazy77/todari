import { atom } from 'jotai';

export type Session = {
  nickname?: string;
  profileImageUrl?: string;
};

export const sessionAtom = atom<Session>({});
