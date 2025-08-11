import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { socket } from '@/game/socket';
import {
  roomsAtom,
  settingsAtom,
  logsAtom,
  logsLevelAtom,
  logsLimitAtom,
  blockedUsersAtom,
  type AdminRoom,
  type LogEntry,
  type AdminSettings,
} from '@/stores/adminAtoms';
import { cn } from '@/utils/cn';

export function AdminDashboard(): JSX.Element {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'playing' | 'ended'>('waiting');
  const [rooms, setRooms] = useAtom(roomsAtom);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [logs, setLogs] = useAtom(logsAtom);
  const [logLevel, setLogLevel] = useAtom(logsLevelAtom);
  const [logLimit, setLogLimit] = useAtom(logsLimitAtom);
  const [blocked, setBlocked] = useAtom(blockedUsersAtom);

  useEffect(() => {
    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    function onStatus({
      roomId: id,
      status,
    }: {
      roomId: string;
      status: 'waiting' | 'playing' | 'ended';
    }) {
      if (roomId && id !== roomId) return;
      setRoomStatus(status);
    }
    socket.on('room-status', onStatus);
    return () => {
      socket.off('room-status', onStatus);
    };
  }, [roomId]);

  return (
    <div className="min-h-[100svh] w-full p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-800">관리자 대시보드</h2>
        <span className={cn('chip', connected ? 'ring-emerald-300' : 'ring-rose-300')}>{connected ? '소켓 연결됨' : '소켓 해제됨'}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 게임방 상태 제어 */}
        <section className="card p-4">
          <div className="mb-2 text-base font-bold text-slate-700">게임방 상태</div>
          <input
            className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="room id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <div className="text-sm text-slate-600">상태: {roomStatus}</div>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary" onClick={() => socket.emit('game-start', { roomId })}>시작</button>
            <button type="button" className="btn-ghost" onClick={() => socket.emit('game-end', { roomId })}>종료</button>
            <button type="button" className="btn-ghost" onClick={() => socket.emit('leave-room', { roomId })}>퇴장</button>
          </div>
        </section>

        {/* 게임 설정 */}
        <section className="card p-4">
          <div className="mb-2 text-base font-bold text-slate-700">게임 설정</div>
          <form
            className="grid grid-cols-2 gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
              });
              const data = await res.json();
              if (data?.settings) setSettings(data.settings as AdminSettings);
            }}
          >
            {(
              [
                ['roundTimeSeconds', '라운드 시간(s)'] as const,
                ['maxRounds', '최대 라운드'] as const,
                ['baseScore', '기본 점수'] as const,
                ['timeBonus', '시간 보너스'] as const,
              ]
            ).map(([k, label]) => (
              <label key={k} className="text-sm">
                <span className="mb-1 block text-slate-600">{label}</span>
                <input
                  type="number"
                  value={(settings as Record<string, number | undefined>)[k] ?? ''}
                  onChange={(e) => setSettings((s) => ({ ...s, [k]: Number(e.target.value) as number }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </label>
            ))}
            <div className="col-span-2">
              <button type="submit" className="btn-primary">저장</button>
            </div>
          </form>
        </section>

        {/* 게임방 목록 */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-base font-bold text-slate-700">게임방 목록</div>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                const res = await fetch('/api/admin/rooms');
                const data = await res.json();
                setRooms((data.rooms ?? []) as AdminRoom[]);
              }}
            >
              새로고침
            </button>
          </div>
          <div className="grid gap-2">
            {rooms.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="text-slate-700">#{r.id} — {r.status}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      fetch(`/api/admin/rooms/${r.id}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'playing' }),
                      })
                    }
                  >
                    시작
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      fetch(`/api/admin/rooms/${r.id}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'ended' }),
                      })
                    }
                  >
                    종료
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => fetch(`/api/admin/rooms/${r.id}`, { method: 'DELETE' })}
                  >
                    삭제
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 로그 뷰어 */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-base font-bold text-slate-700">서버 로그</div>
            <div className="flex gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value as 'all' | 'info' | 'warn' | 'error')}
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
              <div key={`${l.ts}-${l.message}`} className={cn('rounded-md px-2 py-1', l.level === 'error' ? 'bg-rose-50 text-rose-700' : l.level === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-700')}>
                <span className="mr-2 inline-block w-12 text-[11px] font-bold uppercase">{l.level}</span>
                <span className="text-[11px] text-slate-500">{new Date(l.ts).toLocaleTimeString()}</span>
                <span className="ml-2">{l.message}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 차단 관리 */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-base font-bold text-slate-700">차단 관리</div>
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
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
                });
                if (input) input.value = '';
                const res = await fetch('/api/admin/moderation/blocked');
                const data = await res.json();
                setBlocked((data.users ?? []) as string[]);
              }}
            >
              <input name="uid" placeholder="user id" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
              <button type="submit" className="btn-primary">차단</button>
            </form>
            <div className="grid gap-1">
              {blocked.map((u) => (
                <div key={u} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <span>{u}</span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      await fetch('/api/admin/moderation/unblock', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u }),
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
