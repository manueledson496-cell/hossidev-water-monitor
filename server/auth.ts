import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { loadDb, UserRecord } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'hossidev-water-monitor-secure-key-2026';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  permittedTankIds: number[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: UserRecord): string {
  const payload: AuthenticatedUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    permittedTankIds: user.permittedTankIds || [],
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    // Refresh user from database to ensure up-to-date role/permissions
    const db = loadDb();
    const existingUser = db.users.find((u) => u.id === decoded.id);
    if (!existingUser) {
      res.status(401).json({ error: 'Usuário não encontrado ou revogado.' });
      return;
    }

    req.user = {
      id: existingUser.id,
      username: existingUser.username,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      permittedTankIds: existingUser.permittedTankIds,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito. Permissão de Administrador necessária.' });
    return;
  }
  next();
}
