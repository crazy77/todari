import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../services/jwt';

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.auth ?? '';
  if (token) {
    const payload = verifyJwt(token);
    // @ts-expect-error attach
    req.user = payload ?? undefined;
  }
  next();
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth ?? '';
  const payload = token ? verifyJwt(token) : null;
  if (!payload) return res.status(401).json({ error: 'unauthorized' });
  // @ts-expect-error attach
  req.user = payload;
  next();
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  // @ts-expect-error
  const user = req.user;
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}
