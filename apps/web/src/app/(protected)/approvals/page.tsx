import { cookies, headers } from 'next/headers';
import prisma from '@backend/lib/prisma';
import { listProjects } from '@backend/services/projectService';
import type { ApprovalStatus, SignatureStatus } from '@backend/lib/prisma';
import { fetchServerSession } from '@/lib/auth/server-session';
import { ApprovalDashboard, type ApprovalRecord } from '@/components/approval-dashboard';
import { ApprovalForm } from '@/components/approval-form';
import { Alert, Grid, Paper, Stack, Typography } from '@mui/material';

interface SerializedApproval {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt: string | null;
  signatureUrl: string | null;
  signatureStatus: SignatureStatus;
  signatureSentAt: string | null;
  signatureCompletedAt: string | null;
  signatureDeclinedAt: string | null;
}

interface ProjectOption {
  id: number;
  name: string;
}

const getBaseUrl = () => {
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (host) {
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    return `${protocol}://${host}`;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!fallback) {
    throw new Error('Unable to determine host for approvals fetch');
  }
  return fallback.replace(/\/$/, '');
};

const buildCookieHeader = () => {
  const cookieStore = cookies();
  const entries = cookieStore.getAll();
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(({ name, value }) => `${name}=${value}`).join('; ');
};

const fetchProjectApprovals = async (
  projectId: number,
  baseUrl: string,
  cookieHeader?: string
): Promise<SerializedApproval[]> => {
  const response = await fetch(`${baseUrl}/api/projects/${projectId}/approvals`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch approvals for project ${projectId}: ${response.status}`);
  }

  return (await response.json()) as SerializedApproval[];
};

const mapApproval = (approval: SerializedApproval, project: ProjectOption): ApprovalRecord => {
  return {
    id: approval.id,
    projectId: project.id,
    projectName: project.name,
    title: approval.title,
    description: approval.description,
    status: approval.status,
    createdAt: approval.createdAt,
    decidedAt: approval.decidedAt,
    signatureUrl: approval.signatureUrl,
    signatureStatus: approval.signatureStatus,
    signatureSentAt: approval.signatureSentAt,
    signatureCompletedAt: approval.signatureCompletedAt,
    signatureDeclinedAt: approval.signatureDeclinedAt,
  };
};

const sortRecent = (approvals: ApprovalRecord[]) => {
  return approvals
    .slice()
    .sort((a, b) => {
      const left = a.decidedAt ?? a.createdAt;
      const right = b.decidedAt ?? b.createdAt;
      return new Date(right).getTime() - new Date(left).getTime();
    });
};

export default async function ApprovalsPage() {
  const session = await fetchServerSession();
  const actor = session ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  if (!actor) {
    return (
      <Stack spacing={6}>
        <Stack spacing={1.5}>
          <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
            Aprobaciones
          </Typography>
          <Typography variant="h4">Controla los compromisos clave</Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={640}>
            Inicia sesión nuevamente para consultar las aprobaciones asociadas a tus proyectos.
          </Typography>
        </Stack>
        <Alert severity="warning">Tu sesión expiró. Vuelve a iniciar sesión para recuperar el tablero.</Alert>
      </Stack>
    );
  }

  const projects = await listProjects(actor);
  const projectOptions: ProjectOption[] = projects
    .map((project) => ({ id: project.id, name: project.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const baseUrl = getBaseUrl();
  const cookieHeader = buildCookieHeader();

  const approvalsByProject = await Promise.all(
    projectOptions.map(async (project) => {
      const approvals = await fetchProjectApprovals(project.id, baseUrl, cookieHeader);
      return approvals.map((approval) => mapApproval(approval, project));
    })
  );

  const flattened = approvalsByProject.flat();
  const pending = flattened.filter((approval) => approval.status === 'PENDING');
  const recent = sortRecent(flattened.filter((approval) => approval.status !== 'PENDING')).slice(0, 12);
  const pendingCount = pending.length;

  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
          Aprobaciones
        </Typography>
        <Typography variant="h4">Control de cambios y firmas clave</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={640}>
          Visualiza el estado de aprobación de los entregables críticos por proyecto, da seguimiento a las firmas electrónicas
          y registra nuevas solicitudes para tu comité de gobernanza.
        </Typography>
      </Stack>

      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12} md={7} display="flex">
          <ApprovalDashboard
            pending={pending}
            recent={recent}
            canMutate={actor.role !== 'CLIENT'}
            pendingCount={pendingCount}
          />
        </Grid>
        <Grid item xs={12} md={5} display="flex">
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, width: '100%' }}>
            <Stack spacing={3} height="100%">
              <Stack spacing={1}>
                <Typography variant="h6">Registrar aprobación</Typography>
                <Typography variant="body2" color="text.secondary">
                  Define la información de la solicitud y envíala para iniciar el flujo de firma electrónica.
                </Typography>
              </Stack>
              <ApprovalForm projects={projectOptions} canCreate={actor.role !== 'CLIENT'} />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
