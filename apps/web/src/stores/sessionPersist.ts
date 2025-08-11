import { atomWithStorage } from 'jotai/utils';
import type { Session } from './sessionAtom';

export const sessionPersistAtom = atomWithStorage<Session>(
  'todari:session',
  {},
);
