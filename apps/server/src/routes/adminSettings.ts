import { Router } from 'express';
import { z } from 'zod';
import { getCurrentRoomId, setCurrentRoomId } from '../services/currentRoom';
import { getSettings, setSettings } from '../services/settingsStore';
import { getIO } from '../socket/io';

export const router = Router();

router.get('/', async (_req, res) => {
  const s = await getSettings();
  res.json({ settings: s });
});

router.post('/', async (req, res) => {
  const schema = z.object({
    roundTimeSeconds: z.number().int().positive().max(600).optional(),
    maxRounds: z.number().int().positive().max(100).optional(),
    baseScore: z.number().int().positive().max(10000).optional(),
    timeBonus: z.number().int().min(0).max(1000).optional(),
    rewardName: z.string().min(0).max(100).nullable().optional(),
    minParticipants: z.number().int().min(1).max(1000).optional(),
    speedReady: z.boolean().optional(),
  });
  const p = schema.safeParse(req.body ?? {});
  if (!p.success) return res.status(400).json({ error: 'invalid_settings' });
  await getSettings();
  const saved = await setSettings(p.data);
  console.log('Log ~ saved:', saved);
  const io = getIO();
  if (io) io.emit('settings-updated', { settings: saved });
  // 준비 토글 ON → 새로운 룸 생성, OFF → 현재 룸 해제
  console.log('Log ~ p.data.speedReady:', saved.speedReady);
  if (typeof p.data.speedReady === 'boolean' && io) {
    if (p.data.speedReady === true) {
      // 최소 참여 인원 필수
      const min = saved.minParticipants ?? 0;
      if (!min || min <= 0) {
        return res
          .status(400)
          .json({ error: 'min_participants_required_for_ready' });
      }
      // 새 roomId 발급
      const rid = `SB-${Date.now().toString(36)}`;
      setCurrentRoomId(rid);
      io.emit('current-room', { roomId: rid });
      io.emit('room-status', { roomId: rid, status: 'waiting' });
    } else if (p.data.speedReady === false) {
      const rid = getCurrentRoomId();
      setCurrentRoomId(null);
      // 준비 OFF: 모든 클라이언트에 룸 종료 브로드캐스트 → 클라에서 일괄 leave 처리
      if (rid) io.emit('room-closed', { roomId: rid });
    }
  }
  res.json({ ok: true, settings: p.data });
});
