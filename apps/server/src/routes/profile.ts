import { Router } from 'express';
import { z } from 'zod';

export const router = Router();

const Nickname = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[a-zA-Z0-9가-힣_-]+$/);

import { getProfileByNickname, upsertGuestProfile } from '../services/profileStore';

router.post('/nickname', async (req, res) => {
  const parsed = Nickname.safeParse(req.body?.nickname);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_nickname' });

  const exists = await getProfileByNickname(parsed.data);
  if (exists) return res.status(409).json({ error: 'nickname_taken' });

  const guestId = req.ip ?? `guest-${Date.now()}`; // 간단한 게스트 식별자 대체
  const tableNumber = req.body?.tableNumber as string | undefined;
  const profile = await upsertGuestProfile({
    id: guestId,
    nickname: parsed.data,
    tableNumber,
  });
  res.json({ ok: true, profile });
});
