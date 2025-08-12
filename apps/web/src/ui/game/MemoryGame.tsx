import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import menuList from '@/assets/menu.json';
import { socket } from '@/game/socket';
import { sessionAtom } from '@/stores/sessionPersist';
import { currentRoomIdAtom, selectedModeAtom } from '@/stores/uiStateAtom';
import { cn } from '@/utils/cn';
import { vibrate } from '@/utils/haptics';
import {
  calcMatchDelta,
  calcRoundDelta,
  SOLO_SCORING,
  SPEED_SCORING,
} from '@/utils/scoring';
import { playClick, playFail, playSuccess, prepareSfx } from '@/utils/sfx';

type TileState = 'hidden' | 'revealed' | 'matched';

type MenuItem = { id: string; name: string };
type Tile = {
  id: number;
  key: string; // menu-<n>
  name: string;
  state: TileState;
};

function shuffle<T>(input: T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
  return arr;
}

function sample<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, Math.min(count, arr.length));
}

const COLS = 2;
const ROWS = 2;

export function MemoryGame({
  onRoundClear,
  totalRounds,
  currentRound,
  score,
  onScoreChange,
  onRoundBreakdown,
  tableNumber,
}: {
  onRoundClear?: (payload: {
    round: number;
    elapsedMs: number;
    score: number;
  }) => void;
  totalRounds: number;
  currentRound?: number;
  score: number;
  onScoreChange: (next: number | ((prev: number) => number)) => void;
  onRoundBreakdown?: (data: {
    matchPoints: number;
    wrongPoints: number;
    comboPoints: number;
    timePenalty: number;
    roundBonus: number;
    totalDelta: number;
  }) => void;
  tableNumber: string | null;
}): JSX.Element {
  const mode = useAtomValue(selectedModeAtom);
  const session = useAtomValue(sessionAtom);
  const currentRoomId = useAtomValue(currentRoomIdAtom);
  const menus = useMemo(() => menuList as MenuItem[], []);

  const round = currentRound ?? 1;
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]); // indices
  const [combo, setCombo] = useState(0);
  const [roundMatch, setRoundMatch] = useState(0);
  const [roundWrong, setRoundWrong] = useState(0);
  const [roundCombo, setRoundCombo] = useState(0);
  const [roundStartTs, setRoundStartTs] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  useEffect(() => {
    prepareSfx(0.5);
  }, []);

  const initRound = useCallback(() => {
    // 메뉴를 랜덤으로 선택 후 두 번씩 복제하여 구성
    const picked = sample(menus, (COLS * ROWS) / 2);
    const tilesNew: Tile[] = shuffle(
      picked
        .flatMap((m) => [
          { key: m.id, name: m.name },
          { key: m.id, name: m.name },
        ])
        .map((m, idx) => ({
          id: idx,
          key: m.key,
          name: m.name,
          state: 'hidden' as TileState,
        })),
    );
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

  const onClickTile = useCallback(
    (idx: number) => {
      if (locked) return;
      const t = tiles[idx];
      if (!t || t.state !== 'hidden') return;
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
            const cfg = mode === 'speed' ? SPEED_SCORING : SOLO_SCORING;
            const gained = calcMatchDelta(cfg, true, combo + 1);
            const nextS = Math.max(0, score + gained);
            onScoreChange(nextS);
            // 상세 집계
            setRoundMatch((v) => v + cfg.matchBase);
            setRoundCombo(
              (v) =>
                v +
                Math.max(
                  0,
                  calcMatchDelta(cfg, true, combo + 1) - cfg.matchBase,
                ),
            );
            vibrate([10, 20, 10]);
            if (mode === 'speed') {
              const nickname = session.nickname;
              const avatar = session.profileImageUrl;
              if (!currentRoomId) return; // 룸 없는 상태에서 송신 방지
              socket.emit('progress-update', {
                roomId: currentRoomId,
                memberInfo: {
                  score: nextS,
                  round,
                  nickname,
                  avatar,
                  tableNumber,
                },
              });
            }
            playSuccess();
            // 라운드 완료 체크
            if (matched.every((t2) => t2.state === 'matched')) {
              const cfg2 = mode === 'speed' ? SPEED_SCORING : SOLO_SCORING;
              const roundDelta = calcRoundDelta(cfg2, elapsedMs);
              const nextScore = Math.max(0, score + roundDelta);
              onScoreChange(nextScore);
              const timePenalty =
                -cfg2.timePenaltyPerSec *
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
              // 스피드배틀이면 서버에 진행 상황 업데이트
              if (mode === 'speed') {
                const nickname = session.nickname;
                const avatar = session.profileImageUrl;
                if (!currentRoomId) return; // 룸 없는 상태에서 송신 방지
                socket.emit('progress-update', {
                  roomId: currentRoomId,
                  memberInfo: {
                    score: nextScore,
                    round,
                    nickname,
                    avatar,
                  },
                });
                // 최종 라운드였으면 'game-finished' 송신(최초 완주 보너스 처리 가능)
                const isLast = round >= totalRounds;
                if (isLast) {
                  socket.emit('game-finished', {
                    roomId: currentRoomId,
                    memberInfo: {
                      score: nextScore,
                      round,
                      nickname,
                      avatar,
                      tableNumber,
                    },
                  });
                }
              }
              setCombo(0);
              setRoundMatch(0);
              setRoundWrong(0);
              setRoundCombo(0);
            }
          }, 220);
        } else {
          // 실패
          setTimeout(() => {
            const restored = nextTiles.slice();
            for (const i of nextRevealed) {
              const cur = restored[i];
              if (cur) restored[i] = { ...cur, state: 'hidden' };
            }
            setTiles(restored);
            setRevealed([]);
            setLocked(false);
            setCombo(0);
            const cfg = mode === 'speed' ? SPEED_SCORING : SOLO_SCORING;
            const lost = calcMatchDelta(cfg, false, 0);
            const nextS2 = Math.max(0, score + lost);
            onScoreChange(nextS2);
            setRoundWrong((v) => v + cfg.wrongPenalty);
            vibrate(30);
            playFail();
            if (mode === 'speed') {
              const nickname = session.nickname;
              const avatar = session.profileImageUrl;
              if (!currentRoomId) return; // 룸 없는 상태에서 송신 방지
              socket.emit('progress-update', {
                roomId: currentRoomId,
                memberInfo: {
                  score: nextS2,
                  round,
                  nickname,
                  avatar,
                  tableNumber,
                },
              });
            }
          }, 600);
        }
      }
    },
    [
      locked,
      revealed,
      tiles,
      mode,
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
    ],
  );

  return (
    <div className="mx-auto w-full max-w-sm select-none p-3">
      <div className="mb-3 flex items-center justify-between text-slate-600 text-sm">
        <span className="pill">Score: {score}</span>
        <span className="pill">
          Round: {round}/{totalRounds}
        </span>
        <span className="pill">{(elapsedMs / 1000).toFixed(1)}s</span>
      </div>
      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          // 모바일 기본 3열, 넓은 폭에서 4열
          `grid-cols-${COLS} sm:grid-cols-4`,
        )}
        style={{
          // 상하 여백을 가로폭 기준으로 살짝 가변 적용하여 밀도 조정
          rowGap: 'min(1rem, 3.5vw)',
        }}
      >
        {tiles.map((t, i) => {
          const isOpen = t.state !== 'hidden';
          const imgUrl = `/images/${t.key}.jpg`;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onClickTile(i)}
              className={`group relative rounded-2xl bg-white shadow ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              }`}
              disabled={locked}
            >
              <div className="overflow-hidden rounded-2xl">
                <div className="aspect-square w-full overflow-hidden">
                  {isOpen ? (
                    <img
                      src={imgUrl}
                      alt={t.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      ✨
                    </div>
                  )}
                </div>
              </div>
              {t.state === 'matched' && (
                <div className="absolute right-0 bottom-0 left-0 line-clamp-2 w-full rounded-b-2xl bg-black/50 py-1 text-center font-bold text-[10px] text-white">
                  {t.name}
                </div>
              )}
              {/* 테두리 강조 */}
              <div
                className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-transparent transition group-hover:ring-slate-200 ${
                  t.state === 'matched' ? 'ring-emerald-400/40' : ''
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
