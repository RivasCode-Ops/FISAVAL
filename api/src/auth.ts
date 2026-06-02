import type { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from './config.js';

export type AuthPayload = { sub: string; email: string; role: string; nome: string };

export function signToken(user: { id: string; email: string; role: string; nome: string }) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, nome: user.nome },
    config.jwtSecret,
    { expiresIn: config.jwtExpires as SignOptions['expiresIn'] },
  );
}

export function getAuth(req: Request): AuthPayload | undefined {
  return (req as Request & { auth?: AuthPayload }).auth;
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth || !roles.includes(auth.role)) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }
    next();
  };
}

export function requireSuperAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Token ausente' });
      return;
    }
    const { isSuperAdmin } = await import('./superAdmin.js');
    if (!isSuperAdmin(auth.email)) {
      res.status(403).json({ error: 'Acesso super-admin necessário' });
      return;
    }
    next();
  };
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token ausente' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as AuthPayload;
    (req as Request & { auth: AuthPayload }).auth = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}
