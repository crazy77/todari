import { useEffect, useState } from 'react';
import { socket } from '@/game/socket';

export function AdminDashboard(): JSX.Element {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [online, setOnline] = useState(0);

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
          <h3>접속자</h3>
          <div>온라인 수(룸 기준 스텁): {online}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>추후: 서버 집계 API/Socket 이벤트 연동</div>
        </section>
      </div>
    </div>
  );
}
