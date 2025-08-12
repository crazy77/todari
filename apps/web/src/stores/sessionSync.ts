import { atom, useAtomValue, useSetAtom } from 'jotai';
import { sessionAtom } from './sessionPersist';

export const authCheckedAtom = atom(false);

export function useBootstrapSession(): void {
  const setSession = useSetAtom(sessionAtom);
  const setChecked = useSetAtom(authCheckedAtom);
  fetch('/api/auth/me')
    .then((r) => r.json())
    .then((data) => {
      const user = data?.user as { sub: string; nickname?: string } | null;
      if (user) setSession({ nickname: user.nickname });
    })
    .finally(() => setChecked(true));
}

export function useAuthChecked(): boolean {
  return useAtomValue(authCheckedAtom);
}
