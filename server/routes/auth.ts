import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadDb, saveDb, UserRecord } from '../db';
import { generateToken, authMiddleware, AuthRequest } from '../auth';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
  }

  const db = loadDb();
  const cleanId = String(identifier).trim().toLowerCase();
  
  const user = db.users.find(
    (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
  );

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas. Usuário não encontrado.' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  user.lastLogin = new Date().toISOString();
  saveDb();

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      permittedTankIds: user.permittedTankIds,
    },
  });
});

// POST /api/auth/register (Bloqueado para acesso público - apenas Administrador pode criar usuários)
router.post('/register', (_req, res) => {
  return res.status(403).json({
    error: 'O cadastro público de contas está desativado. Novos usuários devem ser cadastrados exclusivamente pelo Administrador.',
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.json({ message: 'Sessão encerrada com sucesso.' });
});

export default router;
