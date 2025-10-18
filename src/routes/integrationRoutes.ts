import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';
import {
  exportBiDatasets,
  listEnterpriseConnectors,
  triggerConnectorSync,
} from '@/services/integrationService';

const router = Router();

router.use(authenticate);

router.get('/connectors', async (req: AuthenticatedRequest, res) => {
  try {
    const connectors = await listEnterpriseConnectors(req.user!);
    return res.json(connectors);
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/connectors/:identifier/sync', async (req: AuthenticatedRequest, res) => {
  const identifierParam = req.params.identifier;
  const identifier = Number.isNaN(Number(identifierParam)) ? identifierParam : Number(identifierParam);
  try {
    const result = await triggerConnectorSync(identifier, req.body, req.user!);
    return res.status(202).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Connector not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/datasets', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await exportBiDatasets(req.query, req.user!);
    if (result.format === 'csv') {
      res.setHeader('content-type', 'text/csv');
      return res.send(result.payload);
    }
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid filters', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Connector not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'No datasets available for the requested connector') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
