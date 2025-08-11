import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import menuList from '@/assets/menu.json';
import { gameSettingsAtom } from '@/stores/modeAtom';
import { cn } from '@/utils/cn';
import { vibrate } from '@/utils/haptics';
import { calcMatchDelta, calcRoundDelta, SOLO_SCORING, SPEED_SCORING, } from '@/utils/scoring';
import { playClick, playFail, playSuccess, prepareSfx } from '@/utils/sfx';
function shuffle(input) {
    const arr = input.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}
function sample(arr, count) {
    return shuffle(arr).slice(0, Math.min(count, arr.length));
}
const COLS = 3;
const ROWS = 4;
export function MemoryGame({ onRoundClear, totalRounds, currentRound, score, onScoreChange, onRoundBreakdown, }) {
    const settings = useAtomValue(gameSettingsAtom);
    const menus = useMemo(() => menuList, []);
    const round = currentRound ?? 1;
    const [tiles, setTiles] = useState([]);
    const [locked, setLocked] = useState(false);
    const [revealed, setRevealed] = useState([]); // indices
    const [combo, setCombo] = useState(0);
    const [roundMatch, setRoundMatch] = useState(0);
    const [roundWrong, setRoundWrong] = useState(0);
    const [roundCombo, setRoundCombo] = useState(0);
    const [roundStartTs, setRoundStartTs] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    useEffect(() => {
        prepareSfx(0.5);
    }, []);
    const initRound = useCallback(() => {
        // 메뉴를 랜덤으로 선택 후 두 번씩 복제하여 구성
        const picked = sample(menus, (COLS * ROWS) / 2);
        const tilesNew = shuffle(picked
            .flatMap((m) => [
            { key: m.id, name: m.name },
            { key: m.id, name: m.name },
        ])
            .map((m, idx) => ({
            id: idx,
            key: m.key,
            name: m.name,
            state: 'hidden',
        })));
        setTiles(tilesNew);
        setRevealed([]);
        setLocked(false);
        const now = performance.now();
        setRoundStartTs(now);
        setElapsedMs(0);
    }, [menus]);
    useEffect(() => {
        initRound();
    }, [initRound, currentRound]);
    // 라운드 타이머 (0부터 1/10초 단위로 표시)
    useEffect(() => {
        const id = window.setInterval(() => {
            setElapsedMs((ms) => ms + 100);
        }, 100);
        return () => clearInterval(id);
    }, [roundStartTs]);
    const onClickTile = useCallback((idx) => {
        if (locked)
            return;
        const t = tiles[idx];
        if (!t || t.state !== 'hidden')
            return;
        playClick();
        const nextTiles = tiles.slice();
        nextTiles[idx] = { ...t, state: 'revealed' };
        const nextRevealed = [...revealed, idx];
        setTiles(nextTiles);
        setRevealed(nextRevealed);
        if (nextRevealed.length === 2) {
            setLocked(true);
            const [a, b] = nextRevealed;
            const ta = nextTiles[a];
            const tb = nextTiles[b];
            if (ta && tb && ta.key === tb.key && a !== b) {
                // 성공
                setTimeout(() => {
                    const matched = nextTiles.slice();
                    matched[a] = { ...ta, state: 'matched' };
                    matched[b] = { ...tb, state: 'matched' };
                    setTiles(matched);
                    setRevealed([]);
                    setLocked(false);
                    setCombo((c) => c + 1);
                    const cfg = settings.mode === 'speed' ? SPEED_SCORING : SOLO_SCORING;
                    onScoreChange((s) => Math.max(0, s + calcMatchDelta(cfg, true, combo + 1)));
                    // 상세 집계
                    setRoundMatch((v) => v + cfg.matchBase);
                    setRoundCombo((v) => v +
                        Math.max(0, calcMatchDelta(cfg, true, combo + 1) - cfg.matchBase));
                    vibrate([10, 20, 10]);
                    playSuccess();
                    // 라운드 완료 체크
                    if (matched.every((t2) => t2.state === 'matched')) {
                        const cfg2 = settings.mode === 'speed' ? SPEED_SCORING : SOLO_SCORING;
                        const roundDelta = calcRoundDelta(cfg2, elapsedMs);
                        const nextScore = Math.max(0, score + roundDelta);
                        onScoreChange(nextScore);
                        const timePenalty = -cfg2.timePenaltyPerSec *
                            Math.max(0, Math.floor(elapsedMs / 1000));
                        onRoundBreakdown?.({
                            matchPoints: roundMatch,
                            wrongPoints: roundWrong,
                            comboPoints: roundCombo,
                            timePenalty,
                            roundBonus: cfg2.roundClearBonus,
                            totalDelta: roundDelta + roundMatch + roundWrong + roundCombo,
                        });
                        onRoundClear?.({ round, elapsedMs, score: nextScore });
                        setCombo(0);
                        setRoundMatch(0);
                        setRoundWrong(0);
                        setRoundCombo(0);
                    }
                }, 220);
            }
            else {
                // 실패
                setTimeout(() => {
                    const restored = nextTiles.slice();
                    for (const i of nextRevealed) {
                        const cur = restored[i];
                        if (cur)
                            restored[i] = { ...cur, state: 'hidden' };
                    }
                    setTiles(restored);
                    setRevealed([]);
                    setLocked(false);
                    setCombo(0);
                    const cfg = settings.mode === 'speed' ? SPEED_SCORING : SOLO_SCORING;
                    onScoreChange((s) => Math.max(0, s + calcMatchDelta(cfg, false, 0)));
                    setRoundWrong((v) => v + cfg.wrongPenalty);
                    vibrate(30);
                    playFail();
                }, 600);
            }
        }
    }, [
        locked,
        revealed,
        tiles,
        settings.mode,
        combo,
        elapsedMs,
        onRoundBreakdown,
        onRoundClear,
        onScoreChange,
        round,
        score,
        roundMatch,
        roundWrong,
        roundCombo,
    ]);
    return (_jsxs("div", { className: "mx-auto w-full max-w-sm select-none p-3", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between text-sm text-slate-600", children: [_jsxs("span", { className: "pill", children: ["Score: ", score] }), _jsxs("span", { className: "pill", children: ["Round: ", round, "/", totalRounds ?? settings.rounds] }), _jsxs("span", { className: "pill", children: [(elapsedMs / 1000).toFixed(1), "s"] })] }), _jsx("div", { className: cn('grid gap-3', `grid-cols-${COLS}`), children: tiles.map((t, i) => {
                    const isOpen = t.state !== 'hidden';
                    const imgUrl = `/images/${t.key}.jpg`;
                    return (_jsxs("button", { type: "button", onClick: () => onClickTile(i), className: `group relative rounded-2xl bg-white ring-1 ring-slate-200 shadow transition focus:outline-none focus:ring-2 focus:ring-brand-primary ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`, disabled: locked, children: [_jsx("div", { className: "overflow-hidden rounded-2xl", children: _jsx("div", { className: "aspect-square w-full overflow-hidden", children: isOpen ? (_jsx("img", { src: imgUrl, alt: t.name, className: "h-full w-full object-cover", draggable: false })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center bg-slate-100 text-slate-400", children: "\u2728" })) }) }), t.state === 'matched' && (_jsx("div", { className: "absolute right-0 bottom-0 left-0 line-clamp-2 w-full rounded-b-2xl bg-black/50 py-1 text-center font-bold text-[10px] text-white", children: t.name })), _jsx("div", { className: `pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-transparent transition group-hover:ring-slate-200 ${t.state === 'matched' ? 'ring-emerald-400/40' : ''}` })] }, t.id));
                }) })] }));
}
