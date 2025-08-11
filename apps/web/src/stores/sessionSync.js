import { atom, useAtomValue, useSetAtom } from 'jotai';
import { sessionPersistAtom } from './sessionPersist';
export const authCheckedAtom = atom(false);
export function useBootstrapSession() {
    const setSession = useSetAtom(sessionPersistAtom);
    const setChecked = useSetAtom(authCheckedAtom);
    fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => {
        const user = data?.user;
        if (user)
            setSession({ nickname: user.nickname });
    })
        .finally(() => setChecked(true));
}
export function useAuthChecked() {
    return useAtomValue(authCheckedAtom);
}
