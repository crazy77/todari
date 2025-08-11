import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { sessionPersistAtom } from '@/stores/sessionPersist';

export function TopBar({
  onOpenRanking,
}: {
  onOpenRanking: () => void;
}): JSX.Element {
  const session = useAtomValue(sessionPersistAtom);
  const [open, setOpen] = useState(false);
  const onLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('todari:session');
    location.href = '/';
  };
  return (
    <div className="pointer-events-auto fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-3 py-2">
      <button
        type="button"
        onClick={onOpenRanking}
        className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 font-semibold text-sm text-white ring-1 ring-white/10 backdrop-blur hover:bg-black/40"
      >
        🏆 랭킹
      </button>
      {session.nickname ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-black/30 px-2 py-1 text-sm text-white ring-1 ring-white/10 hover:bg-black/40"
          >
            {session.profileImageUrl ? (
              <img
                src={session.profileImageUrl}
                alt="avatar"
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-primary/80 text-xs">
                {session.nickname.slice(0, 1)}
              </span>
            )}
            <span className="max-w-[120px] truncate">{session.nickname}</span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg bg-brand-surface p-2 text-sm text-white shadow ring-1 ring-white/10">
              <button
                type="button"
                onClick={onLogout}
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-black/30"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
