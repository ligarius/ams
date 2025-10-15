import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/authentication';
import { createCompany, listCompanies, updateCompany } from '@/services/companyService';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', async (_req, res) => {
  const companies = await listCompanies();
  return res.json(companies);
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const company = await createCompany(req.body, req.user!.id);
    return res.status(201).json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = Number(req.params.id);
    if (Number.isNaN(companyId)) {
      return res.status(400).json({ message: 'Invalid company id' });
    }
    const company = await updateCompany(companyId, req.body, req.user!.id);
    return res.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
