import {
  AUDIT_FRAMEWORK_DEFINITIONS,
  AUDIT_FRAMEWORK_VALUES,
  type AuditFrameworkId,
} from '@backend/config/auditFrameworks';
import prisma from '@backend/lib/prisma';
import { listProjects } from '@backend/services/projectService';
import { fetchServerSession } from '@/lib/auth/server-session';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NextLink from 'next/link';
import {
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

const projectSteps = [
  'Revisión de alcance y gobernanza inicial',
  'Checklist de riesgos priorizados',
  'Asignación de miembros y responsables',
  'Lanzamiento de solicitudes de información',
];

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

export default async function ProjectsPage() {
  const session = await fetchServerSession();
  const actor = session ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  let projects: Array<{
    id: number;
    name: string;
    description: string;
    companyName: string;
    createdAt: Date;
    frameworks: AuditFrameworkId[];
  }> = [];

  if (actor) {
    const [rawProjects, companies] = await Promise.all([
      listProjects(actor),
      prisma.company.findMany(),
    ]);

    const companyById = new Map(companies.map((company) => [company.id, company.name]));
    const sortedProjects = [...rawProjects].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const frameworksByProject = new Map<number, AuditFrameworkId[]>();
    await Promise.all(
      sortedProjects.map(async (project) => {
        const checklists = await prisma.projectChecklist.findMany({ where: { projectId: project.id } });
        const frameworks = new Set<AuditFrameworkId>();
        for (const frameworkId of AUDIT_FRAMEWORK_VALUES) {
          const label = AUDIT_FRAMEWORK_DEFINITIONS[frameworkId].label;
          const prefix = `[Framework: ${label}]`;
          if (checklists.some((item) => item.name.startsWith(prefix))) {
            frameworks.add(frameworkId);
          }
        }
        frameworksByProject.set(project.id, Array.from(frameworks));
      })
    );

    projects = sortedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? 'Sin descripción registrada.',
      companyName: companyById.get(project.companyId) ?? `Compañía #${project.companyId}`,
      createdAt: project.createdAt instanceof Date ? project.createdAt : new Date(project.createdAt),
      frameworks: frameworksByProject.get(project.id) ?? [],
    }));
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
          Proyectos
        </Typography>
        <Typography variant="h4">Tus auditorías activas</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={600}>
          Centraliza la creación y seguimiento de auditorías. Desde aquí puedes iniciar el wizard para crear nuevas auditorías y
          posteriormente consultar el overview consolidado que entrega el backend.
        </Typography>
        <Button
          component={NextLink}
          href="/projects/new"
          variant="contained"
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          Crear nueva auditoría
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Typography variant="h6" gutterBottom>
          Siguientes pasos sugeridos
        </Typography>
        <List dense disablePadding>
          {projectSteps.map((step) => (
            <ListItem key={step} disableGutters sx={{ alignItems: 'flex-start', py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36, mt: 0.3 }}>
                <CheckCircleOutlineIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={step} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="h6">Auditorías registradas</Typography>
            {projects.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'} activos
              </Typography>
            )}
          </Stack>

          {projects.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {session?.user
                ? 'Aún no has registrado auditorías. Usa el botón “Crear nueva auditoría” para sembrar automáticamente checklists, KPIs y gobernanza de inicio.'
                : 'Inicia sesión nuevamente para consultar tus auditorías.'}
            </Typography>
          ) : (
            <Stack spacing={3} divider={<Divider flexItem />}>
              {projects.map((project) => (
                <Stack key={project.id} spacing={1.5}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'baseline' }}
                    justifyContent="space-between"
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      {project.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Registrado el {dateFormatter.format(project.createdAt)}
                    </Typography>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {project.description}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Compañía:</strong> {project.companyName}
                  </Typography>

                  {project.frameworks.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {project.frameworks.map((frameworkId) => (
                        <Chip
                          key={frameworkId}
                          label={AUDIT_FRAMEWORK_DEFINITIONS[frameworkId].label}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
