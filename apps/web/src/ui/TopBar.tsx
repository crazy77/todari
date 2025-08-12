import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { sessionAtom } from '@/stores/sessionPersist';

export function TopBar({
  onOpenRanking,
}: {
  onOpenRanking: () => void;
}): JSX.Element {
  const session = useAtomValue(sessionAtom);
  const [open, setOpen] = useState(false);
  const onLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('todari:session');
    location.href = '/';
  };
  return (
    <div className="pointer-events-auto fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-4 py-4">
      <button
        type="button"
        onClick={onOpenRanking}
        className="pill min-h-10 font-semibold"
      >
        🏆 랭킹
      </button>
      {session.nickname ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="pill"
          >
            {session.profileImageUrl ? (
              <img
                src={session.profileImageUrl}
                alt="avatar"
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-primary text-white text-xs">
                {session.nickname.slice(0, 1)}
              </span>
            )}
            <span className="max-w-[120px] truncate">{session.nickname}</span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white p-2 text-slate-700 text-sm shadow ring-1 ring-slate-200">
              <button
                type="button"
                onClick={onLogout}
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-100"
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
