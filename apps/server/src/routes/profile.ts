import { Router } from 'express';
import { z } from 'zod';

export const router = Router();

const Nickname = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[a-zA-Z0-9가-힣_-]+$/);

router.post('/nickname', (req, res) => {
  const parsed = Nickname.safeParse(req.body?.nickname);
  if (!parsed.success)
    return res.status(400).json({ error: 'invalid_nickname' });
  // TODO: persist
  res.json({ nickname: parsed.data });
});
