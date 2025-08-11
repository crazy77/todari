import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState as useReactState, useRef, useState } from 'react';
import { joinRoom, socket } from '@/game/socket';
import { gameReadyAtom } from '@/stores/gameAtom';
import { gameSettingsAtom } from '@/stores/modeAtom';
import { sessionPersistAtom } from '@/stores/sessionPersist';
import { appStateAtom, currentRoundAtom, selectedModeAtom, totalRoundsAtom, waitingMembersAtom, speedSettingsAtom, } from '@/stores/uiStateAtom';
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
export function GameCanvas() {
    const containerRef = useRef(null);
    const setGameReady = useSetAtom(gameReadyAtom);
    const _settings = useAtomValue(gameSettingsAtom);
    const [appState, setAppState] = useAtom(appStateAtom);
    const [mode, setMode] = useAtom(selectedModeAtom);
    const [round, setRound] = useAtom(currentRoundAtom);
    const [totalRoundsValue, setTotalRounds] = useAtom(totalRoundsAtom);
    const [waitingMembers, setWaitingMembers] = useAtom(waitingMembersAtom);
    const [speedSettings, setSpeedSettings] = useAtom(speedSettingsAtom);
    const participants = waitingMembers.length;
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
    const [overlay, setOverlay] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const countdownTimerRef = useRef(null);
    const [score, setScore] = useState(0);
    const [top3, setTop3] = useState([]);
    const [breakdown, setBreakdown] = useState(null);
    // 카운트다운이 0이 되는 즉시 다음 라운드로 전환 (최종 라운드면 점수 제출 후 게임오버)
    useEffect(() => {
        if (appState !== 'round-clear')
            return;
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
                    }
                    catch { }
                    setAppState('game-over');
                })();
            }
            else {
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
        if (!room)
            return;
        setRoomId(room);
        setOverlay(_jsx(JoinOverlay, { roomId: room, onDone: () => {
                setOverlay(null);
            } }));
    }, []);
    useEffect(() => {
        function onStatus({ roomId: id, status, }) {
            if (roomId !== id)
                return;
            setShowResults(status === 'ended');
            if (status === 'playing')
                setAppState('playing');
            if (status === 'waiting')
                setAppState('waiting');
        }
        function onMembers({ roomId: id, members, }) {
            if (roomId !== id)
                return;
            setWaitingMembers(members);
        }
        socket.on('room-status', onStatus);
        socket.on('room-members', onMembers);
        return () => {
            socket.off('room-status', onStatus);
            socket.off('room-members', onMembers);
        };
    }, [roomId, setAppState, setWaitingMembers]);
    // 메뉴 화면에서는 주기적으로 대기방 인원/설정 조회(watch-room)
    useEffect(() => {
        if (appState !== 'menu')
            return;
        const id = window.setInterval(() => {
            try {
                socket.emit('watch-room', { roomId: 'speed-lobby' });
            }
            catch { }
        }, 2500);
        return () => window.clearInterval(id);
    }, [appState]);
    // 설정 실시간 반영
    useEffect(() => {
        function onSettings({ settings }) {
            setSpeedSettings({
                rewardName: settings.rewardName ?? null,
                minParticipants: settings.minParticipants ?? undefined,
            });
        }
        socket.on('settings-updated', onSettings);
        // 초기 1회 불러오기
        (async () => {
            try {
                const res = await fetch('/api/admin/settings');
                const data = await res.json();
                if (data?.settings)
                    onSettings({ settings: data.settings });
            }
            catch { }
        })();
        return () => { socket.off('settings-updated', onSettings); };
    }, [setSpeedSettings]);
    // 진행 중 상위 3위 수신
    useEffect(() => {
        function onTop({ roomId: id, top, }) {
            if (roomId !== id)
                return;
            setTop3(top);
        }
        socket.on('progress-top', onTop);
        return () => {
            socket.off('progress-top', onTop);
        };
    }, [roomId]);
    // 랭킹 모달
    const [rankingOpen, setRankingOpen] = useReactState(false);
    return (_jsxs(_Fragment, { children: [_jsx(TopBar, { onOpenRanking: () => setRankingOpen(true) }), _jsxs("div", { ref: containerRef, className: "h-[100svh] w-full px-4 pt-14", style: { paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }, children: [appState === 'auth' && (_jsx("div", { className: "grid h-full place-items-center p-5", children: _jsxs("div", { className: "card w-full max-w-sm space-y-4 p-6 text-center", children: [_jsx("div", { className: "font-extrabold text-2xl text-slate-800", children: "todari" }), _jsx(KakaoLoginButton, {}), _jsx("div", { className: "text-slate-500 text-sm", children: "\uB610\uB294" }), _jsx(JoinOverlay, { roomId: '', onDone: () => setAppState('menu') })] }) })), appState === 'menu' && (_jsx("div", { className: "grid h-full place-items-center p-5", children: _jsxs("div", { className: "card w-full max-w-sm space-y-4 p-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("button", { type: "button", className: cn('btn-ghost text-sm', mode === 'solo' ? 'ring-2 ring-brand-primary' : ''), onClick: () => {
                                                setMode('solo');
                                                setTotalRounds(3);
                                                setRound(1);
                                                setAppState('playing');
                                            }, children: "\uC194\uB85C" }), _jsx("button", { type: "button", className: cn('btn-ghost text-sm', mode === 'speed' ? 'ring-2 ring-brand-primary' : ''), onClick: () => {
                                                setMode('speed');
                                                setTotalRounds(3);
                                                const rid = 'speed-lobby';
                                                setRoomId(rid);
                                                joinRoom(rid, {
                                                    userId: getClientId(),
                                                    nickname: session.nickname,
                                                    avatar: session.profileImageUrl,
                                                });
                                                setAppState('waiting');
                                            }, children: "\uC2A4\uD53C\uB4DC\uBC30\uD2C0" })] }), _jsxs("div", { className: "text-center text-slate-600 text-sm", children: ["\uD604\uC7AC \uC811\uC18D: ", participants, "\uBA85"] }), _jsxs("div", { className: "text-center text-xs text-slate-500", children: ["\uBCF4\uC0C1: ", speedSettings.rewardName ?? '없음'] }), _jsxs("div", { className: "text-center text-xs text-slate-500", children: ["\uCD5C\uC18C \uC778\uC6D0: ", speedSettings.minParticipants ?? '-'] })] }) })), appState === 'waiting' && (_jsx("div", { className: "grid h-full place-items-center p-5", children: _jsxs("div", { className: "card w-full max-w-sm space-y-4 p-6 text-center", children: [_jsx("div", { className: "font-extrabold text-2xl text-slate-800", children: "\uB300\uAE30 \uC911..." }), _jsxs("div", { className: "text-slate-600 text-sm", children: ["\uD604\uC7AC \uC811\uC18D: ", participants, "\uBA85"] }), _jsx("button", { type: "button", onClick: () => {
                                        if (!roomId)
                                            return;
                                        socket.emit('leave-room', { roomId });
                                        setWaitingMembers([]);
                                        setRoomId(null);
                                        setAppState('menu');
                                    }, className: "btn-ghost inline-block", children: "\uB300\uAE30\uBC29 \uB098\uAC00\uAE30" }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: waitingMembers.map((m) => (_jsxs("div", { className: "soft-card p-2", children: [_jsx("div", { className: "mx-auto h-12 w-12 overflow-hidden rounded-full bg-slate-100", children: m.avatar ? (_jsx("img", { src: m.avatar, alt: m.nickname ?? 'avatar', className: "h-full w-full object-cover" })) : (_jsx("div", { className: "grid h-full w-full place-items-center text-slate-400", children: "\uD83D\uDE42" })) }), _jsx("div", { className: "mt-1 truncate text-slate-700 text-xs", children: m.nickname ?? m.userId ?? m.id.slice(0, 5) })] }, m.id))) }), _jsx("div", { className: "text-slate-500 text-xs", children: "\uAD00\uB9AC\uC790\uAC00 \uC2DC\uC791\uD558\uBA74 \uAC8C\uC784\uC774 \uC790\uB3D9\uC73C\uB85C \uC2DC\uC791\uB429\uB2C8\uB2E4." })] }) })), appState === 'playing' && (_jsx(MemoryGame, { totalRounds: totalRoundsValue || _settings.rounds, currentRound: round, score: score, onScoreChange: setScore, onRoundBreakdown: (b) => setBreakdown(b), onRoundClear: () => {
                            setAppState('round-clear');
                            setCountdown(3);
                            if (countdownTimerRef.current)
                                window.clearInterval(countdownTimerRef.current);
                            const id = window.setInterval(() => {
                                setCountdown((c) => (c && c > 0 ? c - 1 : 0));
                            }, 1000);
                            countdownTimerRef.current = id;
                        } })), appState === 'playing' && mode === 'speed' && top3.length > 0 && (_jsx("div", { className: "pointer-events-none fixed top-14 right-4 z-40 w-48 space-y-2", children: _jsxs("div", { className: "soft-card p-2 text-xs", children: [_jsx("div", { className: "mb-1 font-bold text-slate-700", children: "Top 3" }), _jsx("div", { className: "grid gap-1", children: top3.map((t, idx) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-2 truncate", children: [_jsx("span", { className: "inline-block w-4 text-center", children: idx + 1 }), _jsx("span", { className: "max-w-[7rem] truncate", children: t.nickname ?? t.id.slice(0, 5) })] }), _jsxs("span", { className: "text-slate-600", children: [t.score, " / R", t.round] })] }, t.id))) })] }) })), appState === 'round-clear' && (_jsx("div", { className: "grid h-full place-items-center p-5", children: _jsxs("div", { className: "modal w-full max-w-sm text-center", children: [_jsx("div", { className: "mb-2 font-extrabold text-slate-800 text-xl", children: "\uB77C\uC6B4\uB4DC \uD074\uB9AC\uC5B4!" }), round < (totalRoundsValue || _settings.rounds) ? (_jsx("div", { className: "text-slate-500", children: "\uB2E4\uC74C \uB77C\uC6B4\uB4DC\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4..." })) : (_jsx("div", { className: "text-slate-500", children: "\uCD5C\uC885 \uC810\uC218 \uC694\uC57D" })), breakdown && (_jsxs("div", { className: "mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700 text-sm", children: [_jsx("div", { className: "text-left", children: "\uB9DE\uCD98 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.matchPoints }), _jsx("div", { className: "text-left", children: "\uD2C0\uB9B0 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.wrongPoints }), _jsx("div", { className: "text-left", children: "\uCF64\uBCF4 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.comboPoints }), _jsx("div", { className: "text-left", children: "\uC2DC\uAC04 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.timePenalty }), _jsx("div", { className: "text-left", children: "\uB77C\uC6B4\uB4DC \uBCF4\uB108\uC2A4" }), _jsx("div", { className: "text-right", children: breakdown.roundBonus }), _jsx("div", { className: "text-left font-semibold", children: "\uD569\uACC4" }), _jsx("div", { className: "text-right font-semibold", children: breakdown.totalDelta })] })), round < (totalRoundsValue || _settings.rounds) && (_jsx("div", { className: "mt-2 font-extrabold text-4xl text-slate-800", children: countdown ?? '' }))] }) })), (appState === 'game-over' || rankingOpen) && (_jsx("div", { className: "fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4", children: _jsxs("div", { className: "modal", children: [rankingOpen && appState !== 'game-over' && (_jsx("button", { type: "button", "aria-label": "\uB2EB\uAE30", onClick: () => setRankingOpen(false), className: "btn-ghost absolute top-2 right-2 px-2 py-1", children: "\u2715" })), _jsx("div", { className: "mb-2 font-extrabold text-slate-800 text-xl", children: appState === 'game-over' ? '게임 종료' : '랭킹' }), appState === 'game-over' && (_jsxs("div", { className: "text-slate-600 text-sm", children: ["\uCD5C\uC885 \uC810\uC218: ", score] })), mode === 'solo' ? (_jsx(RankingBoard, { withTabs: true, scope: "daily" })) : (
                                // 스피드 배틀: 게임별 랭킹
                                _jsx(RankingBoard, { scope: "daily", gameId: `speed-${Date.now().toString().slice(0, 8)}` })), _jsx("div", { className: "mt-3 flex gap-2", children: appState === 'game-over' ? (_jsx("button", { type: "button", className: "btn-primary w-full", onClick: () => setAppState('menu'), children: "\uAC8C\uC784 \uC120\uD0DD \uD654\uBA74\uC73C\uB85C" })) : (_jsx("button", { type: "button", className: "btn-primary w-full", onClick: () => setRankingOpen(false), children: "\uB2EB\uAE30" })) })] }) }))] }), overlay, roomId && (_jsxs(_Fragment, { children: [_jsx(ChatPanel, { roomId: roomId }), _jsx(EmojiPicker, { roomId: roomId }), _jsx(Scoreboard, { roomId: roomId }), _jsx(ResultsScreen, { open: showResults, onClose: () => setShowResults(false), roomId: roomId })] }))] }));
}
