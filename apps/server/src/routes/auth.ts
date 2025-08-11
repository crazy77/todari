import { Router } from 'express';
import { signJwt } from '../services/jwt';
import {
  exchangeCodeForToken,
  getKakaoAuthUrl,
  getKakaoProfile,
} from '../services/kakao';
import { upsertGuestProfile } from '../services/profileStore';
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
  if (!tokenRes)
    return res.status(502).json({ error: 'token_exchange_failed' });
  try {
    const profile = await getKakaoProfile(tokenRes.access_token);
    if (!profile)
      return res.status(502).json({ error: 'profile_fetch_failed' });

    const saved = await upsertGuestProfile({
      id: `kakao:${profile.id}`,
      nickname: profile.nickname ?? `k_${profile.id.slice(-6)}`,
      profileImageUrl: profile.profile_image_url,
    });
    const jwt = signJwt({
      sub: saved.id,
      nickname: saved.nickname,
      role: 'user',
    });
    res.cookie('auth', jwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.cookieSecure,
      domain: env.cookieDomain,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.redirect('http://localhost:5176/');
  } catch (err) {
    console.error('callback error', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// 로그아웃: 쿠키 삭제
router.post('/logout', (_req, res) => {
  try {
    res.clearCookie('auth', {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.cookieSecure,
      domain: env.cookieDomain,
    });
  } catch {}
  res.json({ ok: true });
});

// GET 지원 (링크로 접근하는 경우)
router.get('/logout', (_req, res) => {
  try {
    res.clearCookie('auth', {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.cookieSecure,
      domain: env.cookieDomain,
    });
  } catch {}
  res.redirect('/');
});
