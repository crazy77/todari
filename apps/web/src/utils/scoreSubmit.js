import { socket } from '@/game/socket';
export async function submitFinalScore(_roomId, score, nickname) {
    // 서버는 userId로 socket.id를 임시 사용(추후 정식 사용자 ID로 교체)
    const userId = socket.id;
    if (!userId)
        return;
    await fetch('/api/ranking/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nickname, score }),
    });
}
