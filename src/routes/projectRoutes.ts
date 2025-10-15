import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '@/middleware/authentication';
import { DataRequestStatus } from '@/lib/prisma';
import {
  createProject,
  getProjectOverview,
  getProjectWizardConfig,
  listProjects,
  updateProject,
} from '@/services/projectService';
import {
  addDataRequestAttachment,
  createDataRequest,
  listDataRequestAttachments,
  listDataRequests,
  updateDataRequest,
} from '@/services/dataRequestService';
import { createRisk, createFinding, listFindings, listProjectRisks, updateFinding, updateRisk } from '@/services/riskService';
import { createApproval, listApprovals, transitionApproval } from '@/services/approvalService';
import {
  createInitiative,
  deleteInitiative,
  getInitiative,
  listInitiatives,
  updateInitiative,
} from '@/services/initiativeService';

const router = Router();

router.use(authenticate);

const parseNumericId = (value: string) => {
  const id = Number(value);
  if (Number.isNaN(id)) {
    throw new Error('Invalid identifier');
  }
  return id;
};

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

router.get('/wizard/config', (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (req.user.role === 'CLIENT') {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  const config = getProjectWizardConfig();
  return res.json(config);
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
    const projectId = parseNumericId(req.params.id);
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

router.get('/:id/data-requests', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const statusParam = req.query.status;
    let status: DataRequestStatus | undefined;
    if (statusParam !== undefined) {
      if (typeof statusParam !== 'string') {
        return res.status(400).json({ message: 'Invalid status filter' });
      }
      if (!['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'].includes(statusParam)) {
        return res.status(400).json({ message: 'Invalid status filter' });
      }
      status = statusParam as DataRequestStatus;
    }
    const requests = await listDataRequests(projectId, req.user!, status);
    return res.json(requests);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/data-requests', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const created = await createDataRequest(projectId, req.body, req.user!);
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/:id/data-requests/:dataRequestId', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const dataRequestId = parseNumericId(req.params.dataRequestId);
    const updated = await updateDataRequest(projectId, dataRequestId, req.body, req.user!);
    return res.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Data request not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/data-requests/:dataRequestId/files', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const dataRequestId = parseNumericId(req.params.dataRequestId);
    const attachment = await addDataRequestAttachment(projectId, dataRequestId, req.body, req.user!);
    return res.status(201).json(attachment);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Data request not found') {
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

router.get('/:id/initiatives', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const initiatives = await listInitiatives(projectId, req.user!);
    return res.json(initiatives);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error && error.message === 'Project not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/:id/initiatives/:initiativeId', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const initiativeId = parseNumericId(req.params.initiativeId);
    const initiative = await getInitiative(projectId, initiativeId, req.user!);
    return res.json(initiative);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error && error.message === 'Initiative not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/initiatives', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const initiative = await createInitiative(projectId, req.body, req.user!);
    return res.status(201).json(initiative);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Assigned user is not part of the project') {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'Project not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/:id/initiatives/:initiativeId', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const initiativeId = parseNumericId(req.params.initiativeId);
    const initiative = await updateInitiative(projectId, initiativeId, req.body, req.user!);
    return res.json(initiative);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Assigned user is not part of the project') {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'Initiative not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.delete('/:id/initiatives/:initiativeId', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const initiativeId = parseNumericId(req.params.initiativeId);
    await deleteInitiative(projectId, initiativeId, req.user!);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Initiative not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/:id/data-requests/:dataRequestId/files', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const dataRequestId = parseNumericId(req.params.dataRequestId);
    const attachments = await listDataRequestAttachments(projectId, dataRequestId, req.user!);
    return res.json(attachments);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof Error) {
      if (error.message === 'Data request not found') {
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

router.get('/:id/risks', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const risks = await listProjectRisks(projectId, req.user!);
    return res.json(risks);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/risks', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const risk = await createRisk(projectId, req.body, req.user!);
    return res.status(201).json(risk);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/:id/risks/:riskId', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const riskId = parseNumericId(req.params.riskId);
    const risk = await updateRisk(projectId, riskId, req.body, req.user!);
    return res.json(risk);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Risk not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/:id/findings', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const findings = await listFindings(projectId, req.user!);
    return res.json(findings);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/findings', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const finding = await createFinding(projectId, req.body, req.user!);
    return res.status(201).json(finding);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Risk not found' || error.message === 'Data request not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/:id/findings/:findingId', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const findingId = parseNumericId(req.params.findingId);
    const finding = await updateFinding(projectId, findingId, req.body, req.user!);
    return res.json(finding);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Finding not found' || error.message === 'Data request not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.get('/:id/approvals', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const approvals = await listApprovals(projectId, req.user!);
    return res.json(approvals);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.post('/:id/approvals', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const approval = await createApproval(projectId, req.body, req.user!);
    return res.status(201).json(approval);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid project id' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

router.patch('/:id/approvals/:approvalId', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseNumericId(req.params.id);
    const approvalId = parseNumericId(req.params.approvalId);
    const approval = await transitionApproval(projectId, approvalId, req.body, req.user!);
    return res.json(approval);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid identifier') {
      return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload', issues: error.flatten() });
    }
    if (error instanceof Error) {
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === 'Approval not found') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;
