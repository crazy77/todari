import { Router } from 'express';
import {
  exchangeCodeForToken,
  getKakaoAuthUrl,
  getKakaoProfile,
} from '../services/kakao';
import { upsertGuestProfile } from '../services/profileStore';
import { signJwt } from '../services/jwt';
import { env } from '../utils/env';

export const router = Router();

router.get('/kakao/login', (_req, res) => {
  const url = getKakaoAuthUrl();
  if (!url) return res.status(500).json({ error: 'kakao_config_missing' });
  res.redirect(url);
});

router.get('/kakao/callback', async (req, res) => {
  const code = String(req.query.code ?? '');
  if (!code) return res.status(400).json({ error: 'code_missing' });
  const tokenRes = await exchangeCodeForToken(code);
  if (!tokenRes) return res.status(502).json({ error: 'token_exchange_failed' });
  const profile = await getKakaoProfile(tokenRes.access_token);
  if (!profile) return res.status(502).json({ error: 'profile_fetch_failed' });

  // 임시: kakaoId를 id로 사용, provider=kakao로 프로필 업서트
  const saved = await upsertGuestProfile(
    `kakao:${profile.id}`,
    profile.nickname ?? `k_${profile.id.slice(-6)}`,
  );
  const jwt = signJwt({ sub: saved.id, nickname: saved.nickname, role: 'user' });
  res.cookie('auth', jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    domain: env.cookieDomain,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  res.redirect('/');
});
