import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import prisma from '@backend/lib/prisma';
import { listProjects } from '@backend/services/projectService';
import { listDataRequests } from '@backend/services/dataRequestService';
import { fetchServerSession } from '@/lib/auth/server-session';
import { RequestBoard, type RequestBoardProject } from '@/components/request-board';
import { Alert, List, ListItem, ListItemIcon, ListItemText, Paper, Stack, Typography } from '@mui/material';

const highlights = [
  'Filtra solicitudes según su estado y prioriza aquellas próximas a vencer.',
  'Lanza nuevas solicitudes conectadas al backend y asigna fechas objetivo.',
  'Revisa adjuntos y comentarios cargados por el cliente desde una sola vista.',
];

const serializeProjects = (projects: Awaited<ReturnType<typeof listProjects>>) =>
  projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? null,
  }));

export default async function RequestsPage() {
  const session = await fetchServerSession();
  const actor = session ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  let projects: RequestBoardProject[] = [];

  if (actor) {
    const accessibleProjects = await listProjects(actor);
    const baseProjects = serializeProjects(accessibleProjects);

    const requestsByProject = await Promise.all(
      baseProjects.map(async (project) => {
        const requests = await listDataRequests(project.id, actor);
        return {
          ...project,
          requests: requests.map((request) => ({
            id: request.id,
            title: request.title,
            description: request.description ?? null,
            status: request.status,
            dueDate: request.dueDate ? request.dueDate.toISOString().slice(0, 10) : null,
            assignedToId: request.assignedToId,
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
            attachments: request.attachments.map((attachment) => ({
              id: attachment.id,
              fileName: attachment.fileName,
              content: attachment.content,
              uploadedAt: attachment.uploadedAt.toISOString(),
              uploadedById: attachment.uploadedById,
            })),
          })),
        } satisfies RequestBoardProject;
      })
    );

    projects = requestsByProject.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
          Solicitudes
        </Typography>
        <Typography variant="h4">Gestiona la información crítica</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={640}>
          Monitorea el avance de las solicitudes creadas desde el backend, revisa los adjuntos entregados por tus clientes y
          mantén visibilidad sobre qué entregables siguen pendientes para cada auditoría.
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Typography variant="h6" gutterBottom>
          ¿Qué puedes hacer en este tablero?
        </Typography>
        <List dense disablePadding>
          {highlights.map((highlight) => (
            <ListItem key={highlight} disableGutters sx={{ alignItems: 'flex-start', py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32, mt: 0.4 }}>
                <FiberManualRecordIcon color="secondary" sx={{ fontSize: 12 }} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={highlight} />
            </ListItem>
          ))}
        </List>
      </Paper>

      {!actor ? (
        <Alert severity="warning">
          Inicia sesión nuevamente para consultar las solicitudes asignadas a tus proyectos.
        </Alert>
      ) : (
        <RequestBoard projects={projects} canMutate={actor.role !== 'CLIENT'} viewerRole={actor.role} />
      )}
    </Stack>
  );
}
