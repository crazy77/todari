import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState as useReactState, useRef, useState } from 'react';
import {
  connectSocket,
  joinRoom,
  offRoomClosed,
  onRoomClosed,
  socket,
} from '@/game/socket';
import { useSpeedSettingsSync } from '@/hooks/useSpeedSettingsSync';
import { gameReadyAtom } from '@/stores/gameAtom';
import { sessionAtom } from '@/stores/sessionPersist';
import {
  appStateAtom,
  currentRoomIdAtom,
  currentRoundAtom,
  selectedModeAtom,
  speedSettingsAtom,
  totalRoundsAtom,
  waitingMembersAtom,
} from '@/stores/uiStateAtom';
import { KakaoLoginButton } from '@/ui/auth/KakaoLoginButton';
import { ChatPanel } from '@/ui/chat/ChatPanel';
import { EmojiPicker } from '@/ui/chat/EmojiPicker';
import { LobbyInfo } from '@/ui/components/LobbyInfo';
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
  const [appState, setAppState] = useAtom(appStateAtom);
  const [mode, setMode] = useAtom(selectedModeAtom);
  const [round, setRound] = useAtom(currentRoundAtom);
  const [totalRoundsValue, setTotalRounds] = useAtom(totalRoundsAtom);
  const [waitingMembers, setWaitingMembers] = useAtom(waitingMembersAtom);
  const [currentRoomId, setGlobalRoomId] = useAtom(currentRoomIdAtom);
  const [speedSettings] = useAtom(speedSettingsAtom);
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  const participants = waitingMembers.length;
  useSpeedSettingsSync();

  useEffect(() => {
    // 앱 구동 시 소켓 연결 보장 + 게임 준비 플래그
    connectSocket();
    setGameReady(true);
  }, []);

  // current-room 수신하여 현재 활성 룸 갱신
  useEffect(() => {
    function onCurrentRoom({ roomId }: { roomId: string }) {
      if (appState === 'menu' || appState === 'waiting') {
        setGlobalRoomId(roomId);
        try {
          socket.emit('watch-room', { roomId });
        } catch {}
        // 대기 화면이라면 자동으로 방에 조인하여 인원 수 집계에 반영
        if (appState === 'waiting' && mode === 'speed') {
          joinRoom(roomId, {
            userId: getClientId(),
            nickname: session.nickname,
            avatar: session.profileImageUrl,
          });
        }
      }
    }
    socket.on('current-room', onCurrentRoom);
    return () => {
      socket.off('current-room', onCurrentRoom);
    };
  }, [appState, setGlobalRoomId]);

  // settings는 MemoryGame 내부에서 사용

  // 4) 카카오 로그인된 사용자는 닉네임 입력 없이 바로 메뉴로 이동
  const session = useAtomValue(sessionAtom);
  useEffect(() => {
    if (session.nickname && appState === 'auth') {
      setAppState('menu');
    }
  }, [session, appState, setAppState]);
  // 준비 OFF 또는 서버가 룸 종료를 브로드캐스트하면 모든 클라가 일괄 대기방에서 나감
  useEffect(() => {
    function handleRoomClosed({ roomId: rid }: { roomId: string }) {
      if (currentRoomId && rid !== currentRoomId) return;
      try {
        if (currentRoomId) socket.emit('leave-room', { roomId: currentRoomId });
      } catch {}
      setWaitingMembers([]);
      setAppState('menu');
    }
    onRoomClosed(handleRoomClosed);
    return () => offRoomClosed(handleRoomClosed);
  }, [currentRoomId, setWaitingMembers, setAppState]);

  const [showResults, setShowResults] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [top3, setTop3] = useState<
    Array<{
      id: string;
      score: number;
      round: number;
      nickname?: string;
      avatar?: string;
    }>
  >([]);
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
      if (nextRound > totalRoundsValue) {
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
    setRound,
    setAppState,
    score,
    session.nickname,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableNumber = params.get('tableNumber');
    setTableNumber(tableNumber);
  }, []);

  useEffect(() => {
    function onStatus({
      roomId: rid,
      status,
    }: {
      roomId: string;
      status: 'waiting' | 'playing' | 'ended';
    }) {
      const target = currentRoomId ?? 'speed-lobby';
      if (rid !== target) return;
      setShowResults(status === 'ended');
      if (status === 'playing') setAppState('playing');
      if (status === 'waiting') setAppState('waiting');
    }
    function onMembers({
      roomId: rid,
      members,
    }: {
      roomId: string;
      members: Array<{
        id: string;
        userId?: string;
        nickname?: string;
        avatar?: string;
        tableNumber?: string | null;
      }>;
    }) {
      const target = currentRoomId ?? 'speed-lobby';
      if (rid !== target) return;
      setWaitingMembers(members);
    }
    socket.on('room-status', onStatus);
    socket.on('room-members', onMembers);
    return () => {
      socket.off('room-status', onStatus);
      socket.off('room-members', onMembers);
    };
  }, [currentRoomId, setAppState, setWaitingMembers]);

  // 진행 중 상위 3위 수신
  useEffect(() => {
    function onTop({
      roomId: id,
      top,
    }: {
      roomId: string;
      top: Array<{
        id: string;
        score: number;
        round: number;
        nickname?: string;
        avatar?: string;
        tableNumber?: string | null;
      }>;
    }) {
      const target = currentRoomId ?? 'speed-lobby';
      if (id !== target) return;
      setTop3(top);
    }
    socket.on('progress-top', onTop);
    return () => {
      socket.off('progress-top', onTop);
    };
  }, [currentRoomId]);

  // 랭킹 모달
  const [rankingOpen, setRankingOpen] = useReactState(false);

  return (
    <>
      <TopBar onOpenRanking={() => setRankingOpen(true)} />
      <div
        ref={containerRef}
        className="h-[100svh] w-full bg-brand-bg px-4 pt-14"
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
              <JoinOverlay
                tableNumber={tableNumber}
                onDone={() => setAppState('menu')}
              />
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
                    setRound(1);
                    setAppState('playing');
                  }}
                >
                  솔로 모드
                </button>
                <button
                  type="button"
                  className={cn(
                    'btn-ghost text-sm',
                    mode === 'speed' ? 'ring-2 ring-brand-primary' : '',
                  )}
                  disabled={speedSettings.speedReady === false}
                  onClick={() => {
                    setMode('speed');
                    setTotalRounds(3);
                    const rid = currentRoomId ?? 'speed-lobby';
                    joinRoom(rid, {
                      userId: getClientId(),
                      nickname: session.nickname,
                      avatar: session.profileImageUrl,
                      tableNumber,
                    });
                    setAppState('waiting');
                  }}
                >
                  스피드배틀
                </button>
              </div>
              <LobbyInfo
                rewardName={speedSettings.rewardName}
                current={participants}
                min={speedSettings.minParticipants}
              />
            </div>
          </div>
        )}

        {appState === 'waiting' && (
          <div className="grid h-full place-items-center p-5">
            <div className="card w-full max-w-sm space-y-4 p-6 text-center">
              <div className="font-extrabold text-2xl text-slate-800">
                대기 중...
              </div>
              <LobbyInfo
                rewardName={speedSettings.rewardName}
                current={participants}
                min={speedSettings.minParticipants}
              />
              <button
                type="button"
                onClick={() => {
                  if (!currentRoomId) return;
                  socket.emit('leave-room', { roomId: currentRoomId });
                  setWaitingMembers([]);
                  setAppState('menu');
                  setMode('waiting');
                }}
                className="btn-ghost inline-block"
              >
                대기방 나가기
              </button>
              <div className="grid grid-cols-3 gap-3">
                {waitingMembers.map((m) => (
                  <div key={m.id} className="soft-card p-2">
                    <div className="mx-auto h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.nickname ?? 'avatar'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          🙂
                        </div>
                      )}
                    </div>
                    <div className="mt-1 truncate text-slate-700 text-xs">
                      {m.nickname ?? m.userId ?? m.id.slice(0, 5)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-slate-500 text-xs">
                관리자가 시작하면 게임이 자동으로 시작됩니다.
              </div>
            </div>
          </div>
        )}

        {appState === 'playing' && (
          <MemoryGame
            totalRounds={totalRoundsValue}
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
            tableNumber={tableNumber}
          />
        )}

        {appState === 'playing' && mode === 'speed' && top3.length > 0 && (
          <div className="pointer-events-none fixed top-14 right-4 z-40 w-48 space-y-2">
            <div className="soft-card p-2 text-xs">
              <div className="mb-1 font-bold text-slate-700">Top 3</div>
              <div className="grid gap-1">
                {top3.map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 truncate">
                      <span className="inline-block w-4 text-center">
                        {idx + 1}
                      </span>
                      <span className="max-w-[7rem] truncate">
                        {t.nickname ?? t.id.slice(0, 5)}
                      </span>
                    </span>
                    <span className="text-slate-600">
                      {t.score} / R{t.round}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {appState === 'round-clear' && (
          <div className="grid h-full place-items-center p-5">
            <div className="modal w-full max-w-sm text-center">
              <div className="mb-2 font-extrabold text-slate-800 text-xl">
                라운드 클리어!
              </div>
              {round < totalRoundsValue ? (
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
              {round < totalRoundsValue && (
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
      {currentRoomId && (
        <>
          <ChatPanel roomId={currentRoomId} />
          <EmojiPicker roomId={currentRoomId} />
          <Scoreboard roomId={currentRoomId} />
          <ResultsScreen
            open={showResults}
            onClose={() => {
              setShowResults(false);
              setAppState('menu');
            }}
            roomId={currentRoomId}
          />
        </>
      )}
    </>
  );
}
