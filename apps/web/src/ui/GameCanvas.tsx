import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState as useReactState, useRef, useState } from 'react';
import { socket } from '@/game/socket';
import { gameReadyAtom } from '@/stores/gameAtom';
import { gameSettingsAtom } from '@/stores/modeAtom';
import { sessionPersistAtom } from '@/stores/sessionPersist';
import {
  appStateAtom,
  currentRoundAtom,
  participantsAtom,
  selectedModeAtom,
  totalRoundsAtom,
} from '@/stores/uiStateAtom';
import { KakaoLoginButton } from '@/ui/auth/KakaoLoginButton';
import { ChatPanel } from '@/ui/chat/ChatPanel';
import { EmojiPicker } from '@/ui/chat/EmojiPicker';
import { MemoryGame } from '@/ui/game/MemoryGame';
import { JoinOverlay } from '@/ui/join/JoinOverlay';
import { RankingBoard } from '@/ui/results/RankingBoard';
import { ResultsScreen } from '@/ui/results/ResultsScreen';
import { Scoreboard } from '@/ui/results/Scoreboard';
import { TopBar } from '@/ui/TopBar';
import { getClientId } from '@/utils/clientId';
import { cn } from '@/utils/cn';

export function GameCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setGameReady = useSetAtom(gameReadyAtom);
  const _settings = useAtomValue(gameSettingsAtom);
  const [appState, setAppState] = useAtom(appStateAtom);
  const [mode, setMode] = useAtom(selectedModeAtom);
  const [round, setRound] = useAtom(currentRoundAtom);
  const [totalRoundsValue, setTotalRounds] = useAtom(totalRoundsAtom);
  const participants = useAtomValue(participantsAtom);

  useEffect(() => {
    // Phaser 제거: React 전용 게임으로 전환
    setGameReady(true);
  }, []);
  // settings는 MemoryGame 내부에서 사용

  // 4) 카카오 로그인된 사용자는 닉네임 입력 없이 바로 메뉴로 이동
  const session = useAtomValue(sessionPersistAtom);
  useEffect(() => {
    if (session.nickname && appState === 'auth') {
      setAppState('menu');
    }
  }, [session, appState, setAppState]);

  const [overlay, setOverlay] = useState<JSX.Element | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState<{
    matchPoints: number;
    wrongPoints: number;
    comboPoints: number;
    timePenalty: number;
    roundBonus: number;
    totalDelta: number;
  } | null>(null);

  // 카운트다운이 0이 되는 즉시 다음 라운드로 전환 (최종 라운드면 점수 제출 후 게임오버)
  useEffect(() => {
    if (appState !== 'round-clear') return;
    if (countdown === 0) {
      if (countdownTimerRef.current)
        window.clearInterval(countdownTimerRef.current);
      const nextRound = round + 1;
      if (nextRound > (totalRoundsValue || _settings.rounds)) {
        (async () => {
          try {
            const cid = getClientId();
            await fetch('/api/ranking/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: cid,
                nickname: session.nickname,
                score,
              }),
            });
          } catch {}
          setAppState('game-over');
        })();
      } else {
        setRound(nextRound);
        setAppState('playing');
      }
    }
  }, [
    countdown,
    appState,
    round,
    totalRoundsValue,
    _settings.rounds,
    setRound,
    setAppState,
    score,
    session.nickname,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (!room) return;
    setRoomId(room);
    setOverlay(
      <JoinOverlay
        roomId={room}
        onDone={() => {
          setOverlay(null);
        }}
      />,
    );
  }, []);

  useEffect(() => {
    function onStatus({
      roomId: id,
      status,
    }: {
      roomId: string;
      status: 'waiting' | 'playing' | 'ended';
    }) {
      if (roomId !== id) return;
      setShowResults(status === 'ended');
    }
    socket.on('room-status', onStatus);
    return () => {
      socket.off('room-status', onStatus);
    };
  }, [roomId]);

  // 랭킹 모달
  const [rankingOpen, setRankingOpen] = useReactState(false);

  return (
    <>
      <TopBar onOpenRanking={() => setRankingOpen(true)} />
      <div
        ref={containerRef}
        className="h-[100svh] w-full pt-14 px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }}
      >
        {appState === 'auth' && (
          <div className="grid h-full place-items-center p-5">
            <div className="card w-full max-w-sm space-y-4 p-6 text-center">
              <div className="font-extrabold text-2xl text-slate-800">
                todari
              </div>
              <KakaoLoginButton />
              <div className="text-slate-500 text-sm">또는</div>
              {/* roomId가 없을 때는 소켓에 join하지 않도록 처리 */}
              <JoinOverlay roomId={''} onDone={() => setAppState('menu')} />
            </div>
          </div>
        )}

        {appState === 'menu' && (
          <div className="grid h-full place-items-center p-5">
            <div className="card w-full max-w-sm space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className={cn(
                    'btn-ghost text-sm',
                    mode === 'solo' ? 'ring-2 ring-brand-primary' : '',
                  )}
                  onClick={() => {
                    setMode('solo');
                    setTotalRounds(3);
                  }}
                >
                  솔로
                </button>
                <button
                  type="button"
                  className={cn(
                    'btn-ghost text-sm',
                    mode === 'speed' ? 'ring-2 ring-brand-primary' : '',
                  )}
                  onClick={() => {
                    setMode('speed');
                    setTotalRounds(3);
                  }}
                >
                  스피드배틀
                </button>
              </div>
              {mode === 'speed' && (
                <div className="text-center text-slate-600 text-sm">
                  참가자: {participants}명
                </div>
              )}
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  setRound(1);
                  setAppState('playing');
                }}
              >
                시작
              </button>
            </div>
          </div>
        )}

        {appState === 'playing' && (
          <MemoryGame
            totalRounds={totalRoundsValue || _settings.rounds}
            currentRound={round}
            score={score}
            onScoreChange={setScore}
            onRoundBreakdown={(b) => setBreakdown(b)}
            onRoundClear={() => {
              setAppState('round-clear');
              setCountdown(3);
              if (countdownTimerRef.current)
                window.clearInterval(countdownTimerRef.current);
              const id = window.setInterval(() => {
                setCountdown((c) => (c && c > 0 ? c - 1 : 0));
              }, 1000);
              countdownTimerRef.current = id;
            }}
          />
        )}

        {appState === 'round-clear' && (
          <div className="grid h-full place-items-center p-5">
            <div className="modal w-full max-w-sm text-center">
              <div className="mb-2 font-extrabold text-slate-800 text-xl">
                라운드 클리어!
              </div>
              {round < (totalRoundsValue || _settings.rounds) ? (
                <div className="text-slate-500">
                  다음 라운드로 이동합니다...
                </div>
              ) : (
                <div className="text-slate-500">최종 점수 요약</div>
              )}
              {breakdown && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700 text-sm">
                  <div className="text-left">맞춘 점수</div>
                  <div className="text-right">{breakdown.matchPoints}</div>
                  <div className="text-left">틀린 점수</div>
                  <div className="text-right">{breakdown.wrongPoints}</div>
                  <div className="text-left">콤보 점수</div>
                  <div className="text-right">{breakdown.comboPoints}</div>
                  <div className="text-left">시간 점수</div>
                  <div className="text-right">{breakdown.timePenalty}</div>
                  <div className="text-left">라운드 보너스</div>
                  <div className="text-right">{breakdown.roundBonus}</div>
                  <div className="text-left font-semibold">합계</div>
                  <div className="text-right font-semibold">
                    {breakdown.totalDelta}
                  </div>
                </div>
              )}
              {round < (totalRoundsValue || _settings.rounds) && (
                <div className="mt-2 font-extrabold text-4xl text-slate-800">
                  {countdown ?? ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 카운트다운 종료 시 다음 라운드로 전환 */}
        {/* 0이 되는 즉시 전환되도록 별도 effect로 처리 */}

        {(appState === 'game-over' || rankingOpen) && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4">
            <div className="modal">
              {rankingOpen && appState !== 'game-over' && (
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => setRankingOpen(false)}
                  className="btn-ghost absolute top-2 right-2 px-2 py-1"
                >
                  ✕
                </button>
              )}
              <div className="mb-2 font-extrabold text-slate-800 text-xl">
                {appState === 'game-over' ? '게임 종료' : '랭킹'}
              </div>
              {appState === 'game-over' && (
                <div className="text-slate-600 text-sm">최종 점수: {score}</div>
              )}
              {/* 솔로 모드: 일간/월간/전체 */}
              {mode === 'solo' ? (
                <RankingBoard withTabs scope="daily" />
              ) : (
                // 스피드 배틀: 게임별 랭킹
                <RankingBoard
                  scope="daily"
                  gameId={`speed-${Date.now().toString().slice(0, 8)}`}
                />
              )}
              <div className="mt-3 flex gap-2">
                {appState === 'game-over' ? (
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => setAppState('menu')}
                  >
                    게임 선택 화면으로
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => setRankingOpen(false)}
                  >
                    닫기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {overlay}
      {roomId && (
        <>
          <ChatPanel roomId={roomId} />
          <EmojiPicker roomId={roomId} />
          <Scoreboard roomId={roomId} />
          <ResultsScreen
            open={showResults}
            onClose={() => setShowResults(false)}
            roomId={roomId}
          />
        </>
      )}
    </>
  );
}
