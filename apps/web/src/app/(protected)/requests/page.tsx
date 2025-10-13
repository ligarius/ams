import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { List, ListItem, ListItemIcon, ListItemText, Paper, Stack, Typography } from '@mui/material';

const checklist = [
  'Solicitudes pendientes por vencer',
  'Evidencia cargada por clientes',
  'Historial de comentarios y aprobaciones parciales',
];

export default function RequestsPage() {
  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
          Solicitudes
        </Typography>
        <Typography variant="h4">Gestiona la información crítica</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={600}>
          Esta vista presentará la cola de solicitudes de información conectada al backend. Desde Sprint F2 se integrará con el
          wizard y con la subida de archivos.
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Typography variant="h6" gutterBottom>
          Panel operativo próximo
        </Typography>
        <List dense disablePadding>
          {checklist.map((item) => (
            <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32, mt: 0.4 }}>
                <FiberManualRecordIcon color="secondary" sx={{ fontSize: 12 }} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={item} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3.5, borderStyle: 'dashed', borderWidth: 2 }}>
        <Typography variant="body2" color="text.secondary">
          La autenticación ya está lista, por lo que cualquier dato que aparezca aquí respetará los permisos de membresía definidos
          en el backend. Los próximos sprints conectarán este layout con componentes dinámicos y workflows aprobatorios.
        </Typography>
      </Paper>
    </Stack>
  );
}
