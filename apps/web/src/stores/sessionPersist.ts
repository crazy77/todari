import { atomWithStorage } from 'jotai/utils';

type Session = {
  nickname?: string;
  profileImageUrl?: string;
};
export const sessionAtom = atomWithStorage<Session>('todari:session', {});
