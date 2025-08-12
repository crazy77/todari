import { useEffect } from 'react';
import { socket } from '@/game/socket';

type TopEntry = {
  id: string;
  score: number;
  round: number;
  nickname?: string;
  avatar?: string;
  tableNumber?: string | null;
};

export function useAdminRealtime(params: {
  currentRoom: string;
  setCurrentRoom: (id: string) => void;
  setCurrentCount: (n: number) => void;
  setProgressTop: (list: TopEntry[]) => void;
  setLastResults: (list: TopEntry[]) => void;
  setLastRewardName: (name: string | null) => void;
  setStatus: (s: 'waiting' | 'playing' | 'ended') => void;
}): void {
  const {
    currentRoom,
    setCurrentRoom,
    setCurrentCount,
    setProgressTop,
    setLastResults,
    setLastRewardName,
    setStatus,
  } = params;

  useEffect(() => {
    function onCurrent({ roomId }: { roomId: string }) {
      setCurrentRoom(roomId);
      try {
        socket.emit('watch-room', { roomId });
      } catch {}
    }

    function onTop({ roomId, top }: { roomId: string; top: TopEntry[] }) {
      if (currentRoom && roomId !== currentRoom) return;
      setProgressTop(top);
    }

    function onMembers({
      roomId,
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
      if (currentRoom && roomId !== currentRoom) return;
      setCurrentCount(members.length);
    }

    function onResults({
      roomId,
      results,
      rewardName,
    }: {
      roomId: string;
      results: TopEntry[];
      rewardName?: string | null;
    }) {
      if (currentRoom && roomId !== currentRoom) return;
      setLastResults(results);
      setLastRewardName(rewardName ?? null);
    }

    function onStatus({
      roomId,
      status,
    }: {
      roomId: string;
      status: 'waiting' | 'playing' | 'ended';
    }) {
      if (currentRoom && roomId !== currentRoom) return;
      setStatus(status);
    }

    socket.on('current-room', onCurrent);
    socket.on('progress-top', onTop);
    socket.on('room-members', onMembers);
    socket.on('game-results', onResults);
    socket.on('room-status', onStatus);

    return () => {
      socket.off('current-room', onCurrent);
      socket.off('progress-top', onTop);
      socket.off('room-members', onMembers);
      socket.off('game-results', onResults);
      socket.off('room-status', onStatus);
    };
  }, [
    currentRoom,
    setCurrentRoom,
    setCurrentCount,
    setProgressTop,
    setLastResults,
    setLastRewardName,
    setStatus,
  ]);
}

