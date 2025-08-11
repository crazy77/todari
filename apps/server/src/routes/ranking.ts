import { Router } from 'express';
import { z } from 'zod';
import {
  ensureGameRankingIndexes,
  ensureRankingIndexes,
  getGameRanking,
  getRanking,
  upsertGameScore,
  upsertScore,
} from '../services/ranking';

export const router = Router();

const Scope = z.enum(['daily', 'monthly', 'alltime']);

router.post('/submit', async (req, res) => {
  const body = req.body ?? {};
  const userId = String(body.userId ?? '');
  const nickname = body.nickname ? String(body.nickname) : undefined;
  const score = Number(body.score ?? Number.NaN);
  const gameId = body.gameId ? String(body.gameId) : undefined;
  if (!userId || Number.isNaN(score))
    return res.status(400).json({ error: 'invalid' });
  await upsertScore(userId, nickname, score);
  if (gameId) await upsertGameScore(gameId, userId, nickname, score);
  res.json({ ok: true });
});

// 게임별 랭킹을 먼저 선언하여 '/:scope' 라우트보다 우선 매칭되도록 함
router.get('/game/:gameId', async (req, res) => {
  const gameId = String(req.params.gameId ?? '');
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(50, Number(req.query.limit ?? 20));
  if (!gameId) return res.status(400).json({ error: 'invalid_game_id' });
  const items = await getGameRanking(gameId, page, limit);
  res.json({ items, page, limit });
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
void ensureGameRankingIndexes();
