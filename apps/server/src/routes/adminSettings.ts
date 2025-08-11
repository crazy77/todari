import { Router } from 'express';
import { z } from 'zod';
import { getSettings, setSettings } from '../services/settingsStore';

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
  });
  const p = schema.safeParse(req.body ?? {});
  if (!p.success) return res.status(400).json({ error: 'invalid_settings' });
  const saved = await setSettings(p.data);
  res.json({ ok: true, settings: saved });
});
