import { Router } from 'express';
import { getProfile } from '../services/profileStore';

export const router = Router();

router.get('/:id', async (req, res) => {
  const profile = await getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: 'not_found' });
  res.json({ profile });
});
