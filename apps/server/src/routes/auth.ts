import { Router } from 'express';

export const router = Router();

// Kakao OAuth placeholder endpoints for future integration
router.get('/kakao/login', (_req, res) => {
  res.status(501).json({ error: 'not_implemented' });
});

router.get('/kakao/callback', (_req, res) => {
  res.status(501).json({ error: 'not_implemented' });
});
