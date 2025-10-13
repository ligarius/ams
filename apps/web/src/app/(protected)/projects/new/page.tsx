import { redirect } from 'next/navigation';
import NextLink from 'next/link';
import { ensureSession } from '@/lib/auth/session';
import { ProjectWizard } from '@/components/project-wizard';
import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';

export default async function NewProjectPage() {
  const session = await ensureSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Breadcrumbs separator="/" aria-label="breadcrumb">
          <Link component={NextLink} href="/projects" color="inherit">
            Proyectos
          </Link>
          <Typography color="text.primary">Nuevo proyecto</Typography>
        </Breadcrumbs>
      </Box>

      <Stack spacing={1.5}>
        <Typography variant="h4" component="h1">
          Crea una nueva auditoría
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={640}>
          Completa el wizard para conectar automáticamente la estructura inicial del proyecto: objetivos, stakeholders,
          gobernanza y riesgos priorizados listos para seguimiento.
        </Typography>
      </Stack>

      <ProjectWizard />
    </Stack>
  );
}
