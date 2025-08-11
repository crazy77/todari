import { env } from '../utils/env';

export function getKakaoAuthUrl(): string {
  const redirectUri = encodeURIComponent(
    env.kakaoRedirectUri ?? 'http://localhost:4000/api/auth/kakao/callback',
  );
  const clientId = env.kakaoClientId ?? '';
  const base = 'https://kauth.kakao.com/oauth/authorize';
  const qs = `?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
  return base + qs;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<{ access_token: string } | null> {
  try {
    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('client_id', env.kakaoClientId ?? '');
    form.set(
      'redirect_uri',
      env.kakaoRedirectUri ?? 'http://localhost:4000/api/auth/kakao/callback',
    );
    form.set('code', code);
    const res = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) return null;
    return (await res.json()) as { access_token: string };
  } catch {
    return null;
  }
}

export async function getKakaoProfile(accessToken: string): Promise<{
  id: string;
  nickname?: string;
  profile_image_url?: string;
} | null> {
  try {
    const res = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id: string;
      kakao_account: {
        profile: { nickname: string; profile_image_url: string };
      };
    };
    const id = String(data.id);
    const nickname = data.kakao_account?.profile?.nickname;
    return {
      id,
      nickname,
      profile_image_url: data.kakao_account?.profile?.profile_image_url,
    };
  } catch {
    return null;
  }
}
