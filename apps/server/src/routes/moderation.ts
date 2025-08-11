import { Router } from 'express';
import { z } from 'zod';
import { blockUser, unblockUser, listBlocked } from '../services/moderation';

export const router = Router();

router.get('/blocked', (_req, res) => {
  res.json({ users: listBlocked() });
});

router.post('/block', (req, res) => {
  const schema = z.object({ userId: z.string().min(1) });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid_user' });
  blockUser(p.data.userId);
  res.json({ ok: true });
});

router.post('/unblock', (req, res) => {
  const schema = z.object({ userId: z.string().min(1) });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid_user' });
  unblockUser(p.data.userId);
  res.json({ ok: true });
});
