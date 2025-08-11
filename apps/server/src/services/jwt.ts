import crypto from 'node:crypto';
import { env } from '../utils/env';

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function base64urlJson(obj: unknown): string {
  return base64url(Buffer.from(JSON.stringify(obj)));
}

export type JwtPayload = { sub: string; nickname?: string; iat: number; exp: number; role?: 'admin' | 'user' };

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, ttlSec = 60 * 60 * 24 * 7): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSec;
  const full: JwtPayload = { ...payload, iat, exp } as JwtPayload;
  const unsigned = `${base64urlJson(header)}.${base64urlJson(full)}`;
  const sig = crypto.createHmac('sha256', env.jwtSecret ?? '').update(unsigned).digest();
  return `${unsigned}.${base64url(sig)}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const unsigned = `${h}.${p}`;
    const expected = base64url(crypto.createHmac('sha256', env.jwtSecret ?? '').update(unsigned).digest());
    if (expected !== s) return null;
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
