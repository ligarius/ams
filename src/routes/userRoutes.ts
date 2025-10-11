import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/authentication';
import { createUser, listUsers, updateUser } from '@/services/userService';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', async (_req, res) => {
  const users = await listUsers();
  return res.json(users);
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await createUser(req.body, req.user!.id);
    return res.status(201).json(user);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json({ message: 'Invalid payload' });
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const updated = await updateUser(userId, req.body, req.user!.id);
    return res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json({ message: 'Invalid payload' });
  }
});

export default router;
