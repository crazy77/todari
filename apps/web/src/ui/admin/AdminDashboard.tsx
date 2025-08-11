import { useEffect, useState } from 'react';
import { socket } from '@/game/socket';

export function AdminDashboard(): JSX.Element {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [online, setOnline] = useState(0);
  const [rooms, setRooms] = useState<{ id: string; status: string }[]>([]);

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
    function onStatus({ roomId: id, status }: { roomId: string; status: 'waiting'|'playing'|'ended' }) {
      if (roomId && id !== roomId) return;
      setRoomStatus(status);
    }
    // @ts-expect-error demo typing
    socket.on('room-status', onStatus);
    return () => {
      // @ts-expect-error demo typing
      socket.off('room-status', onStatus);
    };
  }, [roomId]);

  return (
    <div style={{ position: 'fixed', inset: 0, padding: 16, background: '#0b0b0b', color: '#fff' }}>
      <h2 style={{ marginTop: 0 }}>관리자 대시보드 (스켈레톤)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))', gap: 12 }}>
        <section style={{ background: '#151515', borderRadius: 8, padding: 12 }}>
          <h3>연결 상태</h3>
          <div>Socket: {connected ? '연결됨' : '해제됨'}</div>
        </section>
        <section style={{ background: '#151515', borderRadius: 8, padding: 12 }}>
          <h3>게임방 상태</h3>
          <input placeholder="room id" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
          <div>상태: {roomStatus}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => socket.emit('game-start', { roomId })}>시작</button>
            <button onClick={() => socket.emit('game-end', { roomId })}>종료</button>
            <button onClick={() => socket.emit('leave-room', { roomId })}>퇴장</button>
          </div>
        </section>
        <section style={{ background: '#151515', borderRadius: 8, padding: 12 }}>
          <h3>게임방 목록</h3>
          <button
            onClick={async () => {
              const res = await fetch('/api/admin/rooms');
              const data = await res.json();
              setRooms(data.rooms ?? []);
            }}
            style={{ marginBottom: 8 }}
          >목록 새로고침</button>
          <div style={{ display: 'grid', gap: 6 }}>
            {rooms.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span>#{r.id} — {r.status}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => fetch(`/api/admin/rooms/${r.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'playing' }) })}>시작</button>
                  <button onClick={() => fetch(`/api/admin/rooms/${r.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ended' }) })}>종료</button>
                  <button onClick={() => fetch(`/api/admin/rooms/${r.id}`, { method: 'DELETE' })}>삭제</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
