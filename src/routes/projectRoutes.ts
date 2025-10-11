import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';
import { createProject, getProjectOverview, listProjects, updateProject } from '@/services/projectService';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const projects = await listProjects(req.user!);
  return res.json(projects);
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const project = await createProject(req.body, req.user!);
    return res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Project not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/:id/overview', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    const overview = await getProjectOverview(projectId, req.user!);
    return res.json(overview);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Project not found') {
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

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    const project = await updateProject(projectId, req.body, req.user!);
    return res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Project not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
