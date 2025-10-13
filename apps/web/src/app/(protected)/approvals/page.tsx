import AutorenewIcon from '@mui/icons-material/Autorenew';
import { List, ListItem, ListItemIcon, ListItemText, Paper, Stack, Typography } from '@mui/material';

const roadmap = [
  'Registro de aprobaciones vinculadas a proyectos',
  'Notificación a comités y registro de comentarios',
  'Historial trazable con vínculos a riesgos y solicitudes',
];

export default function ApprovalsPage() {
  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '0.3em' }}>
          Aprobaciones
        </Typography>
        <Typography variant="h4">Control de cambios de alcance</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={600}>
          Esta sección hospedará el flujo de aprobaciones conectado al backend. El sprint actual deja el layout preparado para
          integrar las transiciones de estado y notificaciones en próximos incrementos.
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3.5 }}>
        <Typography variant="h6" gutterBottom>
          Roadmap inmediato
        </Typography>
        <List dense disablePadding>
          {roadmap.map((item) => (
            <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32, mt: 0.4 }}>
                <AutorenewIcon color="primary" sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={item} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3.5, borderStyle: 'dashed', borderWidth: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Las rutas protegidas ya verifican la sesión, por lo que los futuros tableros de aprobaciones respetarán los permisos de
          comité y consultores establecidos en el backend.
        </Typography>
      </Paper>
    </Stack>
  );
}
