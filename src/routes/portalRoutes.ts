import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';
import { getClientPortalSnapshot } from '@/services/portalService';

const router = Router();

router.use(authenticate);

router.get('/overview', async (req: AuthenticatedRequest, res) => {
  try {
    const snapshot = await getClientPortalSnapshot(req.user!);
    return res.json(snapshot);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
