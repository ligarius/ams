import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';
import {
  createAssignment,
  createConsultant,
  listAssignments,
  listConsultants,
  updateAssignment,
  updateConsultant,
} from '@/services/staffingService';

const router = Router();

router.use(authenticate);

const parseNumericId = (value: string, label: string) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}`);
  }
  return parsed;
};

router.get('/consultants', async (req: AuthenticatedRequest, res) => {
  try {
    const consultants = await listConsultants(req.user!);
    return res.json(consultants);
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/consultants', async (req: AuthenticatedRequest, res) => {
  try {
    const consultant = await createConsultant(req.body, req.user!);
    return res.status(201).json(consultant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Consultant email already exists') {
        return res.status(409).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/consultants/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const consultantId = parseNumericId(req.params.id, 'consultant id');
    const consultant = await updateConsultant(consultantId, req.body, req.user!);
    return res.json(consultant);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid consultant id')) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Consultant not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Consultant email already exists') {
        return res.status(409).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/assignments', async (req: AuthenticatedRequest, res) => {
  try {
    const filters: { projectId?: number; consultantId?: number; activeOnly?: boolean } = {};
    if (req.query.projectId !== undefined) {
      if (typeof req.query.projectId !== 'string') {
        return res.status(400).json({ message: 'Invalid project filter' });
      }
      filters.projectId = parseNumericId(req.query.projectId, 'project id');
    }
    if (req.query.consultantId !== undefined) {
      if (typeof req.query.consultantId !== 'string') {
        return res.status(400).json({ message: 'Invalid consultant filter' });
      }
      filters.consultantId = parseNumericId(req.query.consultantId, 'consultant id');
    }
    if (req.query.activeOnly !== undefined) {
      if (typeof req.query.activeOnly !== 'string' || !['true', 'false'].includes(req.query.activeOnly)) {
        return res.status(400).json({ message: 'Invalid activeOnly filter' });
      }
      filters.activeOnly = req.query.activeOnly === 'true';
    }
    const assignments = await listAssignments(filters, req.user!);
    return res.json(assignments);
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/assignments', async (req: AuthenticatedRequest, res) => {
  try {
    const assignment = await createAssignment(req.body, req.user!);
    return res.status(201).json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Consultant not found' || error.message === 'Project not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Assignment end date cannot be before start date') {
        return res.status(400).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/assignments/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const assignmentId = parseNumericId(req.params.id, 'assignment id');
    const assignment = await updateAssignment(assignmentId, req.body, req.user!);
    return res.json(assignment);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid assignment id')) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Staffing assignment not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Assignment end date cannot be before start date') {
        return res.status(400).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
