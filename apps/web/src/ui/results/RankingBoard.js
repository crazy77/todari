import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export function RankingBoard({ scope = 'daily', gameId, withTabs = false, }) {
    const [items, setItems] = useState([]);
    const [tab, setTab] = useState(scope);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
                if (!res.ok)
                    throw new Error('failed');
                const json = await res.json();
                if (!alive)
                    return;
                setItems(json.items ?? []);
            }
            catch {
                if (!alive)
                    return;
                setError('랭킹을 불러오지 못했습니다');
            }
            finally {
                if (alive)
                    setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [scope, gameId, tab, withTabs]);
    if (loading)
        return _jsx("div", { className: "text-white/70", children: "\uBD88\uB7EC\uC624\uB294 \uC911..." });
    if (error)
        return (_jsxs("div", { className: "text-red-400 text-sm", children: [error, _jsx("button", { type: "button", onClick: () => {
                        // 간단한 재시도
                        setError(null);
                        setLoading(true);
                    }, className: "ml-2 rounded bg-red-400/20 px-2 py-0.5 text-white/90", children: "\uC7AC\uC2DC\uB3C4" })] }));
    return (_jsxs("div", { className: "mt-4 rounded-lg bg-black/30 p-3 ring-1 ring-white/10", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between text-sm", children: [_jsx("div", { className: "font-semibold text-white/80", children: "\uB7AD\uD0B9" }), withTabs && !gameId && (_jsx("div", { className: "inline-flex rounded-full bg-black/30 p-1 ring-1 ring-white/10", children: ['daily', 'monthly', 'alltime'].map((s) => (_jsx("button", { type: "button", onClick: () => setTab(s), className: `rounded-full px-3 py-1 text-xs ${tab === s
                                ? 'bg-brand-primary text-white'
                                : 'text-white/70 hover:bg-black/40'}`, children: s === 'daily' ? '일간' : s === 'monthly' ? '월간' : '전체' }, s))) }))] }), _jsx("ol", { className: "space-y-1", children: items.slice(0, 10).map((it, idx) => (_jsxs("li", { className: "flex items-center justify-between text-sm text-white/90", children: [_jsxs("span", { className: "text-white/70", children: [idx + 1, "."] }), _jsx("span", { className: "mx-2 flex-1 truncate text-left", children: it.nickname ?? it.userId }), _jsx("span", { className: "font-semibold", children: it.score })] }, `${it.userId}-${idx}`))) })] }));
}
