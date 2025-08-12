import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { connectSocket, socket } from '@/game/socket';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';
import {
  type AdminSettings,
  blockedUsersAtom,
  type LogEntry,
  logsAtom,
  logsLevelAtom,
  logsLimitAtom,
  settingsAtom,
} from '@/stores/adminAtoms';
import { cn } from '@/utils/cn';

export function AdminDashboard(): JSX.Element {
  const [connected, setConnected] = useState(false);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [logs, setLogs] = useAtom(logsAtom);
  const [logLevel, setLogLevel] = useAtom(logsLevelAtom);
  const [logLimit, setLogLimit] = useAtom(logsLimitAtom);
  const [blocked, setBlocked] = useAtom(blockedUsersAtom);
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [status, setStatus] = useState<'waiting' | 'playing' | 'ended'>(
    'waiting',
  );
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [progressTop, setProgressTop] = useState<
    Array<{
      id: string;
      score: number;
      round: number;
      nickname?: string;
      avatar?: string;
    }>
  >([]);
  const [lastResults, setLastResults] = useState<
    Array<{
      id: string;
      score: number;
      round: number;
      nickname?: string;
      avatar?: string;
    }>
  >([]);
  const [lastRewardName, setLastRewardName] = useState<string | null>(null);

  // 실시간 이벤트 구독 (훅)
  useAdminRealtime({
    currentRoom,
    setCurrentRoom,
    setCurrentCount,
    setProgressTop,
    setLastResults,
    setLastRewardName,
    setStatus,
  });

  useEffect(() => {
    // 관리자 화면 진입 시 소켓 연결 보장
    connectSocket();
    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onStartRejected = ({
      reason,
    }: {
      reason: 'not_ready' | 'not_enough_members' | 'no_room';
    }) => {
      const msg =
        reason === 'not_ready'
          ? '준비가 OFF 상태입니다. 준비 ON 후 다시 시도하세요.'
          : reason === 'not_enough_members'
            ? '최소 참여 인원 미달입니다. 인원 입장 후 시작하세요.'
            : '활성화된 룸이 없습니다. 준비 ON으로 대기방을 생성하세요.';
      // 간단 알림
      alert(msg);
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('start-rejected', onStartRejected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('start-rejected', onStartRejected);
    };
  }, []);

  // 위의 useAdminRealtime 훅이 소켓 이벤트 구독을 담당

  const onStart = () => {
    if (status !== 'waiting') return;
    if (settings.minParticipants && currentCount < settings.minParticipants) {
      alert('최소 참여 인원 미달입니다. 인원 입장 후 시작하세요.');
      return;
    }
    if (settings.speedReady === false) {
      alert('준비가 OFF 상태입니다. 준비 ON 후 다시 시도하세요.');
      return;
    }
    socket.emit('game-start', { roomId: currentRoom });
  };

  const onReadyToggle = async () => {
    // 준비 ON은 최소 참여 인원 필수
    const next = !settings.speedReady;
    if (next === true) {
      if (!settings.minParticipants || settings.minParticipants <= 0) {
        alert('준비 ON을 위해 최소 참여 인원을 먼저 설정하세요.');
        return;
      }
    }
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, speedReady: next }),
    });
    const data = await res.json();
    console.log('Log ~ onReadyToggle ~ data:', data);
    if (data?.settings) setSettings(data.settings);
  };

  const onSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Log ~ onSettingsSubmit ~ settings:', settings);
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = (await res.json()) as { settings: AdminSettings };
    console.log('Log ~ onSettingsSubmit ~ data:', data.settings);
    if (data?.settings) setSettings(data.settings);
  };

  const onGameEnd = () => {
    socket.emit('game-end', { roomId: currentRoom });
    setCurrentRoom('');
    setSettings({ ...settings, speedReady: false });
    setStatus('ended');
  };

  return (
    <div className="min-h-[100svh] w-full p-4 sm:p-6">
      <Helmet>
        <title>관리자 대시보드</title>
      </Helmet>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-extrabold text-slate-800 text-xl">
          관리자 대시보드
        </h2>
        <span
          className={cn(
            'chip',
            connected ? 'ring-emerald-300' : 'ring-rose-300',
          )}
        >
          {connected ? '소켓 연결됨' : '소켓 해제됨'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 현재 게임 */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold text-slate-700">현재 게임</div>
            <div className="text-slate-600 text-sm">
              상태:{' '}
              {status === 'waiting'
                ? '대기 중'
                : status === 'playing'
                  ? '게임 중'
                  : '종료'}
            </div>
          </div>
          <div className="mb-3 text-slate-700 text-sm">
            인원: {currentCount} / {settings.minParticipants ?? '-'}
          </div>
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2">
            {progressTop.length === 0 && (
              <div className="text-center text-slate-400 text-sm">
                랭킹 정보 없음
              </div>
            )}
            {progressTop.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block w-5 text-center">{i + 1}</span>
                  <span className="h-6 w-6 overflow-hidden rounded-full bg-slate-100">
                    {t.avatar ? (
                      <img
                        src={t.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="max-w-[8rem] truncate">
                    {t.nickname ?? t.id.slice(0, 5)}
                  </span>
                </span>
                <span className="text-slate-600">
                  {t.score} / R{t.round}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary disabled:bg-gray-300"
              disabled={
                status !== 'waiting' ||
                !settings.minParticipants ||
                currentCount < settings.minParticipants ||
                settings.speedReady === false
              }
              onClick={onStart}
            >
              시작
            </button>
            <button type="button" className="btn-ghost" onClick={onGameEnd}>
              종료
            </button>
            <button type="button" className="btn-ghost" onClick={onReadyToggle}>
              준비 {settings.speedReady ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        {/* 게임 설정 */}
        <section className="card p-4">
          <div className="mb-2 font-bold text-base text-slate-700">
            게임 설정
          </div>
          <form className="grid grid-cols-2 gap-3" onSubmit={onSettingsSubmit}>
            {[
              ['roundTimeSeconds', '라운드 시간(s)'] as const,
              ['maxRounds', '최대 라운드'] as const,
              ['baseScore', '기본 점수'] as const,
              ['timeBonus', '시간 보너스'] as const,
              ['rewardName', '보상(메뉴명/직접입력, 빈값=보상없음)'] as const,
              ['minParticipants', '최소 참여 인원'] as const,
            ].map(([k, label]) => (
              <label key={k} className="text-sm">
                <span className="mb-1 block text-slate-600">{label}</span>
                <input
                  type={k === 'rewardName' ? 'text' : 'number'}
                  value={
                    k === 'rewardName'
                      ? ((settings as Record<string, string | undefined>)[k] ??
                        '')
                      : ((settings as Record<string, number | undefined>)[k] ??
                        '')
                  }
                  onChange={(e) => {
                    const val =
                      k === 'rewardName'
                        ? e.target.value
                        : Number(e.target.value);
                    setSettings((s) => ({ ...s, [k]: val as string & number }));
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </label>
            ))}
            <div className="col-span-2">
              <button type="submit" className="btn-primary">
                저장
              </button>
            </div>
          </form>
        </section>

        {/* 직전 게임 결과 */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold text-slate-700">직전 게임 결과</div>
            <div className="text-slate-600 text-sm">
              보상: {lastRewardName ?? '없음'}
            </div>
          </div>
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2">
            {lastResults.length === 0 && (
              <div className="text-center text-slate-400 text-sm">
                데이터 없음
              </div>
            )}
            {lastResults.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block w-5 text-center">{i + 1}</span>
                  <span className="h-6 w-6 overflow-hidden rounded-full bg-slate-100">
                    {t.avatar ? (
                      <img
                        src={t.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="max-w-[8rem] truncate">
                    {t.nickname ?? t.id.slice(0, 5)}
                  </span>
                </span>
                <span className="text-slate-600">
                  {t.score} / R{t.round}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 로그 뷰어 */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold text-base text-slate-700">서버 로그</div>
            <div className="flex gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                value={logLevel}
                onChange={(e) =>
                  setLogLevel(
                    e.target.value as 'all' | 'info' | 'warn' | 'error',
                  )
                }
              >
                <option value="all">all</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>
              <input
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                type="number"
                value={logLimit}
                onChange={(e) => setLogLimit(Number(e.target.value))}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  const q = new URLSearchParams();
                  if (logLevel !== 'all') q.set('level', logLevel);
                  q.set('limit', String(logLimit));
                  const res = await fetch(`/api/admin/logs?${q.toString()}`);
                  const data = await res.json();
                  setLogs((data.logs ?? []) as LogEntry[]);
                }}
              >
                불러오기
              </button>
            </div>
          </div>
          <div className="grid max-h-64 gap-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs">
            {logs.map((l) => (
              <div
                key={`${l.ts}-${l.message}`}
                className={cn(
                  'rounded-md px-2 py-1',
                  l.level === 'error'
                    ? 'bg-rose-50 text-rose-700'
                    : l.level === 'warn'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-50 text-slate-700',
                )}
              >
                <span className="mr-2 inline-block w-12 font-bold text-[11px] uppercase">
                  {l.level}
                </span>
                <span className="text-[11px] text-slate-500">
                  {new Date(l.ts).toLocaleTimeString()}
                </span>
                <span className="ml-2">{l.message}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 차단 관리 */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold text-base text-slate-700">차단 관리</div>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                const res = await fetch('/api/admin/moderation/blocked');
                const data = await res.json();
                setBlocked((data.users ?? []) as string[]);
              }}
            >
              불러오기
            </button>
          </div>
          <div className="grid gap-2">
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const el = e.currentTarget.elements.namedItem('uid');
                const input = el instanceof HTMLInputElement ? el : null;
                const userId = (input?.value ?? '').trim();
                if (!userId) return;
                await fetch('/api/admin/moderation/block', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId }),
                });
                if (input) input.value = '';
                const res = await fetch('/api/admin/moderation/blocked');
                const data = await res.json();
                setBlocked((data.users ?? []) as string[]);
              }}
            >
              <input
                name="uid"
                placeholder="user id"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button type="submit" className="btn-primary">
                차단
              </button>
            </form>
            <div className="grid gap-1">
              {blocked.map((u) => (
                <div
                  key={u}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 text-sm"
                >
                  <span>{u}</span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      await fetch('/api/admin/moderation/unblock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: u }),
                      });
                      const res = await fetch('/api/admin/moderation/blocked');
                      const data = await res.json();
                      setBlocked((data.users ?? []) as string[]);
                    }}
                  >
                    해제
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
