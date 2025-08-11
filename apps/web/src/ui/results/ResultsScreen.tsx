import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { socket } from '@/game/socket';
import { ShareButtons } from '@/ui/results/ShareButtons';

export type PlayerStat = {
  id: string;
  nickname?: string;
  score: number;
  accuracy?: number;
  speed?: number;
};

import { submitFinalScore } from '@/utils/scoreSubmit';

export function ResultsScreen({
  open,
  onClose,
  roomId,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string;
}): JSX.Element | null {
  const [players, setPlayers] = useState<PlayerStat[]>([]);

  useEffect(() => {
    function onState({
      state,
    }: {
      state: { scoreBoard: Record<string, number> };
    }) {
      if (!state?.scoreBoard) return;
      const list: PlayerStat[] = Object.entries(state.scoreBoard).map(
        ([id, score]) => ({ id, score: Number(score) }),
      );
      setPlayers(list);
    }
    socket.on('state-sync', onState);
    return () => {
      socket.off('state-sync', onState);
    };
  }, []);

  const sorted = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players],
  );
  const mvp = sorted[0];

  useEffect(() => {
    if (!open || !mvp) return;
    // 임시: 최고 점수 제출. 추후 개인점수/개별 제출로 교체 가능
    void submitFinalScore(roomId, mvp.score);
  }, [open, mvp, roomId]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          color: '#fff',
          borderRadius: 12,
          width: 320,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid #333' }}>
          <h3 style={{ margin: 0 }}>결과</h3>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            {dayjs().format('YYYY.MM.DD HH:mm')}
          </div>
        </div>
        {mvp && (
          <div style={{ padding: 12, borderBottom: '1px solid #333' }}>
            <strong>MVP</strong>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {mvp.nickname ?? mvp.id.slice(0, 4)} — {mvp.score}점
            </div>
          </div>
        )}
        <div style={{ padding: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
                <th>순위</th>
                <th>플레이어</th>
                <th>점수</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '6px 4px' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 4px' }}>
                    {p.nickname ?? p.id.slice(0, 6)}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                    {p.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <ShareButtons roomId={roomId} score={mvp?.score ?? 0} />
          </div>
        </div>
        <div
          style={{
            padding: 12,
            display: 'flex',
            gap: 8,
            borderTop: '1px solid #333',
          }}
        >
          <button
            type="button"
            onClick={() => socket.emit('game-start', { roomId })}
            style={{ flex: 1 }}
          >
            재게임
          </button>
          <button type="button" onClick={onClose} style={{ flex: 1 }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
