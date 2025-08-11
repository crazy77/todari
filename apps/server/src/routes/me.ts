import { Router } from 'express';
import { authOptional, authRequired } from '../middleware/auth';

export const router = Router();

router.get('/', authOptional, (req, res) => {
  // @ts-expect-error
  const user = req.user;
  if (!user) return res.json({ user: null });
  res.json({ user });
});

router.post('/logout', authRequired, (_req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});
