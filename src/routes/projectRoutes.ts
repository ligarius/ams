import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';
import { createProject, listProjects, updateProject } from '@/services/projectService';

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
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json({ message: 'Invalid payload' });
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
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json({ message: 'Invalid payload' });
  }
});

export default router;
