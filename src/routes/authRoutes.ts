import { Router } from 'express';
import { z } from 'zod';
import { AuthError, login, logout, refresh } from '@/services/authService';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body.email, body.password);
    return res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const body = refreshSchema.parse(req.body);
    const result = await refresh(body.refreshToken);
    return res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/logout', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    await logout(req.user!.id);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
