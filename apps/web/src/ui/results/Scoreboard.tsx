import { useEffect, useMemo, useState } from 'react';
import { socket } from '@/game/socket';

export function Scoreboard({ roomId }: { roomId: string }): JSX.Element {
  console.log('Log ~ Scoreboard ~ roomId:', roomId);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    function onState({
      state,
    }: {
      state: { scoreBoard: Record<string, number> };
    }) {
      if (!state?.scoreBoard) return;
      setScores(state.scoreBoard);
    }
    socket.on('state-sync', onState);
    return () => {
      socket.off('state-sync', onState);
    };
  }, []);

  const rows = useMemo(
    () => Object.entries(scores).sort((a, b) => b[1] - a[1]),
    [scores],
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        borderRadius: 8,
        padding: 8,
        width: 160,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>순위표</div>
      {rows.map(([id, score], idx) => (
        <div
          key={id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
          }}
        >
          <span>
            #{idx + 1} {id.slice(0, 4)}
          </span>
          <span>{score}</span>
        </div>
      ))}
    </div>
  );
}
