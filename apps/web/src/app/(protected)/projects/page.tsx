import { ensureSession } from '@/lib/auth/session';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NextLink from 'next/link';
import {
  Button,
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

export default async function ProjectsPage() {
  const session = await ensureSession();
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

      <Paper variant="outlined" sx={{ p: 3.5, borderStyle: 'dashed', borderWidth: 2 }}>
        <Typography variant="body2" color="text.secondary">
          ¡Hola {session?.user.email}! Próximamente aquí verás el listado de proyectos consultando el endpoint protegido del backend.
          El sprint actual se centra en dejar lista la autenticación y la estructura de layout.
        </Typography>
      </Paper>
    </Stack>
  );
}
