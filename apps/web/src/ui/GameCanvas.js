import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState as useReactState, useRef, useState } from 'react';
import { socket } from '@/game/socket';
import { gameReadyAtom } from '@/stores/gameAtom';
import { gameSettingsAtom } from '@/stores/modeAtom';
import { sessionPersistAtom } from '@/stores/sessionPersist';
import { appStateAtom, currentRoundAtom, participantsAtom, selectedModeAtom, totalRoundsAtom, } from '@/stores/uiStateAtom';
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
    const [overlay, setOverlay] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const countdownTimerRef = useRef(null);
    const [score, setScore] = useState(0);
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
        }
        socket.on('room-status', onStatus);
        return () => {
            socket.off('room-status', onStatus);
        };
    }, [roomId]);
    // 랭킹 모달
    const [rankingOpen, setRankingOpen] = useReactState(false);
    return (_jsxs(_Fragment, { children: [_jsx(TopBar, { onOpenRanking: () => setRankingOpen(true) }), _jsxs("div", { ref: containerRef, className: "h-[100svh] w-full pt-14 px-4", style: { paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }, children: [appState === 'auth' && (_jsx("div", { className: "grid h-full place-items-center p-5", children: _jsxs("div", { className: "card w-full max-w-sm space-y-4 p-6 text-center", children: [_jsx("div", { className: "font-extrabold text-2xl text-slate-800", children: "todari" }), _jsx(KakaoLoginButton, {}), _jsx("div", { className: "text-slate-500 text-sm", children: "\uB610\uB294" }), _jsx(JoinOverlay, { roomId: '', onDone: () => setAppState('menu') })] }) })), appState === 'menu' && (_jsx("div", { className: "grid h-full place-items-center p-5", children: _jsxs("div", { className: "card w-full max-w-sm space-y-4 p-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("button", { type: "button", className: cn('btn-ghost text-sm', mode === 'solo' ? 'ring-2 ring-brand-primary' : ''), onClick: () => {
                                                setMode('solo');
                                                setTotalRounds(3);
                                            }, children: "\uC194\uB85C" }), _jsx("button", { type: "button", className: cn('btn-ghost text-sm', mode === 'speed' ? 'ring-2 ring-brand-primary' : ''), onClick: () => {
                                                setMode('speed');
                                                setTotalRounds(3);
                                            }, children: "\uC2A4\uD53C\uB4DC\uBC30\uD2C0" })] }), mode === 'speed' && (_jsxs("div", { className: "text-center text-slate-600 text-sm", children: ["\uCC38\uAC00\uC790: ", participants, "\uBA85"] })), _jsx("button", { type: "button", className: "btn-primary w-full", onClick: () => {
                                        setRound(1);
                                        setAppState('playing');
                                    }, children: "\uC2DC\uC791" })] }) })), appState === 'playing' && (_jsx(MemoryGame, { totalRounds: totalRoundsValue || _settings.rounds, currentRound: round, score: score, onScoreChange: setScore, onRoundBreakdown: (b) => setBreakdown(b), onRoundClear: () => {
                            setAppState('round-clear');
                            setCountdown(3);
                            if (countdownTimerRef.current)
                                window.clearInterval(countdownTimerRef.current);
                            const id = window.setInterval(() => {
                                setCountdown((c) => (c && c > 0 ? c - 1 : 0));
                            }, 1000);
                            countdownTimerRef.current = id;
                        } })), appState === 'round-clear' && (_jsx("div", { className: "grid h-full place-items-center p-5", children: _jsxs("div", { className: "modal w-full max-w-sm text-center", children: [_jsx("div", { className: "mb-2 font-extrabold text-slate-800 text-xl", children: "\uB77C\uC6B4\uB4DC \uD074\uB9AC\uC5B4!" }), round < (totalRoundsValue || _settings.rounds) ? (_jsx("div", { className: "text-slate-500", children: "\uB2E4\uC74C \uB77C\uC6B4\uB4DC\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4..." })) : (_jsx("div", { className: "text-slate-500", children: "\uCD5C\uC885 \uC810\uC218 \uC694\uC57D" })), breakdown && (_jsxs("div", { className: "mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700 text-sm", children: [_jsx("div", { className: "text-left", children: "\uB9DE\uCD98 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.matchPoints }), _jsx("div", { className: "text-left", children: "\uD2C0\uB9B0 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.wrongPoints }), _jsx("div", { className: "text-left", children: "\uCF64\uBCF4 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.comboPoints }), _jsx("div", { className: "text-left", children: "\uC2DC\uAC04 \uC810\uC218" }), _jsx("div", { className: "text-right", children: breakdown.timePenalty }), _jsx("div", { className: "text-left", children: "\uB77C\uC6B4\uB4DC \uBCF4\uB108\uC2A4" }), _jsx("div", { className: "text-right", children: breakdown.roundBonus }), _jsx("div", { className: "text-left font-semibold", children: "\uD569\uACC4" }), _jsx("div", { className: "text-right font-semibold", children: breakdown.totalDelta })] })), round < (totalRoundsValue || _settings.rounds) && (_jsx("div", { className: "mt-2 font-extrabold text-4xl text-slate-800", children: countdown ?? '' }))] }) })), (appState === 'game-over' || rankingOpen) && (_jsx("div", { className: "fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4", children: _jsxs("div", { className: "modal", children: [rankingOpen && appState !== 'game-over' && (_jsx("button", { type: "button", "aria-label": "\uB2EB\uAE30", onClick: () => setRankingOpen(false), className: "btn-ghost absolute top-2 right-2 px-2 py-1", children: "\u2715" })), _jsx("div", { className: "mb-2 font-extrabold text-slate-800 text-xl", children: appState === 'game-over' ? '게임 종료' : '랭킹' }), appState === 'game-over' && (_jsxs("div", { className: "text-slate-600 text-sm", children: ["\uCD5C\uC885 \uC810\uC218: ", score] })), mode === 'solo' ? (_jsx(RankingBoard, { withTabs: true, scope: "daily" })) : (
                                // 스피드 배틀: 게임별 랭킹
                                _jsx(RankingBoard, { scope: "daily", gameId: `speed-${Date.now().toString().slice(0, 8)}` })), _jsx("div", { className: "mt-3 flex gap-2", children: appState === 'game-over' ? (_jsx("button", { type: "button", className: "btn-primary w-full", onClick: () => setAppState('menu'), children: "\uAC8C\uC784 \uC120\uD0DD \uD654\uBA74\uC73C\uB85C" })) : (_jsx("button", { type: "button", className: "btn-primary w-full", onClick: () => setRankingOpen(false), children: "\uB2EB\uAE30" })) })] }) }))] }), overlay, roomId && (_jsxs(_Fragment, { children: [_jsx(ChatPanel, { roomId: roomId }), _jsx(EmojiPicker, { roomId: roomId }), _jsx(Scoreboard, { roomId: roomId }), _jsx(ResultsScreen, { open: showResults, onClose: () => setShowResults(false), roomId: roomId })] }))] }));
}
