import { Router } from 'express';
import { z } from 'zod';
import { getRanking, upsertScore, ensureRankingIndexes } from '../services/ranking';

export const router = Router();

const Scope = z.enum(['daily', 'monthly', 'alltime']);

router.post('/submit', async (req, res) => {
  const body = req.body ?? {};
  const userId = String(body.userId ?? '');
  const nickname = body.nickname ? String(body.nickname) : undefined;
  const score = Number(body.score ?? NaN);
  if (!userId || Number.isNaN(score)) return res.status(400).json({ error: 'invalid' });
  await upsertScore(userId, nickname, score);
  res.json({ ok: true });
});

router.get('/:scope', async (req, res) => {
  const parse = Scope.safeParse(req.params.scope);
  if (!parse.success) return res.status(400).json({ error: 'invalid_scope' });
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(50, Number(req.query.limit ?? 20));
  const items = await getRanking(parse.data, page, limit);
  res.json({ items, page, limit });
});

void ensureRankingIndexes();
