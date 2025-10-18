import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';
import {
  createTemplate,
  createTemplateVersion,
  getTemplate,
  recordTemplateUsage,
  searchTemplates,
} from '@/services/templateService';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const results = await searchTemplates(req.query, req.user!);
    return res.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid filters', issues: error.flatten() });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const created = await createTemplate(req.body, req.user!);
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Template with the same name already exists') {
        return res.status(409).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const templateId = Number(req.params.id);
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ message: 'Invalid template id' });
  }
  try {
    const template = await getTemplate(templateId, req.user!);
    return res.json(template);
  } catch (error) {
    if (error instanceof Error && error.message === 'Template not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/versions', async (req: AuthenticatedRequest, res) => {
  const templateId = Number(req.params.id);
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ message: 'Invalid template id' });
  }
  try {
    const version = await createTemplateVersion(templateId, req.body, req.user!);
    return res.status(201).json(version);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Template not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/usage', async (req: AuthenticatedRequest, res) => {
  const templateId = Number(req.params.id);
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ message: 'Invalid template id' });
  }
  try {
    const usage = await recordTemplateUsage(templateId, req.body, req.user!);
    return res.status(201).json(usage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Template not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
