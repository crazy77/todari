import { Router } from 'express';
import { getLogs } from '../services/logStore';

export const router = Router();

router.get('/', (req, res) => {
  const limit = Math.min(500, Number(req.query.limit ?? 200));
  const level = (req.query.level as 'info' | 'warn' | 'error' | undefined) ?? undefined;
  const logs = getLogs(limit, level);
  res.json({ logs });
});
