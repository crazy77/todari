import { useEffect, useState } from 'react';

type Item = {
  userId: string;
  nickname?: string;
  score: number;
};

export function RankingBoard({
  scope = 'daily',
  gameId,
  withTabs = false,
}: {
  scope?: 'daily' | 'monthly' | 'alltime';
  gameId?: string;
  withTabs?: boolean;
}): JSX.Element {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<'daily' | 'monthly' | 'alltime'>(scope);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const activeScope = withTabs ? tab : scope;
        const url = gameId
          ? `/api/ranking/game/${gameId}`
          : `/api/ranking/${activeScope}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!alive) return;
        setItems(json.items ?? []);
      } catch {
        if (!alive) return;
        setError('랭킹을 불러오지 못했습니다');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope, gameId, tab, withTabs]);

  if (loading) return <div className="text-white/70">불러오는 중...</div>;
  if (error)
    return (
      <div className="text-red-400 text-sm">
        {error}
        <button
          type="button"
          onClick={() => {
            // 간단한 재시도
            setError(null);
            setLoading(true);
          }}
          className="ml-2 rounded bg-red-400/20 px-2 py-0.5 text-white/90"
        >
          재시도
        </button>
      </div>
    );

  return (
    <div className="mt-4 rounded-lg bg-black/30 p-3 ring-1 ring-white/10">
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="font-semibold text-white/80">랭킹</div>
        {withTabs && !gameId && (
          <div className="inline-flex rounded-full bg-black/30 p-1 ring-1 ring-white/10">
            {(['daily', 'monthly', 'alltime'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTab(s)}
                className={`rounded-full px-3 py-1 text-xs ${
                  tab === s
                    ? 'bg-brand-primary text-white'
                    : 'text-white/70 hover:bg-black/40'
                }`}
              >
                {s === 'daily' ? '일간' : s === 'monthly' ? '월간' : '전체'}
              </button>
            ))}
          </div>
        )}
      </div>
      <ol className="space-y-1">
        {items.slice(0, 10).map((it, idx) => (
          <li
            key={`${it.userId}-${idx}`}
            className="flex items-center justify-between text-sm text-white/90"
          >
            <span className="text-white/70">{idx + 1}.</span>
            <span className="mx-2 flex-1 truncate text-left">
              {it.nickname ?? it.userId}
            </span>
            <span className="font-semibold">{it.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
